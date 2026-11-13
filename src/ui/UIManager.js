import { HUD } from './HUD.js';
import { Menus } from './Menus.js';

/**
 * UIManager.js
 * ----------------------------------------------------------------------
 * Thin composition root for the UI layer: owns the HUD and Menus
 * instances, detects touch-capable devices to reveal the mobile control
 * overlay, and exposes a small stable API for Game.js/main.js to call
 * (showHUD, hideHUD, showScreen, etc.) without reaching into DOM details
 * itself.
 */
export class UIManager {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   * @param {import('../systems/StorageSystem.js').StorageSystem} storageSystem
   * @param {import('../systems/AudioSystem.js').AudioSystem} audio
   * @param {object} callbacks
   */
  constructor(gameState, eventBus, storageSystem, audio, callbacks) {
    this.gameState = gameState;
    this.eventBus = eventBus;

    this.hud = new HUD(gameState, eventBus);
    this.menus = new Menus(gameState, storageSystem, audio, callbacks);

    this.mobileControls = document.getElementById('mobile-controls');
    this._detectTouchDevice();
  }

  _detectTouchDevice() {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch && this.mobileControls) {
      this.mobileControls.classList.remove('hidden');
    }
  }

  showLoading() { this.menus.showScreen('loading'); }
  updateLoadingProgress(pct, statusText) { this.menus.updateLoadingProgress(pct, statusText); }

  showMainMenu() {
    this.hud.hide();
    this.menus.refreshBestScoreDisplay();
    this.menus.showScreen('mainMenu');
  }

  showPause() { this.menus.showScreen('pause'); }

  enterGameplay() {
    this.menus.hideAllScreens();
    this.hud.show();
  }

  showVictory(payload) {
    this.hud.hide();
    this.menus.showVictory(payload);
  }

  showGameOver() {
    this.hud.hide();
    this.menus.showScreen('gameOver');
  }

  updateTimer(elapsedSeconds) {
    this.hud.updateTimer(elapsedSeconds);
  }
}
