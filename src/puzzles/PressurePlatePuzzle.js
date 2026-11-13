import * as THREE from 'three';

/**
 * PressurePlatePuzzle.js
 * ----------------------------------------------------------------------
 * Puzzle 2 (Mysterious Cave): four floor plates must be stepped on in a
 * fixed order. Unlike SymbolPuzzle this is *position*-driven (no E
 * press needed) — the player walks onto a plate and it lights up.
 * Stepping on the wrong plate resets the sequence with gentle feedback.
 * Solving it reveals the hidden golden key.
 */
export class PressurePlatePuzzle {
  /**
   * @param {{group, pressurePlates, keyGroup}} cave
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(cave, eventBus, audio, gameState) {
    this.cave = cave;
    this.eventBus = eventBus;
    this.audio = audio;
    this.gameState = gameState;
    this.solved = false;
    this.correctOrder = [0, 2, 1, 3];
    this.progress = [];
    this._plateWorldPositions = cave.pressurePlates.map((plate) => plate.getWorldPosition(new THREE.Vector3()));

    // Key starts hidden until the puzzle is solved.
    this.cave.keyGroup.visible = false;
  }

  update(playerPosition) {
    if (this.solved) return;

    for (let i = 0; i < this.cave.pressurePlates.length; i++) {
      const plate = this.cave.pressurePlates[i];
      const worldPos = this._plateWorldPositions[i];
      const dist = Math.hypot(playerPosition.x - worldPos.x, playerPosition.z - worldPos.z);
      const isOn = dist < 1.0;

      if (isOn && !plate.userData.pressed) {
        plate.userData.pressed = true;
        this._onPlatePressed(i, plate);
      } else if (!isOn && plate.userData.pressed) {
        plate.userData.pressed = false;
      }
    }
  }

  _onPlatePressed(index, plate) {
    this.audio.playPuzzleActivate();
    plate.material.emissive = new THREE.Color('#4ad3ff');
    plate.material.emissiveIntensity = 0.6;

    this.progress.push(index);
    const step = this.progress.length - 1;

    if (this.correctOrder[step] !== index) {
      this.eventBus.emit('ui:toast', 'The plates reset...');
      setTimeout(() => {
        for (const p of this.cave.pressurePlates) {
          p.material.emissiveIntensity = 0;
        }
        this.progress = [];
      }, 500);
      return;
    }

    if (this.progress.length === this.correctOrder.length) {
      this._solve();
    }
  }

  _solve() {
    this.solved = true;
    this.audio.playPuzzleSuccess();
    this.eventBus.emit('ui:toast', 'A hidden ledge glows — the golden key appears!');
    this.cave.keyGroup.visible = true;

    // Small reveal animation: pop the key up into place.
    const start = performance.now();
    const baseY = this.cave.keyGroup.position.y;
    this.cave.keyGroup.position.y = baseY - 1.2;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 500);
      this.cave.keyGroup.position.y = baseY - 1.2 + t * 1.2;
      this.cave.keyGroup.rotation.y += 0.15;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }
}
