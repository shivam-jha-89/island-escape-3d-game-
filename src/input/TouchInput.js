/**
 * TouchInput.js
 * ----------------------------------------------------------------------
 * Drives the on-screen virtual joystick + action buttons for mobile /
 * tablet play, exposing the same semantic API surface as KeyboardInput
 * so PlayerController can treat both interchangeably.
 */
export class TouchInput {
  constructor() {
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.btnInteract = document.getElementById('btn-touch-interact');
    this.btnJump = document.getElementById('btn-touch-jump');
    this.btnRun = document.getElementById('btn-touch-run');

    this._active = false;
    this._pointerId = null;
    this._vector = { x: 0, y: 0 }; // x: -1..1 (left/right), y: -1..1 (back/forward)
    this._running = false;
    this._jumpQueued = false;
    this._interactQueued = false;

    this._bindJoystick();
    this._bindButtons();
  }

  _bindJoystick() {
    if (!this.joystickZone) return;
    const radius = 55;

    const start = (e) => {
      this._active = true;
      this._pointerId = e.pointerId;
      this.joystickZone.setPointerCapture(e.pointerId);
      move(e);
    };

    const move = (e) => {
      if (!this._active || e.pointerId !== this._pointerId) return;
      const rect = this.joystickBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.min(radius, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * dist;
      dy = Math.sin(angle) * dist;
      this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this._vector.x = dx / radius;
      this._vector.y = -dy / radius; // invert so up = forward = positive
    };

    const end = (e) => {
      if (e.pointerId !== this._pointerId) return;
      this._active = false;
      this._pointerId = null;
      this._vector.x = 0;
      this._vector.y = 0;
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    };

    this.joystickZone.addEventListener('pointerdown', start);
    this.joystickZone.addEventListener('pointermove', move);
    this.joystickZone.addEventListener('pointerup', end);
    this.joystickZone.addEventListener('pointercancel', end);
  }

  _bindButtons() {
    if (this.btnJump) {
      this.btnJump.addEventListener('pointerdown', () => { this._jumpQueued = true; });
    }
    if (this.btnInteract) {
      this.btnInteract.addEventListener('pointerdown', () => { this._interactQueued = true; });
    }
    if (this.btnRun) {
      this.btnRun.addEventListener('pointerdown', () => {
        this._running = !this._running;
        this.btnRun.classList.toggle('active', this._running);
      });
    }
  }

  get forward() { return this._vector.y > 0.3; }
  get backward() { return this._vector.y < -0.3; }
  get left() { return this._vector.x < -0.3; }
  get right() { return this._vector.x > 0.3; }
  get running() { return this._running; }

  /** Raw analog vector, used for smoother mobile turning if desired. */
  get vector() { return this._vector; }

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
    return false; // Pause is handled via the dedicated HUD pause button on mobile.
  }
}
