import * as THREE from 'three';
import { ValueNoise2D } from '../utils/Noise.js';

/**
 * Terrain.js
 * ----------------------------------------------------------------------
 * Procedurally generates the island's ground mesh from fractal noise,
 * shaping it into an island (radial falloff so edges sink into the
 * ocean), and vertex-colors it by height/slope to fake sand → grass →
 * rock → snow-cap bands without needing external textures.
 *
 * The same heightmap is queried at runtime (via getHeightAt) so the
 * player, camera, and props can all sit correctly on the ground —
 * terrain generation and gameplay collision share one source of truth.
 */
export class Terrain {
  /**
   * @param {number} size - world-space width/depth of the terrain plane
   * @param {number} resolution - vertices per side (higher = smoother, costlier)
   * @param {number} seed
   */
  constructor(size = 240, resolution = 180, seed = 1337) {
    this.size = size;
    this.resolution = resolution;
    this.noise = new ValueNoise2D(seed, 256);

    this.heightData = new Float32Array((resolution + 1) * (resolution + 1));
    this.mesh = this._buildMesh();
  }

  /** Island shaping function: fractal noise * radial falloff mask. */
  _computeHeight(worldX, worldZ) {
    const nx = worldX / this.size;
    const nz = worldZ / this.size;

    // Multi-octave base terrain.
    const base = this.noise.fbm(nx * 3 + 50, nz * 3 + 50, 5, 2.0, 0.5);

    // Radial falloff so the island's edges slope down into the ocean.
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ) / (this.size * 0.5);
    const falloff = THREE.MathUtils.smoothstep(1.0, 0.35, dist);

    // A gentle central peak (mountain) using a second noise field.
    const peak = Math.max(0, this.noise.fbm(nx * 1.3 + 900, nz * 1.3 + 900, 3) - 0.55) * 2.2;

    let height = (base * 1.4 - 0.35 + peak) * falloff;

    // Carve a river channel: a sine-based winding path pulled down.
    const riverPath = Math.sin(nx * 6.0) * 0.15;
    const riverDist = Math.abs(nz - riverPath - 0.05);
    if (riverDist < 0.035 && dist < 0.85) {
      const riverPull = THREE.MathUtils.smoothstep(0.035, 0.0, riverDist);
      height -= riverPull * 0.9;
    }

    return height * 14; // vertical scale
  }

  _buildMesh() {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.resolution, this.resolution);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const colorSand = new THREE.Color('#e8cf8f');
    const colorGrass = new THREE.Color('#3f8f4f');
    const colorDeepGrass = new THREE.Color('#245c30');
    const colorRock = new THREE.Color('#8a7c6b');
    const colorSnow = new THREE.Color('#f2f0e6');

    const verticesPerRow = this.resolution + 1;

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const h = this._computeHeight(x, z);
      position.setY(i, h);

      const row = Math.floor(i / verticesPerRow);
      const col = i % verticesPerRow;
      this.heightData[row * verticesPerRow + col] = h;

      // Blend vertex color by height band for a stylized low-poly look.
      const c = new THREE.Color();
      if (h < 0.4) c.copy(colorSand);
      else if (h < 3.5) c.copy(colorGrass);
      else if (h < 7.5) c.copy(colorDeepGrass);
      else if (h < 10.5) c.copy(colorRock);
      else c.copy(colorSnow);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'IslandTerrain';
    return mesh;
  }

  /**
   * Bilinearly-sampled terrain height at arbitrary world (x, z).
   * Falls back to a deep-ocean value outside the terrain bounds.
   */
  getHeightAt(worldX, worldZ) {
    const half = this.size / 2;
    if (worldX < -half || worldX > half || worldZ < -half || worldZ > half) {
      return -6;
    }
    // Recompute analytically for accuracy between grid samples — the
    // terrain function is cheap enough to evaluate directly at runtime.
    return this._computeHeight(worldX, worldZ);
  }
}
