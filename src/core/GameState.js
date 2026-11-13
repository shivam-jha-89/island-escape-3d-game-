/**
 * GameState.js
 * ----------------------------------------------------------------------
 * Single source of truth for the current run's mutable state (health,
 * coins, quest flags, timer, etc). Systems read/write this object and
 * emit EventBus events when meaningful state changes, rather than
 * scattering game state across DOM elements or random globals.
 */

export const GameMode = Object.freeze({
  LOADING: 'loading',
  MENU: 'menu',
  HOW_TO_PLAY: 'how_to_play',
  SETTINGS: 'settings',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  GAME_OVER: 'game_over'
});

export class GameState {
  /** @param {import('../utils/EventBus.js').EventBus} eventBus */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.reset();

    // Persisted, cross-run settings (not reset between playthroughs).
    this.settings = {
      soundEnabled: true,
      musicEnabled: true,
      quality: 'medium'
    };
  }

  /** Resets all per-run progress. Called on new game / restart. */
  reset() {
    this.mode = GameMode.LOADING;

    this.health = 100;
    this.maxHealth = 100;

    this.coins = 0;
    this.mapPiecesFound = 0;
    this.mapPiecesTotal = 3;
    this.hasGoldenKey = false;

    this.ruinsPuzzleSolved = false;
    this.templePuzzleSolved = false;
    this.treasureOpened = false;

    this.elapsedSeconds = 0;
    this.score = 0;

    this.quests = [
      { id: 'explore_beach', label: 'Explore the beach', done: false },
      { id: 'find_maps', label: 'Find 3 map pieces', done: false },
      { id: 'discover_ruins', label: 'Discover the ancient ruins', done: false },
      { id: 'find_key', label: 'Find the golden key', done: false },
      { id: 'solve_temple', label: 'Solve the temple puzzle', done: false },
      { id: 'find_treasure', label: 'Find the lost treasure', done: false }
    ];
  }

  setMode(mode) {
    this.mode = mode;
    this.eventBus.emit('state:mode-changed', mode);
  }

  addCoins(amount) {
    this.coins += amount;
    this.eventBus.emit('state:coins-changed', this.coins);
  }

  addMapPiece() {
    this.mapPiecesFound = Math.min(this.mapPiecesTotal, this.mapPiecesFound + 1);
    this.eventBus.emit('state:maps-changed', {
      found: this.mapPiecesFound,
      total: this.mapPiecesTotal
    });
    if (this.mapPiecesFound >= this.mapPiecesTotal) {
      this.completeQuest('find_maps');
    }
  }

  grantGoldenKey() {
    this.hasGoldenKey = true;
    this.eventBus.emit('state:key-changed', true);
    this.completeQuest('find_key');
  }

  /** Applies damage, clamped at 0, and emits change/death events. */
  takeDamage(amount) {
    if (this.health <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.eventBus.emit('state:health-changed', this.health);
    if (this.health <= 0) {
      this.eventBus.emit('state:player-died');
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.eventBus.emit('state:health-changed', this.health);
  }

  completeQuest(id) {
    const quest = this.quests.find((q) => q.id === id);
    if (quest && !quest.done) {
      quest.done = true;
      this.eventBus.emit('state:quest-updated', this.quests);
    }
  }

  tick(deltaSeconds) {
    if (this.mode === GameMode.PLAYING) {
      this.elapsedSeconds += deltaSeconds;
    }
  }

  /** Computes the final exploration score from current progress. */
  computeScore() {
    const coinScore = this.coins * 10;
    const mapScore = this.mapPiecesFound * 150;
    const puzzleScore = (this.ruinsPuzzleSolved ? 200 : 0) + (this.templePuzzleSolved ? 300 : 0);
    const keyScore = this.hasGoldenKey ? 100 : 0;
    const timeBonus = Math.max(0, 600 - Math.floor(this.elapsedSeconds)) * 2;
    this.score = coinScore + mapScore + puzzleScore + keyScore + timeBonus;
    return this.score;
  }
}
