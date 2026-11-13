/**
 * AudioSystem.js
 * ----------------------------------------------------------------------
 * Robust, dependency-free audio system built on the Web Audio API.
 *
 * Design decision: instead of loading external .mp3/.wav asset URLs
 * (which the assignment explicitly warns against — broken external
 * dependencies would make the game fail to run), every sound effect and
 * ambience is *synthesized on the fly* with oscillators/noise buffers.
 * This guarantees:
 *   1. Zero network dependency for audio.
 *   2. The game never throws on missing/blocked audio files.
 *   3. Instant, tiny bundle size.
 *
 * If the browser blocks AudioContext until a user gesture (common
 * autoplay policy), the system simply queues silently and resumes on
 * the first interaction — it never throws.
 */
export class AudioSystem {
  /** @param {import('../core/GameState.js').GameState} gameState */
  constructor(gameState) {
    this.gameState = gameState;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this._ambientNodes = [];
    this._unlocked = false;

    this._initContext();
    const resume = () => this._unlock();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    window.addEventListener('touchstart', resume, { once: true });
  }

  _initContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AudioSystem] Web Audio API not supported; running muted.');
        return;
      }
      this.context = new AudioCtx();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = this.gameState.settings.musicEnabled ? 0.25 : 0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = this.gameState.settings.soundEnabled ? 0.8 : 0;
      this.sfxGain.connect(this.masterGain);
    } catch (err) {
      console.warn('[AudioSystem] Failed to initialize audio context; running muted.', err);
      this.context = null;
    }
  }

  _unlock() {
    if (this._unlocked || !this.context) return;
    this._unlocked = true;
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  setSoundEnabled(enabled) {
    if (this.sfxGain) this.sfxGain.gain.value = enabled ? 0.8 : 0;
  }

  setMusicEnabled(enabled) {
    if (this.musicGain) this.musicGain.gain.value = enabled ? 0.25 : 0;
  }

  /** Plays a short synthesized tone. Silently no-ops if audio is unavailable. */
  _playTone({ freq = 440, duration = 0.15, type = 'sine', gainValue = 0.3, slideTo = null }) {
    if (!this.context) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (err) {
      // Never let audio issues break gameplay.
      console.warn('[AudioSystem] tone playback failed', err);
    }
  }

  playFootstep() {
    this._playTone({ freq: 120, duration: 0.06, type: 'square', gainValue: 0.08 });
  }

  playCoinCollect() {
    this._playTone({ freq: 880, duration: 0.12, type: 'triangle', gainValue: 0.25, slideTo: 1400 });
  }

  playMapPieceFound() {
    this._playTone({ freq: 523, duration: 0.18, type: 'sine', gainValue: 0.3, slideTo: 784 });
  }

  playKeyFound() {
    this._playTone({ freq: 660, duration: 0.22, type: 'sawtooth', gainValue: 0.22, slideTo: 990 });
  }

  playPuzzleActivate() {
    this._playTone({ freq: 300, duration: 0.1, type: 'square', gainValue: 0.2, slideTo: 500 });
  }

  playPuzzleSuccess() {
    this._playTone({ freq: 392, duration: 0.15, type: 'triangle', gainValue: 0.3 });
    setTimeout(() => this._playTone({ freq: 523, duration: 0.2, type: 'triangle', gainValue: 0.3 }), 130);
  }

  playDoorOpen() {
    this._playTone({ freq: 90, duration: 0.6, type: 'sawtooth', gainValue: 0.18, slideTo: 60 });
  }

  playDamage() {
    this._playTone({ freq: 180, duration: 0.2, type: 'sawtooth', gainValue: 0.25, slideTo: 60 });
  }

  playJump() {
    this._playTone({ freq: 400, duration: 0.12, type: 'sine', gainValue: 0.18, slideTo: 650 });
  }

  playButtonClick() {
    this._playTone({ freq: 700, duration: 0.05, type: 'square', gainValue: 0.15 });
  }

  playTreasureOpen() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => this._playTone({ freq, duration: 0.35, type: 'triangle', gainValue: 0.28 }), i * 120);
    });
  }

  /** Starts a soft looping ocean/jungle ambience bed using filtered noise. */
  startAmbience() {
    if (!this.context || this._ambientNodes.length) return;
    try {
      const bufferSize = 2 * this.context.sampleRate;
      const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noiseSource = this.context.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      const gain = this.context.createGain();
      gain.gain.value = 0.5;

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noiseSource.start();

      this._ambientNodes.push(noiseSource);
    } catch (err) {
      console.warn('[AudioSystem] Ambience failed to start.', err);
    }
  }
}
