import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { GameState, GameMode } from './GameState.js';
import { EventBus } from '../utils/EventBus.js';

import { Island } from '../world/Island.js';
import { Player } from '../player/Player.js';
import { PlayerController } from '../player/PlayerController.js';
import { KeyboardInput } from '../input/KeyboardInput.js';
import { TouchInput } from '../input/TouchInput.js';

import { InteractionSystem } from '../interaction/InteractionSystem.js';
import { HazardManager } from '../hazards/HazardManager.js';
import { WildlifeManager } from '../wildlife/WildlifeManager.js';

import { CoinManager } from '../collectibles/Coin.js';
import { createMapPieceMesh } from '../collectibles/MapPiece.js';

import { SymbolPuzzle } from '../puzzles/SymbolPuzzle.js';
import { PressurePlatePuzzle } from '../puzzles/PressurePlatePuzzle.js';
import { TemplePuzzle } from '../puzzles/TemplePuzzle.js';

import { StorageSystem } from '../systems/StorageSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';

import { UIManager } from '../ui/UIManager.js';

const QUALITY_PRESETS = {
  low: { pixelRatioCap: 1.0, shadows: false, shadowMapSize: 512, fogFar: 140 },
  medium: { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, fogFar: 190 },
  high: { pixelRatioCap: 2.0, shadows: true, shadowMapSize: 2048, fogFar: 260 }
};

/**
 * Game.js
 * ----------------------------------------------------------------------
 * Top-level orchestrator. Owns the Three.js scene/camera/renderer,
 * constructs every world/gameplay/UI system, and drives the per-frame
 * update loop. This is intentionally the "wiring" layer — individual
 * systems contain their own logic; Game.js's job is composition and
 * the small amount of glue logic that doesn't obviously belong to any
 * single system (area-entry quest triggers, camera follow, pause flow).
 */
export class Game {
  constructor() {
    this.eventBus = new EventBus();
    this.storageSystem = new StorageSystem();
    this.gameState = new GameState(this.eventBus);
    this.gameState.settings = this.storageSystem.loadSettings(this.gameState.settings);

    this._initRenderer();
    this._initSceneAndCamera();
    this._initLighting();

    this.audio = new AudioSystem(this.gameState);
    this.particles = new ParticleSystem(this.scene);
    this.questSystem = new QuestSystem(this.gameState, this.eventBus);
    this.scoreSystem = new ScoreSystem(this.gameState, this.storageSystem);
    this.interactionSystem = new InteractionSystem(this.eventBus);

    this.ui = new UIManager(this.gameState, this.eventBus, this.storageSystem, this.audio, {
      onStart: () => this.startNewGame(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.startNewGame(),
      onMainMenu: () => this.returnToMainMenu(),
      onPauseButton: () => this.togglePause(),
      onQualityChange: (q) => this.applyQuality(q)
    });

    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput();

    this._cameraRig = {
      yaw: Math.PI,
      distance: 6.5,
      height: 2.6,
      currentPos: new THREE.Vector3(),
      currentLookAt: new THREE.Vector3()
    };

    this._areaFlags = { beachExplored: false, ruinsDiscovered: false };
    this._damageInvulnTimer = 0;

    this.loop = new GameLoop((dt) => this._update(dt));

    window.addEventListener('resize', () => this._onResize());
    this.eventBus.on('game:victory', () => this._handleVictory());
    this.eventBus.on('state:player-died', () => this._handleGameOver());

    this.applyQuality(this.gameState.settings.quality);
    this._boot();
  }

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------

  _initRenderer() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initSceneAndCamera() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8fd6e8');
    this.scene.fog = new THREE.Fog('#bfe9f2', 40, 190);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    this.camera.position.set(0, 6, 96);
  }

  _initLighting() {
    this.sunLight = new THREE.DirectionalLight('#fff3d6', 2.2);
    this.sunLight.position.set(60, 90, 40);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -70;
    this.sunLight.shadow.camera.right = 70;
    this.sunLight.shadow.camera.top = 70;
    this.sunLight.shadow.camera.bottom = -70;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 220;
    this.sunLight.shadow.bias = -0.0015;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight('#cdeeff', '#2f5c3a', 0.7);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.25);
    this.scene.add(this.ambientLight);
  }

  applyQuality(qualityKey) {
    const preset = QUALITY_PRESETS[qualityKey] || QUALITY_PRESETS.medium;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, preset.pixelRatioCap);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = preset.shadows;
    if (this.sunLight) {
      this.sunLight.castShadow = preset.shadows;
      this.sunLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    }
    if (this.scene?.fog) this.scene.fog.far = preset.fogFar;
  }

  /** Builds the world once; called on first load (before the main menu shows). */
  async _boot() {
    this.ui.showLoading();
    await this._yieldFrame();
    this.ui.updateLoadingProgress(15, 'Raising the island from the sea…');

    this.island = new Island(this.scene);
    await this._yieldFrame();
    this.ui.updateLoadingProgress(45, 'Planting palm trees and jungle…');

    this.player = new Player();
    this.scene.add(this.player.root);
    this.playerController = new PlayerController(this.player, this.island, this.keyboard, this.touch);
    await this._yieldFrame();
    this.ui.updateLoadingProgress(60, 'Hiding coins and treasure clues…');

    this._setupCollectibles();
    this._setupPuzzles();
    await this._yieldFrame();
    this.ui.updateLoadingProgress(80, 'Releasing wildlife…');

    this.hazardManager = new HazardManager(this.scene, this.island, this.gameState, this.audio, this.eventBus);
    this.wildlife = new WildlifeManager(this.scene);

    this.particles.addFireflyField(new THREE.Vector3(10, 3, 20), [50, 6, 50], 50);
    this.particles.addMist(this.island.waterfallBase.clone().add(new THREE.Vector3(0, 1, 0)), [3, 3, 3], 40);
    this.particles.addTreasureSparkle(
      this.island.temple.group.position.clone().add(new THREE.Vector3(0, this.island.temple.topY + 1.5, 0)),
      [3, 2, 3],
      50
    );

    await this._yieldFrame();
    this.ui.updateLoadingProgress(100, 'Ready!');
    await this._delay(250);

    this.gameState.setMode(GameMode.MENU);
    this.ui.showMainMenu();
    this.loop.start();
  }

  _setupCollectibles() {
    // ---- Coins: scattered across beach, jungle, and near landmarks ----
    this.coinManager = new CoinManager(this.scene);
    const coinPositions = [];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 95;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.island.getGroundHeight(x, z);
      if (y < -0.5) continue; // skip underwater spots
      coinPositions.push(new THREE.Vector3(x, y, z));
    }
    this.coinManager.spawnAt(coinPositions);

    // ---- Map pieces: 3 fixed discovery spots via InteractionSystem ----
    this.mapPieceMeshes = [];
    this.island.mapPieceSpots.forEach((spot, index) => {
      const mesh = createMapPieceMesh();
      mesh.position.copy(spot);
      this.scene.add(mesh);
      this.mapPieceMeshes.push(mesh);

      this.interactionSystem.register({
        id: `map-piece-${index}`,
        position: spot.clone().add(new THREE.Vector3(0, 0.5, 0)),
        radius: 2,
        label: 'Take Map Piece',
        onInteract: () => {
          this.gameState.addMapPiece();
          this.audio.playMapPieceFound();
          this.eventBus.emit('ui:toast', `Map piece found! (${this.gameState.mapPiecesFound}/${this.gameState.mapPiecesTotal})`);
          this.particles.spawnBurst(mesh.position.clone(), { color: 0xffcb47, count: 20 });
          mesh.visible = false;
          const entry = this.interactionSystem.interactables.find((i) => i.id === `map-piece-${index}`);
          if (entry) entry.consumed = true;
        }
      });
    });

    // ---- Golden key: lives inside the cave, revealed by PressurePlatePuzzle ----
    const keyWorldPos = this.island.cave.keyGroup.getWorldPosition(new THREE.Vector3());
    this._keyInteractable = this.interactionSystem.register({
      id: 'golden-key',
      position: keyWorldPos,
      radius: 1.8,
      label: 'Take Golden Key',
      enabled: false,
      onInteract: () => {
        this.gameState.grantGoldenKey();
        this.audio.playKeyFound();
        this.eventBus.emit('ui:toast', 'You found the Golden Key!');
        this.particles.spawnBurst(keyWorldPos.clone(), { color: 0xffcb47, count: 24 });
        this.island.cave.keyGroup.visible = false;
        this._keyInteractable.consumed = true;
      }
    });
  }

  _setupPuzzles() {
    this.symbolPuzzle = new SymbolPuzzle(this.island.ruins, this.interactionSystem, this.eventBus, this.audio, this.gameState);
    this.pressurePlatePuzzle = new PressurePlatePuzzle(this.island.cave, this.eventBus, this.audio, this.gameState);
    this.templePuzzle = new TemplePuzzle(
      this.island.temple,
      this.interactionSystem,
      this.gameState,
      this.questSystem,
      this.audio,
      this.particles,
      this.eventBus
    );

    // Once the cave puzzle is solved, enable the key interactable.
    this._pressurePlateWatcher = () => {
      if (this.pressurePlatePuzzle.solved && this._keyInteractable && !this._keyInteractable.enabled) {
        this._keyInteractable.enabled = true;
      }
    };
  }

  // ---------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------

  startNewGame() {
    this.gameState.reset();
    this._areaFlags = { beachExplored: false, ruinsDiscovered: false };
    this._resetWorldForNewRun();
    this.gameState.setMode(GameMode.PLAYING);
    this.ui.enterGameplay();
    this.audio.startAmbience();
    this.playerController.player.root.position.set(0, this.island.getGroundHeight(0, 85), 85);
    this.playerController.player.root.rotation.y = Math.PI;
    this.playerController.velocityY = 0;
  }

  _resetWorldForNewRun() {
    // Re-show consumed collectibles/interactables and re-lock puzzles.
    for (const coin of this.coinManager.coins) {
      coin.collected = false;
      coin.mesh.visible = true;
      this.scene.add(coin.mesh);
    }
    this.mapPieceMeshes.forEach((mesh) => { mesh.visible = true; });
    for (const item of this.interactionSystem.interactables) {
      item.consumed = false;
      if (item.id === 'golden-key') item.enabled = false;
    }
    this.island.cave.keyGroup.visible = false;

    // Reset puzzles.
    this.symbolPuzzle.solved = false;
    this.symbolPuzzle.progress = [];
    for (const p of this.island.ruins.symbolPedestals) {
      p.userData.symbolMat.emissiveIntensity = p.userData.baseIntensity;
    }
    this.island.ruins.gateGroup.position.y = 0;

    this.pressurePlatePuzzle.solved = false;
    this.pressurePlatePuzzle.progress = [];
    for (const plate of this.island.cave.pressurePlates) {
      plate.userData.pressed = false;
      plate.material.emissiveIntensity = 0;
    }

    this.templePuzzle.doorOpen = false;
    this.templePuzzle.chestOpened = false;
    this.island.temple.door.position.y = 0;
    this.island.temple.chestLid.rotation.x = 0;
    this.island.temple.glow.intensity = 0;
    const chestEntry = this.interactionSystem.interactables.find((i) => i.id === 'temple-chest');
    if (chestEntry) chestEntry.enabled = false;
  }

  togglePause() {
    if (this.gameState.mode === GameMode.PLAYING) {
      this.gameState.setMode(GameMode.PAUSED);
      this.ui.showPause();
    } else if (this.gameState.mode === GameMode.PAUSED) {
      this.resumeGame();
    }
  }

  resumeGame() {
    this.gameState.setMode(GameMode.PLAYING);
    this.ui.enterGameplay();
  }

  returnToMainMenu() {
    this.gameState.setMode(GameMode.MENU);
    this.ui.showMainMenu();
  }

  _handleVictory() {
    this.gameState.setMode(GameMode.VICTORY);
    const { score, best } = this.scoreSystem.finalizeRun();
    const minutes = Math.floor(this.gameState.elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(this.gameState.elapsedSeconds % 60).toString().padStart(2, '0');
    this.ui.showVictory({
      coins: this.gameState.coins,
      mapsFound: this.gameState.mapPiecesFound,
      mapsTotal: this.gameState.mapPiecesTotal,
      timeText: `${minutes}:${seconds}`,
      score,
      isNewBest: score >= best
    });
  }

  _handleGameOver() {
    this.gameState.setMode(GameMode.GAME_OVER);
    this.ui.showGameOver();
  }

  // ---------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------

  _update(dt) {
    this.particles.update(dt);
    this.island?.update(dt);
    this.wildlife?.update(dt);

    if (this.gameState.mode !== GameMode.PLAYING) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.gameState.tick(dt);
    this.ui.updateTimer(this.gameState.elapsedSeconds);

    const result = this.playerController.update(dt, this.camera);
    if (result.pausePressed) {
      this.togglePause();
      return;
    }

    this._updateCamera(dt);

    const playerPos = this.playerController.position;

    const collected = this.coinManager.update(dt, playerPos);
    if (collected > 0) {
      this.gameState.addCoins(collected);
      this.audio.playCoinCollect();
      this.particles.spawnBurst(playerPos.clone().add(new THREE.Vector3(0, 1, 0)), { color: 0xffd75e, count: 10 });
    }

    this.interactionSystem.update(playerPos, result.interacted);
    this.pressurePlatePuzzle.update(playerPos);
    this._pressurePlateWatcher();
    this.hazardManager.update(dt, playerPos);

    this._checkAreaTriggers(playerPos);

    this.renderer.render(this.scene, this.camera);
  }

  _checkAreaTriggers(playerPos) {
    const area = this.island.getAreaAt(playerPos);

    if (!this._areaFlags.beachExplored && (area === 'beach' || playerPos.distanceTo(this.island.areas.beach.center) < 40)) {
      this._areaFlags.beachExplored = true;
      this.questSystem.markBeachExplored();
    }

    if (!this._areaFlags.ruinsDiscovered && area === 'ruins') {
      this._areaFlags.ruinsDiscovered = true;
      this.questSystem.markRuinsDiscovered();
    }
  }

  _updateCamera(dt) {
    const rig = this._cameraRig;
    const player = this.playerController.player.root;

    // Camera yaw follows the player's facing direction with slight smoothing,
    // producing a classic "behind the shoulder" adventure camera.
    let angleDiff = player.rotation.y - rig.yaw;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    rig.yaw += angleDiff * Math.min(1, dt * 4);

    const bobAmount = this.playerController.animState === 'walk' || this.playerController.animState === 'run'
      ? Math.sin(performance.now() * 0.012) * 0.08
      : 0;

    // Camera trails BEHIND the player (opposite of facing direction) so
    // the player walks away from the camera when moving forward, and the
    // camera looks over the player's shoulder rather than into their face.
    const offsetX = -Math.sin(rig.yaw) * rig.distance;
    const offsetZ = -Math.cos(rig.yaw) * rig.distance;
    const desired = new THREE.Vector3(
      player.position.x + offsetX,
      player.position.y + rig.height + bobAmount,
      player.position.z + offsetZ
    );

    // Keep camera above terrain height at its own XZ position.
    const camGroundY = this.island.getGroundHeight(desired.x, desired.z);
    if (desired.y < camGroundY + 1.2) desired.y = camGroundY + 1.2;

    rig.currentPos.lerp(desired, Math.min(1, dt * 5));
    const lookAtTarget = new THREE.Vector3(player.position.x, player.position.y + 1.5, player.position.z);
    rig.currentLookAt.lerp(lookAtTarget, Math.min(1, dt * 8));

    this.camera.position.copy(rig.currentPos);
    this.camera.lookAt(rig.currentLookAt);

    // Keep the directional light following the player so shadows always render nearby.
    this.sunLight.position.set(player.position.x + 60, player.position.y + 90, player.position.z + 40);
    this.sunLight.target.position.copy(player.position);
    this.sunLight.target.updateMatrixWorld();
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _yieldFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
