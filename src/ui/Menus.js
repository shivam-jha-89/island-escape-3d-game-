/**
 * Menus.js
 * ----------------------------------------------------------------------
 * Handles all non-HUD screens: loading, main menu, how-to-play,
 * settings, pause, victory, game over. Responsible for showing/hiding
 * the correct `.screen` element and wiring every button's click handler
 * to a callback supplied by the caller (Game.js via UIManager), so this
 * file has zero gameplay logic of its own — it's pure UI glue.
 */
export class Menus {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../systems/StorageSystem.js').StorageSystem} storageSystem
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {object} callbacks - { onStart, onResume, onRestart, onMainMenu }
   */
  constructor(gameState, storageSystem, audio, callbacks) {
    this.gameState = gameState;
    this.storageSystem = storageSystem;
    this.audio = audio;
    this.callbacks = callbacks;

    this.screens = {
      loading: document.getElementById('loading-screen'),
      mainMenu: document.getElementById('main-menu'),
      howToPlay: document.getElementById('how-to-play'),
      settings: document.getElementById('settings-menu'),
      pause: document.getElementById('pause-menu'),
      victory: document.getElementById('victory-screen'),
      gameOver: document.getElementById('gameover-screen')
    };

    this._bindButtons();
    this._loadSettingsIntoUI();
  }

  _click(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      this.audio.playButtonClick();
      handler();
    });
  }

  _bindButtons() {
    this._click('btn-start', () => this.callbacks.onStart());
    this._click('btn-how-to-play', () => this.showScreen('howToPlay'));
    this._click('btn-howto-back', () => this.showScreen('mainMenu'));
    this._click('btn-settings', () => this.showScreen('settings'));
    this._click('btn-settings-back', () => this.showScreen('mainMenu'));

    this._click('btn-resume', () => this.callbacks.onResume());
    this._click('btn-restart', () => this.callbacks.onRestart());
    this._click('btn-pause-main-menu', () => this.callbacks.onMainMenu());
    this._click('btn-pause', () => this.callbacks.onPauseButton());

    this._click('btn-victory-restart', () => this.callbacks.onRestart());
    this._click('btn-victory-menu', () => this.callbacks.onMainMenu());

    this._click('btn-gameover-restart', () => this.callbacks.onRestart());
    this._click('btn-gameover-menu', () => this.callbacks.onMainMenu());

    const soundToggle = document.getElementById('toggle-sound');
    soundToggle?.addEventListener('change', (e) => {
      this.gameState.settings.soundEnabled = e.target.checked;
      this.audio.setSoundEnabled(e.target.checked);
      this.storageSystem.saveSettings(this.gameState.settings);
    });

    const musicToggle = document.getElementById('toggle-music');
    musicToggle?.addEventListener('change', (e) => {
      this.gameState.settings.musicEnabled = e.target.checked;
      this.audio.setMusicEnabled(e.target.checked);
      this.storageSystem.saveSettings(this.gameState.settings);
    });

    const qualitySelect = document.getElementById('select-quality');
    qualitySelect?.addEventListener('change', (e) => {
      this.gameState.settings.quality = e.target.value;
      this.storageSystem.saveSettings(this.gameState.settings);
      this.callbacks.onQualityChange?.(e.target.value);
    });
  }

  _loadSettingsIntoUI() {
    const soundToggle = document.getElementById('toggle-sound');
    const musicToggle = document.getElementById('toggle-music');
    const qualitySelect = document.getElementById('select-quality');
    if (soundToggle) soundToggle.checked = this.gameState.settings.soundEnabled;
    if (musicToggle) musicToggle.checked = this.gameState.settings.musicEnabled;
    if (qualitySelect) qualitySelect.value = this.gameState.settings.quality;

    const bestScoreDisplay = document.getElementById('best-score-display');
    if (bestScoreDisplay) bestScoreDisplay.textContent = String(this.storageSystem.getBestScore());
  }

  showScreen(name) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key]?.classList.toggle('active', key === name);
    }
  }

  hideAllScreens() {
    for (const key of Object.keys(this.screens)) {
      this.screens[key]?.classList.remove('active');
    }
  }

  updateLoadingProgress(pct, statusText) {
    const fill = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (fill) fill.style.width = `${pct}%`;
    if (status && statusText) status.textContent = statusText;
  }

  showVictory({ coins, mapsFound, mapsTotal, timeText, score, isNewBest }) {
    document.getElementById('victory-coins').textContent = String(coins);
    document.getElementById('victory-maps').textContent = `${mapsFound}/${mapsTotal}`;
    document.getElementById('victory-time').textContent = timeText;
    document.getElementById('victory-score').textContent = isNewBest ? `${score} (New Best!)` : String(score);
    this.showScreen('victory');
  }

  refreshBestScoreDisplay() {
    const bestScoreDisplay = document.getElementById('best-score-display');
    if (bestScoreDisplay) bestScoreDisplay.textContent = String(this.storageSystem.getBestScore());
  }
}
