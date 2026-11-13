import * as THREE from 'three';

/**
 * HazardManager.js
 * ----------------------------------------------------------------------
 * Owns all environmental hazards: the static poison plants scattered by
 * Island.js, plus a handful of hand-placed spike traps and swinging
 * log hazards for variety. Applies damage to the player on contact with
 * a short invulnerability cooldown so a single lingering touch doesn't
 * melt the health bar instantly (assignment explicitly asks the game
 * not be excessively difficult).
 */
const DAMAGE_COOLDOWN = 1.2; // seconds of invulnerability after taking damage

export class HazardManager {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../world/Island.js').Island} island
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(scene, island, gameState, audio, eventBus) {
    this.scene = scene;
    this.island = island;
    this.gameState = gameState;
    this.audio = audio;
    this.eventBus = eventBus;
    this._cooldown = 0;

    this.hazards = [...island.hazards]; // static poison plants (position, radius, damage)
    this._buildSpikeTraps();
    this._buildSwingingLogs();
  }

  _buildSpikeTraps() {
    const spikeMat = new THREE.MeshStandardMaterial({ color: '#8a8378', flatShading: true, roughness: 0.9 });
    const positions = [
      { x: 30, z: 35 },
      { x: -10, z: 40 },
      { x: 20, z: -5 }
    ];
    this.spikeTraps = [];
    for (const { x, z } of positions) {
      const groundY = this.island.getGroundHeight(x, z);
      const group = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 5), spikeMat);
        spike.position.set((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8);
        group.add(spike);
      }
      group.position.set(x, groundY, z);
      this.scene.add(group);
      const hazard = { position: group.position.clone(), radius: 1.1, damage: 12, type: 'spike_trap' };
      this.hazards.push(hazard);
      this.spikeTraps.push(group);
    }
  }

  _buildSwingingLogs() {
    // A swinging log suspended between two posts near the ruins approach —
    // player must time their crossing to avoid it.
    const logMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', flatShading: true, roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', flatShading: true });

    this.swingingLogs = [];
    const positions = [{ x: -34, z: -6 }];
    for (const { x, z } of positions) {
      const groundY = this.island.getGroundHeight(x, z);
      const pivot = new THREE.Group();
      pivot.position.set(x, groundY + 4.5, z);
      this.scene.add(pivot);

      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 4), ropeMat);
      rope.position.y = -2.25;
      pivot.add(rope);

      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.2, 8), logMat);
      log.rotation.z = Math.PI / 2;
      log.position.y = -4.5;
      log.castShadow = true;
      pivot.add(log);

      this.swingingLogs.push({ pivot, log, phase: Math.random() * Math.PI * 2 });
      this.hazards.push({ position: null, radius: 1.3, damage: 15, type: 'swinging_log', logRef: this.swingingLogs[this.swingingLogs.length - 1] });
    }
  }

  update(dt, playerPosition) {
    if (this._cooldown > 0) this._cooldown -= dt;

    // Animate swinging logs.
    for (const swing of this.swingingLogs) {
      swing.phase += dt * 1.4;
      swing.pivot.rotation.z = Math.sin(swing.phase) * 0.6;
    }

    if (this._cooldown > 0) return; // invulnerable window, skip damage checks

    for (const hazard of this.hazards) {
      let worldPos = hazard.position;
      if (hazard.type === 'swinging_log') {
        worldPos = hazard.logRef.log.getWorldPosition(new THREE.Vector3());
      }
      if (!worldPos) continue;
      const dist = Math.hypot(playerPosition.x - worldPos.x, playerPosition.z - worldPos.z);
      const verticalOk = Math.abs(playerPosition.y - worldPos.y) < 2.2;
      if (dist < hazard.radius && verticalOk) {
        this._applyDamage(hazard.damage);
        break;
      }
    }
  }

  _applyDamage(amount) {
    this._cooldown = DAMAGE_COOLDOWN;
    this.gameState.takeDamage(amount);
    this.audio.playDamage();
    this.eventBus.emit('ui:damage-flash');
  }
}
