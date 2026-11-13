import * as THREE from 'three';

/**
 * SymbolPuzzle.js
 * ----------------------------------------------------------------------
 * Puzzle 1 (Ancient Ruins): the player must interact with the three
 * glowing symbol pedestals in a specific order. A wrong pick resets
 * progress (with feedback) rather than punishing the player harshly —
 * per the assignment's "puzzles should be understandable and not
 * frustrating" requirement.
 */
export class SymbolPuzzle {
  /**
   * @param {{group, gateGroup, symbolPedestals}} ruins
   * @param {import('../interaction/InteractionSystem.js').InteractionSystem} interactionSystem
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {import('../core/GameState.js').GameState} gameState
   */
  constructor(ruins, interactionSystem, eventBus, audio, gameState) {
    this.ruins = ruins;
    this.eventBus = eventBus;
    this.audio = audio;
    this.gameState = gameState;
    this.solved = false;

    // Fixed correct order (index into symbolPedestals array): right, left, middle.
    this.correctOrder = [2, 0, 1];
    this.progress = [];

    for (const pedestal of ruins.symbolPedestals) {
      interactionSystem.register({
        id: `symbol-${pedestal.userData.symbolIndex}`,
        position: pedestal.getWorldPosition(new THREE.Vector3()),
        radius: 2.4,
        label: 'Activate Symbol',
        onInteract: () => this._activate(pedestal)
      });
    }
  }

  _activate(pedestal) {
    if (this.solved) return;
    this.audio.playPuzzleActivate();
    pedestal.userData.symbolMat.emissiveIntensity = pedestal.userData.activeIntensity;

    this.progress.push(pedestal.userData.symbolIndex);
    const stepIndex = this.progress.length - 1;

    if (this.progress[stepIndex] !== this.correctOrder[stepIndex]) {
      // Wrong order: brief feedback, then reset all symbols.
      this.eventBus.emit('ui:toast', 'Wrong sequence... the symbols reset.');
      setTimeout(() => {
        for (const p of this.ruins.symbolPedestals) {
          p.userData.symbolMat.emissiveIntensity = p.userData.baseIntensity;
        }
        this.progress = [];
      }, 500);
      return;
    }

    if (this.progress.length === this.correctOrder.length) {
      this._solve();
    } else {
      this.eventBus.emit('ui:toast', `Symbol activated (${this.progress.length}/${this.correctOrder.length})`);
    }
  }

  _solve() {
    this.solved = true;
    this.gameState.ruinsPuzzleSolved = true;
    this.audio.playPuzzleSuccess();
    this.eventBus.emit('ui:toast', 'The gate rumbles open!');

    // Animate the gate sinking into the ground to "open" it.
    const gate = this.ruins.gateGroup;
    const startY = gate.position.y;
    const duration = 1200;
    const startTime = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      gate.position.y = startY - t * 4.5;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }
}
