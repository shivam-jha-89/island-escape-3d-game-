/**
 * ScoreSystem.js
 * ----------------------------------------------------------------------
 * Computes the final exploration score and persists the best result via
 * StorageSystem. Kept separate from GameState so the scoring *formula*
 * can evolve independently of the raw state container.
 */
export class ScoreSystem {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('./StorageSystem.js').StorageSystem} storageSystem
   */
  constructor(gameState, storageSystem) {
    this.gameState = gameState;
    this.storageSystem = storageSystem;
  }

  finalizeRun() {
    const score = this.gameState.computeScore();
    const best = this.storageSystem.saveBestScoreIfHigher(score);
    return { score, best };
  }

  getBestScore() {
    return this.storageSystem.getBestScore();
  }
}
