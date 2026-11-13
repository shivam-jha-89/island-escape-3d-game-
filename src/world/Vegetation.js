import * as THREE from 'three';

/**
 * Vegetation.js
 * ----------------------------------------------------------------------
 * Builds stylized low-poly palm trees, jungle canopy trees, bushes, and
 * rocks entirely from Three.js primitive geometry (cones, cylinders,
 * icosahedrons) — no external models/textures, per the "no broken
 * external dependencies" requirement.
 *
 * Each factory returns a THREE.Group so callers can position/rotate/
 * scale the whole prop as one unit, and each group carries a
 * `collisionRadius` used by the CollisionSystem to block the player.
 */

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function createPalmTree() {
  const group = new THREE.Group();
  const trunkHeight = randRange(4.5, 6.5);

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, trunkHeight, 6);
  // Slight curve: shear the top vertices for a leaning palm look.
  const pos = trunkGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + trunkHeight / 2) / trunkHeight;
    pos.setX(i, pos.getX(i) + t * t * 1.1);
  }
  trunkGeo.computeVertexNormals();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a6239', flatShading: true, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const frondMat = new THREE.MeshStandardMaterial({ color: '#3c9a4d', flatShading: true, roughness: 0.85, side: THREE.DoubleSide });
  const frondCount = 6;
  const crownTop = new THREE.Vector3(1.1, trunkHeight, 0);
  for (let i = 0; i < frondCount; i++) {
    const frondGeo = new THREE.ConeGeometry(0.5, 3.6, 4, 1, true);
    frondGeo.translate(0, 1.8, 0);
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.copy(crownTop);
    const angle = (i / frondCount) * Math.PI * 2;
    frond.rotation.z = Math.PI / 2.4;
    frond.rotation.y = angle;
    frond.castShadow = true;
    group.add(frond);
  }

  // A couple of coconuts for detail.
  const coconutMat = new THREE.MeshStandardMaterial({ color: '#4a3423', flatShading: true });
  for (let i = 0; i < 2; i++) {
    const coconut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), coconutMat);
    coconut.position.copy(crownTop).add(new THREE.Vector3(randRange(-0.3, 0.3), -0.2, randRange(-0.3, 0.3)));
    group.add(coconut);
  }

  group.userData.collisionRadius = 0.6;
  group.userData.propType = 'palm_tree';
  return group;
}

export function createJungleTree() {
  const group = new THREE.Group();
  const trunkHeight = randRange(5, 8);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, trunkHeight, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5b4331', flatShading: true, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const canopyMat = new THREE.MeshStandardMaterial({ color: '#1f6b3a', flatShading: true, roughness: 0.85 });
  const canopyLayers = 3;
  for (let i = 0; i < canopyLayers; i++) {
    const radius = 2.6 - i * 0.6;
    const height = 2.4;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), canopyMat);
    canopy.position.y = trunkHeight - 0.5 + i * 1.4;
    canopy.castShadow = true;
    group.add(canopy);
  }

  group.userData.collisionRadius = 1.1;
  group.userData.propType = 'jungle_tree';
  return group;
}

export function createRock(scale = 1) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(randRange(0.8, 1.6) * scale, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) * randRange(0.85, 1.15),
      pos.getY(i) * randRange(0.7, 1.0),
      pos.getZ(i) * randRange(0.85, 1.15)
    );
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#8a7c6b', flatShading: true, roughness: 1.0 });
  const rock = new THREE.Mesh(geo, mat);
  rock.castShadow = true;
  rock.receiveShadow = true;
  rock.rotation.set(randRange(0, Math.PI), randRange(0, Math.PI), randRange(0, Math.PI));
  group.add(rock);

  group.userData.collisionRadius = 1.0 * scale;
  group.userData.propType = 'rock';
  return group;
}

export function createBush() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#2f7d43', flatShading: true, roughness: 0.9 });
  const clusters = 3;
  for (let i = 0; i < clusters; i++) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(randRange(0.4, 0.7), 0), mat);
    mesh.position.set(randRange(-0.3, 0.3), randRange(0.2, 0.5), randRange(-0.3, 0.3));
    mesh.castShadow = true;
    group.add(mesh);
  }
  group.userData.collisionRadius = 0.5;
  group.userData.propType = 'bush';
  return group;
}

/** A poisonous-looking plant used as a hazard visual. */
export function createPoisonPlant() {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4a2f5c', flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#7b2fbf',
    flatShading: true,
    emissive: '#3a0e5c',
    emissiveIntensity: 0.4
  });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.0, 4), leafMat);
    const angle = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.3, 0.5, Math.sin(angle) * 0.3);
    leaf.rotation.z = Math.PI;
    leaf.rotation.y = angle;
    group.add(leaf);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 5), stemMat);
  stem.position.y = 0.25;
  group.add(stem);

  group.userData.collisionRadius = 0.5;
  group.userData.propType = 'poison_plant';
  group.userData.isHazard = true;
  group.userData.damage = 8;
  return group;
}
