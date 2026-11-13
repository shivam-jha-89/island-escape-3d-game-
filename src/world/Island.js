import * as THREE from 'three';
import { Terrain } from './Terrain.js';
import { Ocean } from './Ocean.js';
import { createPalmTree, createJungleTree, createRock, createBush, createPoisonPlant } from './Vegetation.js';
import { createRuins } from './Ruins.js';
import { createCave } from './Cave.js';
import { createTemple } from './Temple.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Island.js
 * ----------------------------------------------------------------------
 * Top-level world builder. Composes Terrain + Ocean + vegetation +
 * landmarks (ruins / cave / temple) + a connecting bridge into one
 * scene graph, and records the world-space "areas" (with center +
 * radius) that the rest of the game (quests, ambience, fog) uses to
 * know which zone the player is currently in.
 */
export class Island {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Island';
    scene.add(this.group);

    this.colliders = []; // { position: Vector3, radius: number }
    this.hazards = []; // { position, radius, damage }

    this.terrain = new Terrain(240, 160, 20260823);
    this.group.add(this.terrain.mesh);

    this.ocean = new Ocean(900);
    this.group.add(this.ocean.mesh);

    this._defineAreas();
    this._buildBridge();
    this._buildLandmarks();
    this._scatterVegetation();
    this._buildTreasureMapPieceSpots();
  }

  getGroundHeight(x, z) {
    return this.terrain.getHeightAt(x, z);
  }

  _placeOnGround(object, x, z, yOffset = 0) {
    const y = this.getGroundHeight(x, z);
    object.position.set(x, y + yOffset, z);
    return y;
  }

  _defineAreas() {
    this.areas = {
      beach: { name: 'Beach', center: new THREE.Vector3(0, 0, 85), radius: 30 },
      jungle: { name: 'Jungle', center: new THREE.Vector3(10, 0, 20), radius: 45 },
      ruins: { name: 'Ancient Ruins', center: new THREE.Vector3(-48, 0, -6), radius: 16 },
      cave: { name: 'Mysterious Cave', center: new THREE.Vector3(46, 0, -32), radius: 16 },
      temple: { name: 'Treasure Temple', center: new THREE.Vector3(0, 0, -78), radius: 20 }
    };
  }

  /** Determines which named area a world position currently falls within. */
  getAreaAt(position) {
    for (const [key, area] of Object.entries(this.areas)) {
      if (position.distanceTo(area.center) <= area.radius) return key;
    }
    return null;
  }

  _buildBridge() {
    // Wooden bridge spanning the carved river channel, roughly along the
    // path from the beach/jungle toward the ruins.
    const bridgeGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: '#8a6239', flatShading: true, roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#5b4331', flatShading: true });

    const length = 14;
    const plankCount = 12;
    const startX = -20;
    const endX = -6;
    const z = 5;

    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const x = startX + (endX - startX) * t;
      const groundY = this.getGroundHeight(x, z);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.1), plankMat);
      plank.position.set(x, groundY + 1.6, z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridgeGroup.add(plank);
    }

    // Rope rails.
    for (const side of [-0.65, 0.65]) {
      const railGeo = new THREE.CylinderGeometry(0.05, 0.05, length, 5);
      railGeo.rotateZ(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, ropeMat);
      rail.position.set((startX + endX) / 2, this.getGroundHeight((startX + endX) / 2, z) + 2.1, z + side);
      bridgeGroup.add(rail);
    }

    // Support posts at each end.
    for (const x of [startX, endX]) {
      for (const side of [-0.65, 0.65]) {
        const groundY = this.getGroundHeight(x, z + side);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), ropeMat);
        post.position.set(x, groundY + 1.1, z + side);
        bridgeGroup.add(post);
      }
    }

    this.group.add(bridgeGroup);
    this.bridge = bridgeGroup;
  }

  _buildLandmarks() {
    // ---- Ancient Ruins ----
    const ruins = createRuins();
    const ruinsGroundY = this.getGroundHeight(this.areas.ruins.center.x, this.areas.ruins.center.z);
    ruins.group.position.set(this.areas.ruins.center.x, ruinsGroundY, this.areas.ruins.center.z);
    this.group.add(ruins.group);
    this.ruins = ruins;

    // ---- Mysterious Cave ----
    const cave = createCave();
    const caveGroundY = this.getGroundHeight(this.areas.cave.center.x, this.areas.cave.center.z);
    cave.group.position.set(this.areas.cave.center.x, caveGroundY, this.areas.cave.center.z);
    this.group.add(cave.group);
    this.cave = cave;

    // ---- Treasure Temple ----
    const temple = createTemple();
    const templeGroundY = this.getGroundHeight(this.areas.temple.center.x, this.areas.temple.center.z);
    temple.group.position.set(this.areas.temple.center.x, templeGroundY, this.areas.temple.center.z);
    this.group.add(temple.group);
    this.temple = temple;

    // ---- Waterfall: an animated translucent plane cascading down a cliff
    // near the jungle/ruins boundary, paired with mist particles (added by Game.js).
    const waterfallMat = new THREE.MeshStandardMaterial({
      color: '#bdeff5',
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.1
    });
    const waterfallGeo = new THREE.PlaneGeometry(3.2, 9, 1, 12);
    const waterfall = new THREE.Mesh(waterfallGeo, waterfallMat);
    const wfX = -30;
    const wfZ = -2;
    const wfGroundY = this.getGroundHeight(wfX, wfZ);
    waterfall.position.set(wfX, wfGroundY + 4.5, wfZ);
    waterfall.rotation.y = Math.PI / 2;
    this.group.add(waterfall);
    this.waterfall = waterfall;
    this.waterfallBase = new THREE.Vector3(wfX, wfGroundY, wfZ);
  }

  _scatterVegetation() {
    const halfSize = this.terrain.size / 2 - 6;

    const isNearLandmark = (x, z, buffer = 8) => {
      for (const area of Object.values(this.areas)) {
        if (Math.hypot(x - area.center.x, z - area.center.z) < area.radius + buffer) return true;
      }
      return false;
    };

    // Palm trees along the beach ring.
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = randRange(halfSize - 20, halfSize - 4);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const groundY = this.getGroundHeight(x, z);
      if (groundY < -1 || groundY > 2 || isNearLandmark(x, z, 4)) continue;
      const palm = createPalmTree();
      palm.position.set(x, groundY, z);
      palm.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(palm);
      this.colliders.push({ position: palm.position.clone(), radius: palm.userData.collisionRadius });
    }

    // Jungle trees + bushes across the interior "Jungle" area and beyond.
    for (let i = 0; i < 55; i++) {
      const x = randRange(-halfSize + 10, halfSize - 10);
      const z = randRange(-halfSize + 10, halfSize - 10);
      const groundY = this.getGroundHeight(x, z);
      if (groundY < 0.6 || groundY > 8 || isNearLandmark(x, z)) continue;

      const isBush = Math.random() < 0.35;
      const prop = isBush ? createBush() : createJungleTree();
      prop.position.set(x, groundY, z);
      prop.rotation.y = Math.random() * Math.PI * 2;
      const scale = randRange(0.8, 1.3);
      prop.scale.setScalar(scale);
      this.group.add(prop);
      this.colliders.push({ position: prop.position.clone(), radius: prop.userData.collisionRadius * scale });
    }

    // Rocks scattered near the mountain / rocky bands.
    for (let i = 0; i < 24; i++) {
      const x = randRange(-halfSize + 5, halfSize - 5);
      const z = randRange(-halfSize + 5, halfSize - 5);
      const groundY = this.getGroundHeight(x, z);
      if (groundY < 2 || isNearLandmark(x, z, 4)) continue;
      const rock = createRock(randRange(0.8, 1.6));
      rock.position.set(x, groundY, z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(rock);
      this.colliders.push({ position: rock.position.clone(), radius: rock.userData.collisionRadius });
    }

    // Poison plant hazards within the jungle area.
    this.hazardProps = [];
    for (let i = 0; i < 9; i++) {
      const area = this.areas.jungle;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * area.radius;
      const x = area.center.x + Math.cos(angle) * radius;
      const z = area.center.z + Math.sin(angle) * radius;
      const groundY = this.getGroundHeight(x, z);
      if (groundY < 0.3 || isNearLandmark(x, z, 6)) continue;
      const plant = createPoisonPlant();
      plant.position.set(x, groundY, z);
      this.group.add(plant);
      this.hazards.push({ position: plant.position.clone(), radius: 0.9, damage: plant.userData.damage, type: 'poison_plant' });
      this.hazardProps.push(plant);
    }
  }

  _buildTreasureMapPieceSpots() {
    // World-space spots (populated with MapPiece collectibles by Game.js);
    // exposed here so collectible placement stays anchored to real terrain
    // height rather than guessed coordinates.
    const spots = [
      { x: 22, z: 40 },
      { x: -15, z: -25 },
      { x: 46, z: 5 }
    ];
    this.mapPieceSpots = spots.map(({ x, z }) => {
      const y = this.getGroundHeight(x, z);
      return new THREE.Vector3(x, y, z);
    });
  }

  update(dt) {
    this.ocean.update(dt);

    // Animate the waterfall by scrolling its UVs for a falling-water feel.
    if (this.waterfall) {
      this.waterfall.position.y = this.waterfallBase.y + 4.5;
      this.waterfall.material.opacity = 0.5 + Math.sin(performance.now() * 0.004) * 0.05;
    }

    // Flicker cave torches.
    if (this.cave) {
      for (const torch of this.cave.torches) {
        const flicker = 2.6 + Math.random() * 1.2;
        torch.light.intensity = flicker;
        torch.flame.scale.y = 0.9 + Math.random() * 0.3;
      }
    }
  }
}
