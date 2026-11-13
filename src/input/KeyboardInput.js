/**
 * KeyboardInput.js
 * ----------------------------------------------------------------------
 * Tracks currently-held keys and exposes a small, semantic API
 * (forward/backward/left/right/run/jump pressed-this-frame/interact/pause)
 * so PlayerController and Game never touch raw KeyboardEvent codes.
 */
export class KeyboardInput {
  constructor() {
    this.keys = new Set();
    this._jumpQueued = false;
    this._interactQueued = false;
    this._pauseQueued = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    const code = e.code;
    if (!this.keys.has(code)) {
      // Space or Enter both trigger a jump.
      if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') this._jumpQueued = true;
      if (code === 'KeyE') this._interactQueued = true;
      if (code === 'KeyP' || code === 'Escape') this._pauseQueued = true;
    }
    this.keys.add(code);

    // Prevent page scroll on arrows/space while playing.
    if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  get forward() { return this.keys.has('KeyW') || this.keys.has('ArrowUp'); }
  get backward() { return this.keys.has('KeyS') || this.keys.has('ArrowDown'); }
  get left() { return this.keys.has('KeyA') || this.keys.has('ArrowLeft'); }
  get right() { return this.keys.has('KeyD') || this.keys.has('ArrowRight'); }
  get running() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }

  /** Consumes the jump-was-pressed-this-frame flag. */
  consumeJump() {
    const val = this._jumpQueued;
    this._jumpQueued = false;
    return val;
  }

  consumeInteract() {
    const val = this._interactQueued;
    this._interactQueued = false;
    return val;
  }

  consumePause() {
    const val = this._pauseQueued;
    this._pauseQueued = false;
    return val;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
