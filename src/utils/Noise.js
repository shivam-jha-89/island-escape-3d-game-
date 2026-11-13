/**
 * Noise.js
 * ----------------------------------------------------------------------
 * A tiny, dependency-free 2D value-noise generator with fractal (fBm)
 * summation. This is deliberately simple (not full Perlin/Simplex) but
 * gives smooth, natural-looking height variation for procedural terrain
 * without pulling in an external noise library.
 *
 * Deterministic: seeding guarantees the same island is generated on every
 * run unless the seed is changed, which makes debugging and screenshots
 * reproducible.
 */

/**
 * Simple mulberry32 PRNG — fast, deterministic, good enough for terrain.
 * @param {number} seed
 * @returns {() => number} function returning floats in [0, 1)
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ValueNoise2D {
  /**
   * @param {number} seed - deterministic seed for reproducible islands
   * @param {number} gridSize - resolution of the base permutation grid
   */
  constructor(seed = 1337, gridSize = 256) {
    this.gridSize = gridSize;
    const rand = mulberry32(seed);
    this.gradients = new Float32Array(gridSize * gridSize);
    for (let i = 0; i < this.gradients.length; i++) {
      this.gradients[i] = rand();
    }
  }

  _sample(ix, iy) {
    const gx = ((ix % this.gridSize) + this.gridSize) % this.gridSize;
    const gy = ((iy % this.gridSize) + this.gridSize) % this.gridSize;
    return this.gradients[gy * this.gridSize + gx];
  }

  static _smooth(t) {
    return t * t * (3 - 2 * t);
  }

  /** Bilinear-interpolated base noise in [0, 1]. */
  noise2D(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = ValueNoise2D._smooth(x - x0);
    const ty = ValueNoise2D._smooth(y - y0);

    const v00 = this._sample(x0, y0);
    const v10 = this._sample(x0 + 1, y0);
    const v01 = this._sample(x0, y0 + 1);
    const v11 = this._sample(x0 + 1, y0 + 1);

    const a = v00 + (v10 - v00) * tx;
    const b = v01 + (v11 - v01) * tx;
    return a + (b - a) * ty;
  }

  /**
   * Fractal Brownian Motion: sums several octaves of noise for
   * natural-looking, multi-scale terrain variation.
   * @returns {number} value roughly in [0, 1]
   */
  fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let amplitude = 0.5;
    let frequency = 1.0;
    let sum = 0;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxAmp += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / maxAmp;
  }
}
