/**
 * StorageSystem.js
 * ----------------------------------------------------------------------
 * Thin wrapper around localStorage. Centralizing access here means the
 * rest of the codebase never touches `window.localStorage` directly,
 * which makes it easy to guard against environments where storage is
 * unavailable (private browsing, some embedded webviews) without
 * crashing the game.
 */

const KEYS = Object.freeze({
  BEST_SCORE: 'islandEscape3D.bestScore',
  SETTINGS: 'islandEscape3D.settings'
});

export class StorageSystem {
  constructor() {
    this.available = StorageSystem._detectAvailability();
  }

  static _detectAvailability() {
    try {
      const testKey = '__island_escape_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (err) {
      console.warn('[StorageSystem] localStorage unavailable, progress will not persist.', err);
      return false;
    }
  }

  getBestScore() {
    if (!this.available) return 0;
    const raw = window.localStorage.getItem(KEYS.BEST_SCORE);
    return raw ? parseInt(raw, 10) || 0 : 0;
  }

  saveBestScoreIfHigher(score) {
    if (!this.available) return this.getBestScore();
    const current = this.getBestScore();
    if (score > current) {
      window.localStorage.setItem(KEYS.BEST_SCORE, String(score));
      return score;
    }
    return current;
  }

  loadSettings(defaults) {
    if (!this.available) return { ...defaults };
    try {
      const raw = window.localStorage.getItem(KEYS.SETTINGS);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('[StorageSystem] Failed to parse saved settings.', err);
      return { ...defaults };
    }
  }

  saveSettings(settings) {
    if (!this.available) return;
    try {
      window.localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.warn('[StorageSystem] Failed to save settings.', err);
    }
  }
}
