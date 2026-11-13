import * as THREE from 'three';

/**
 * TemplePuzzle.js
 * ----------------------------------------------------------------------
 * Puzzle 3 (Treasure Temple, final): the door only opens once the
 * player holds all 3 map pieces AND the golden key. Once open, the
 * player can interact with the treasure chest itself to trigger the
 * victory sequence. Kept as one cohesive "puzzle" class since the door
 * and chest are tightly coupled narratively (door gates access; chest
 * is the actual win condition).
 */
export class TemplePuzzle {
  /**
   * @param {ReturnType<import('../world/Temple.js').createTemple>} temple
   * @param {import('../interaction/InteractionSystem.js').InteractionSystem} interactionSystem
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../systems/QuestSystem.js').QuestSystem} questSystem
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {import('../systems/ParticleSystem.js').ParticleSystem} particles
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(temple, interactionSystem, gameState, questSystem, audio, particles, eventBus) {
    this.temple = temple;
    this.gameState = gameState;
    this.questSystem = questSystem;
    this.audio = audio;
    this.particles = particles;
    this.eventBus = eventBus;

    this.doorOpen = false;
    this.chestOpened = false;

    const doorWorldPos = temple.door.getWorldPosition(new THREE.Vector3());
    interactionSystem.register({
      id: 'temple-door',
      position: doorWorldPos,
      radius: 3,
      label: 'Open Door',
      onInteract: () => this._tryOpenDoor()
    });

    const chestWorldPos = temple.chestGroup.getWorldPosition(new THREE.Vector3());
    this.chestInteractable = interactionSystem.register({
      id: 'temple-chest',
      position: chestWorldPos,
      radius: 2.6,
      label: 'Open Treasure',
      onInteract: () => this._openChest(),
      enabled: false
    });
  }

  _tryOpenDoor() {
    if (this.doorOpen) return;

    const missing = [];
    if (this.gameState.mapPiecesFound < this.gameState.mapPiecesTotal) missing.push('all 3 map pieces');
    if (!this.gameState.hasGoldenKey) missing.push('the golden key');

    if (missing.length > 0) {
      this.eventBus.emit('ui:toast', `The door is sealed. You need: ${missing.join(' and ')}.`);
      return;
    }

    this.doorOpen = true;
    this.gameState.templePuzzleSolved = true;
    this.questSystem.markTempleSolved();
    this.audio.playDoorOpen();
    this.eventBus.emit('ui:toast', 'The ancient door creaks open!');

    const door = this.temple.door;
    const startY = door.position.y;
    const start = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 1000);
      door.position.y = startY + t * 3.5;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();

    this.chestInteractable.enabled = true;
    this.temple.glow.intensity = 1.4;
  }

  _openChest() {
    if (this.chestOpened) return;
    this.chestOpened = true;
    this.gameState.treasureOpened = true;
    this.questSystem.markTreasureFound();
    this.audio.playTreasureOpen();

    const lid = this.temple.chestLid;
    const startRot = lid.rotation.x;
    const start = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 700);
      lid.rotation.x = startRot - t * 1.9;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();

    const chestPos = this.temple.chestGroup.getWorldPosition(new THREE.Vector3());
    this.particles.spawnBurst(chestPos.clone().add(new THREE.Vector3(0, 1, 0)), {
      color: 0xffd75e,
      count: 40,
      spread: 1.2,
      life: 1.2
    });
    this.temple.glow.intensity = 3.5;

    this.eventBus.emit('game:victory');
  }
}
