/**
 * GameLoop.js
 * ----------------------------------------------------------------------
 * Minimal requestAnimationFrame driver. Clamps delta time to avoid huge
 * physics/animation jumps after a tab is backgrounded and refocused,
 * and reports FPS-independent, frame-accurate elapsed time to the
 * supplied update callback.
 */
export class GameLoop {
  /** @param {(dt: number) => void} updateFn */
  constructor(updateFn) {
    this.updateFn = updateFn;
    this._running = false;
    this._lastTime = 0;
    this._rafId = null;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
  }

  _tick(now) {
    if (!this._running) return;
    const rawDt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    const dt = Math.min(rawDt, 1 / 20); // clamp to avoid spiral-of-death on lag spikes

    try {
      this.updateFn(dt);
    } catch (err) {
      console.error('[GameLoop] update threw an error:', err);
    }

    this._rafId = requestAnimationFrame(this._tick);
  }
}
