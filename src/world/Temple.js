import * as THREE from 'three';

/**
 * Temple.js
 * ----------------------------------------------------------------------
 * Builds the Treasure Temple: the final destination. A stepped stone
 * pyramid with a sealed door (opens once map pieces + key + puzzles are
 * complete) leading to an inner chamber holding the treasure chest.
 */
export function createTemple() {
  const group = new THREE.Group();
  group.name = 'TreasureTemple';

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#c9b184', flatShading: true, roughness: 0.9 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: '#7a6647', flatShading: true, roughness: 0.9 });

  // Stepped pyramid base (3 tiers).
  const tiers = [
    { size: 14, height: 1.4 },
    { size: 10, height: 1.4 },
    { size: 6, height: 1.4 }
  ];
  let currentY = 0;
  for (const tier of tiers) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(tier.size, tier.height, tier.size), stoneMat);
    step.position.y = currentY + tier.height / 2;
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
    currentY += tier.height;
  }

  // Inner chamber walls (simple box shell open at the front) sitting atop the tiers.
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), darkStoneMat);
  chamber.position.y = currentY + 2;
  chamber.castShadow = true;
  chamber.receiveShadow = true;
  group.add(chamber);

  // Ancient door on the chamber's front face.
  const doorGroup = new THREE.Group();
  const doorMat = new THREE.MeshStandardMaterial({ color: '#4a4438', flatShading: true });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.35), doorMat);
  door.position.set(0, currentY + 1.7, 2.55);
  doorGroup.add(door);

  const goldTrimMat = new THREE.MeshStandardMaterial({ color: '#ffcb47', emissive: '#ffcb47', emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.4 });
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 20), goldTrimMat);
  trim.position.set(0, currentY + 1.9, 2.75);
  doorGroup.add(trim);
  group.add(doorGroup);

  // Treasure chest inside the chamber (revealed once the door opens).
  const chestGroup = new THREE.Group();
  const chestBaseMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', flatShading: true, roughness: 0.8 });
  const chestGoldMat = new THREE.MeshStandardMaterial({ color: '#ffcb47', metalness: 0.7, roughness: 0.25, emissive: '#ffb347', emissiveIntensity: 0.25 });

  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.0), chestBaseMat);
  chestBase.position.y = 0.45;
  chestGroup.add(chestBase);

  const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.0, 8, 1, false, 0, Math.PI), chestBaseMat);
  chestLid.rotation.z = Math.PI / 2;
  chestLid.rotation.y = Math.PI / 2;
  chestLid.scale.set(1, 0.55, 1);
  chestLid.position.set(0, 0.9, 0);
  chestGroup.add(chestLid);

  const trimFront = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 1.05), chestGoldMat);
  trimFront.position.y = 0.5;
  chestGroup.add(trimFront);

  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.15), chestGoldMat);
  lock.position.set(0, 0.75, 0.52);
  chestGroup.add(lock);

  chestGroup.position.set(0, currentY, 0);
  chestGroup.userData.lid = chestLid;
  group.add(chestGroup);

  // Point light glow above the chest to sell "glowing treasure".
  const glow = new THREE.PointLight(0xffd75e, 0, 8, 2);
  glow.position.set(0, currentY + 1.5, 0);
  group.add(glow);

  return { group, doorGroup, door, chestGroup, chestLid: chestGroup.userData.lid, glow, topY: currentY };
}
