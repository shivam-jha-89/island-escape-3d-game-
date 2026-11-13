/**
 * QuestSystem.js
 * ----------------------------------------------------------------------
 * Coordinates the objective checklist shown in the HUD. GameState owns
 * the raw quest data; this system is the single place gameplay code
 * calls into to mark objectives complete, so the "what triggers what"
 * logic doesn't get scattered across world/collectible files.
 */
export class QuestSystem {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this.gameState = gameState;
    this.eventBus = eventBus;
  }

  markBeachExplored() {
    this._complete('explore_beach', 'Beach explored!');
  }

  markRuinsDiscovered() {
    this._complete('discover_ruins', 'Ancient ruins discovered!');
  }

  markTempleSolved() {
    this._complete('solve_temple', 'Temple puzzle solved!');
  }

  markTreasureFound() {
    this._complete('find_treasure', 'The lost treasure is yours!');
  }

  _complete(id, toastMessage) {
    const quest = this.gameState.quests.find((q) => q.id === id);
    if (quest && !quest.done) {
      this.gameState.completeQuest(id);
      this.eventBus.emit('ui:toast', toastMessage);
    }
  }
}
