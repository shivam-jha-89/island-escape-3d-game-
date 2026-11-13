import * as THREE from 'three';

/**
 * ParticleSystem.js
 * ----------------------------------------------------------------------
 * A lightweight, pooled particle manager built on THREE.Points. Rather
 * than spawning a new mesh per particle (expensive), each "emitter" owns
 * a single Points object with a fixed-size buffer that is reused —
 * keeping draw calls and GC pressure low even with several concurrent
 * effects (fireflies, waterfall mist, coin sparkles, victory confetti).
 */

class ParticleEmitter {
  constructor(scene, { count, color, size, area, speed, lifetime, sizeAttenuation = true }) {
    this.scene = scene;
    this.count = count;
    this.speed = speed;
    this.lifetime = lifetime;
    this.area = area;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const ages = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._resetParticle(i, positions, velocities, ages, true);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.positions = positions;
    this.velocities = velocities;
    this.ages = ages;

    const material = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  _resetParticle(i, positions, velocities, ages, randomAge = false) {
    const [ox, oy, oz] = this.area.origin;
    const [sx, sy, sz] = this.area.size;
    positions[i * 3] = ox + (Math.random() - 0.5) * sx;
    positions[i * 3 + 1] = oy + Math.random() * sy;
    positions[i * 3 + 2] = oz + (Math.random() - 0.5) * sz;

    velocities[i * 3] = (Math.random() - 0.5) * this.speed;
    velocities[i * 3 + 1] = Math.random() * this.speed;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * this.speed;

    ages[i] = randomAge ? Math.random() * this.lifetime : 0;
  }

  update(dt) {
    const { positions, velocities, ages, count, lifetime, area } = this;
    for (let i = 0; i < count; i++) {
      ages[i] += dt;
      if (ages[i] >= lifetime) {
        this._resetParticle(i, positions, velocities, ages, false);
        continue;
      }
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      // Gentle drifting via sine wobble for a "firefly" feel.
      positions[i * 3] += Math.sin(ages[i] * 2 + i) * 0.01;
      positions[i * 3 + 2] += Math.cos(ages[i] * 2 + i) * 0.01;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    /** @type {ParticleEmitter[]} */
    this.emitters = [];
    /** @type {{points: THREE.Points, life: number, maxLife: number}[]} */
    this.bursts = [];
  }

  addFireflyField(origin, size = [20, 4, 20], count = 40) {
    const emitter = new ParticleEmitter(this.scene, {
      count,
      color: 0xfff2a8,
      size: 0.35,
      area: { origin, size },
      speed: 0.4,
      lifetime: 8
    });
    this.emitters.push(emitter);
    return emitter;
  }

  addMist(origin, size = [6, 2, 6], count = 60) {
    const emitter = new ParticleEmitter(this.scene, {
      count,
      color: 0xdfeffa,
      size: 0.6,
      area: { origin, size },
      speed: 0.6,
      lifetime: 3
    });
    this.emitters.push(emitter);
    return emitter;
  }

  addTreasureSparkle(origin, size = [3, 3, 3], count = 80) {
    const emitter = new ParticleEmitter(this.scene, {
      count,
      color: 0xffd75e,
      size: 0.4,
      area: { origin, size },
      speed: 0.8,
      lifetime: 2.2
    });
    this.emitters.push(emitter);
    return emitter;
  }

  /** One-shot burst (e.g. coin collected) — auto-removes after its lifetime. */
  spawnBurst(position, { color = 0xffd75e, count = 14, spread = 0.6, life = 0.6 } = {}) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * spread * 4;
      velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * spread * 5;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * spread * 4;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.25,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.bursts.push({ points, velocities, life, maxLife: life });
  }

  update(dt) {
    for (const emitter of this.emitters) emitter.update(dt);

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life -= dt;
      const positions = burst.points.geometry.attributes.position.array;
      for (let p = 0; p < positions.length / 3; p++) {
        positions[p * 3] += burst.velocities[p * 3] * dt;
        positions[p * 3 + 1] += (burst.velocities[p * 3 + 1] - 4) * dt; // gravity
        positions[p * 3 + 2] += burst.velocities[p * 3 + 2] * dt;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;
      burst.points.material.opacity = Math.max(0, burst.life / burst.maxLife);

      if (burst.life <= 0) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const emitter of this.emitters) emitter.dispose();
    this.emitters = [];
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
    }
    this.bursts = [];
  }
}
