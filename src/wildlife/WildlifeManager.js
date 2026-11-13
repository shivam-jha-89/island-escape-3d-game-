import * as THREE from 'three';

/**
 * WildlifeManager.js
 * ----------------------------------------------------------------------
 * Adds simple stylized wildlife (birds circling overhead, butterflies
 * fluttering near the jungle, crabs skittering on the beach, fish
 * darting in the shallows) purely for atmosphere. No pathfinding/AI —
 * each creature follows a cheap procedural curve, which is all the
 * assignment calls for ("do not need advanced AI").
 */
export class WildlifeManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.birds = [];
    this.butterflies = [];
    this.crabs = [];
    this.fish = [];

    this._buildBirds();
    this._buildButterflies();
    this._buildCrabs();
    this._buildFish();
  }

  _buildBirds() {
    const mat = new THREE.MeshStandardMaterial({ color: '#f4f1e6', flatShading: true });
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), mat);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      const wingGeo = new THREE.PlaneGeometry(0.6, 0.18);
      const wingL = new THREE.Mesh(wingGeo, mat);
      wingL.position.x = -0.3;
      const wingR = new THREE.Mesh(wingGeo, mat);
      wingR.position.x = 0.3;
      group.add(wingL, wingR);

      group.userData = {
        radius: 20 + Math.random() * 30,
        height: 22 + Math.random() * 10,
        speed: 0.15 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        wingL,
        wingR
      };
      this.scene.add(group);
      this.birds.push(group);
    }
  }

  _buildButterflies() {
    const colors = ['#ff9d3f', '#4ad3ff', '#ff6fae'];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        flatShading: true,
        side: THREE.DoubleSide
      });
      const group = new THREE.Group();
      const wingGeo = new THREE.CircleGeometry(0.12, 6);
      const wingL = new THREE.Mesh(wingGeo, mat);
      wingL.position.x = -0.1;
      const wingR = new THREE.Mesh(wingGeo, mat);
      wingR.position.x = 0.1;
      group.add(wingL, wingR);

      group.position.set((Math.random() - 0.5) * 60 + 10, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 60 + 20);
      group.userData = {
        origin: group.position.clone(),
        radius: 2 + Math.random() * 3,
        speed: 0.6 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        wingL,
        wingR
      };
      this.scene.add(group);
      this.butterflies.push(group);
    }
  }

  _buildCrabs() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#d9603f', flatShading: true });
    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), bodyMat);
      body.scale.set(1, 0.6, 1.2);
      group.add(body);
      for (const side of [-1, 1]) {
        for (let l = 0; l < 3; l++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), bodyMat);
          leg.position.set(side * 0.22, -0.05, (l - 1) * 0.12);
          leg.rotation.z = side * 0.9;
          group.add(leg);
        }
      }
      const angle = Math.random() * Math.PI * 2;
      const radius = 92 + Math.random() * 8;
      group.position.set(Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius);
      group.userData = {
        angle,
        radius,
        speed: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2
      };
      this.scene.add(group);
      this.crabs.push(group);
    }
  }

  _buildFish() {
    const mat = new THREE.MeshStandardMaterial({ color: '#4ad3ff', flatShading: true, emissive: '#0a4f66', emissiveIntensity: 0.2 });
    for (let i = 0; i < 8; i++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), mat);
      fish.rotation.z = Math.PI / 2;
      fish.position.set((Math.random() - 0.5) * 100, -0.6, (Math.random() - 0.5) * 100 + 60);
      fish.userData = {
        origin: fish.position.clone(),
        radius: 2 + Math.random() * 3,
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      };
      this.scene.add(fish);
      this.fish.push(fish);
    }
  }

  update(dt) {
    const t = performance.now() * 0.001;

    for (const bird of this.birds) {
      const u = bird.userData;
      u.phase += dt * u.speed;
      bird.position.set(Math.cos(u.phase) * u.radius, u.height, Math.sin(u.phase) * u.radius);
      bird.rotation.y = -u.phase + Math.PI / 2;
      const flap = Math.sin(t * 10 + u.phase) * 0.5;
      u.wingL.rotation.z = flap;
      u.wingR.rotation.z = -flap;
    }

    for (const bfly of this.butterflies) {
      const u = bfly.userData;
      u.phase += dt * u.speed;
      bfly.position.x = u.origin.x + Math.cos(u.phase) * u.radius;
      bfly.position.z = u.origin.z + Math.sin(u.phase * 1.3) * u.radius;
      bfly.position.y = u.origin.y + Math.sin(u.phase * 2) * 0.3;
      const flap = Math.sin(t * 14 + u.phase) * 0.8;
      u.wingL.rotation.y = flap;
      u.wingR.rotation.y = -flap;
    }

    for (const crab of this.crabs) {
      const u = crab.userData;
      u.phase += dt * (1.5 + Math.random() * 0.1);
      u.angle += u.speed * dt * 0.2;
      crab.position.x = Math.cos(u.angle) * u.radius + Math.sin(u.phase) * 0.6;
      crab.position.z = Math.sin(u.angle) * u.radius + Math.cos(u.phase) * 0.6;
    }

    for (const fish of this.fish) {
      const u = fish.userData;
      u.phase += dt * u.speed;
      fish.position.x = u.origin.x + Math.cos(u.phase) * u.radius;
      fish.position.z = u.origin.z + Math.sin(u.phase) * u.radius;
      fish.rotation.y = -u.phase;
    }
  }
}
