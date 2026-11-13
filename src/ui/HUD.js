/**
 * HUD.js
 * ----------------------------------------------------------------------
 * Pure DOM-updating layer for the in-game heads-up display: health bar,
 * coin count, map progress, key status, timer, quest checklist,
 * interaction prompt, and toast notifications. Listens to EventBus
 * events emitted by GameState/systems rather than polling — keeps this
 * file free of any gameplay logic.
 */
export class HUD {
  /**
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../utils/EventBus.js').EventBus} eventBus
   */
  constructor(gameState, eventBus) {
    this.gameState = gameState;
    this.eventBus = eventBus;

    this.el = {
      hud: document.getElementById('hud'),
      healthFill: document.getElementById('health-bar-fill'),
      coinCount: document.getElementById('coin-count'),
      mapCount: document.getElementById('map-count'),
      keyStatus: document.getElementById('key-status'),
      timer: document.getElementById('hud-timer'),
      questList: document.getElementById('quest-list'),
      interactPrompt: document.getElementById('interact-prompt'),
      toastContainer: document.getElementById('toast-container'),
      damageFlash: document.getElementById('damage-flash')
    };

    this._renderQuests();
    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('state:health-changed', (health) => {
      const pct = Math.max(0, (health / this.gameState.maxHealth) * 100);
      this.el.healthFill.style.width = `${pct}%`;
    });

    this.eventBus.on('state:coins-changed', (coins) => {
      this.el.coinCount.textContent = String(coins);
    });

    this.eventBus.on('state:maps-changed', ({ found, total }) => {
      this.el.mapCount.textContent = `${found}/${total}`;
    });

    this.eventBus.on('state:key-changed', (has) => {
      this.el.keyStatus.textContent = has ? '✓' : '✗';
    });

    this.eventBus.on('state:quest-updated', () => this._renderQuests());

    this.eventBus.on('interaction:prompt-visibility', (visible) => {
      this.el.interactPrompt.classList.toggle('hidden', !visible);
    });

    this.eventBus.on('ui:toast', (message) => this._showToast(message));

    this.eventBus.on('ui:damage-flash', () => this._flashDamage());
  }

  _renderQuests() {
    this.el.questList.innerHTML = '';
    for (const quest of this.gameState.quests) {
      const li = document.createElement('li');
      li.className = quest.done ? 'done' : '';
      li.innerHTML = `<span class="box">${quest.done ? '☑' : '☐'}</span>${quest.label}`;
      this.el.questList.appendChild(li);
    }
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  _flashDamage() {
    this.el.damageFlash.classList.add('active');
    setTimeout(() => this.el.damageFlash.classList.remove('active'), 120);
  }

  updateTimer(elapsedSeconds) {
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(elapsedSeconds % 60).toString().padStart(2, '0');
    this.el.timer.textContent = `${minutes}:${seconds}`;
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }
}
