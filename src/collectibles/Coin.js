import * as THREE from 'three';

/**
 * Coin.js
 * ----------------------------------------------------------------------
 * Ancient coin collectible: a spinning, bobbing gold disc. CoinManager
 * owns every coin instance in the world and handles proximity pickup,
 * so Game.js just calls `coinManager.update(dt, playerPosition)` each
 * frame and reacts to the returned pickup count.
 */

const coinGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 14);
const coinMaterial = new THREE.MeshStandardMaterial({
  color: '#ffd75e',
  metalness: 0.75,
  roughness: 0.25,
  emissive: '#a8790f',
  emissiveIntensity: 0.15
});

export class CoinManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {{mesh: THREE.Mesh, collected: boolean}[]} */
    this.coins = [];
  }

  /** Spawns coins at the given world positions (already ground-adjusted). */
  spawnAt(positions) {
    for (const pos of positions) {
      const mesh = new THREE.Mesh(coinGeometry, coinMaterial);
      mesh.position.copy(pos);
      mesh.position.y += 0.6;
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.coins.push({ mesh, collected: false, bobOffset: Math.random() * Math.PI * 2 });
    }
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} playerPosition
   * @param {number} pickupRadius
   * @returns {number} coins collected this frame
   */
  update(dt, playerPosition, pickupRadius = 1.1) {
    let collectedCount = 0;
    const t = performance.now() * 0.001;
    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.mesh.rotation.z += dt * 2.2;
      coin.mesh.position.y += Math.sin(t * 2 + coin.bobOffset) * 0.0025;

      const dist = coin.mesh.position.distanceTo(playerPosition);
      if (dist < pickupRadius) {
        coin.collected = true;
        coin.mesh.visible = false;
        this.scene.remove(coin.mesh);
        collectedCount++;
      }
    }
    return collectedCount;
  }

  get remaining() {
    return this.coins.filter((c) => !c.collected).length;
  }
}
