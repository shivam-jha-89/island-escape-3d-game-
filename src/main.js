import './style.css';
import { Game } from './core/Game.js';

/**
 * main.js
 * ----------------------------------------------------------------------
 * Application entry point. Instantiates the Game orchestrator, which
 * builds the world, wires every system, and starts the render loop once
 * loading completes. Kept intentionally tiny — all real logic lives in
 * src/core/Game.js and the systems it composes.
 */
window.addEventListener('DOMContentLoaded', () => {
  try {
    // eslint-disable-next-line no-new
    new Game();
  } catch (err) {
    console.error('[main] Failed to start Island Escape 3D:', err);
    const status = document.getElementById('loading-status');
    if (status) {
      status.textContent = 'Something went wrong loading the island. Please refresh.';
    }
  }
});
