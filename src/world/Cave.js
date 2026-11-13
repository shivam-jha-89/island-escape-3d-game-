import * as THREE from 'three';
import { createGoldenKeyMesh } from '../collectibles/GoldenKey.js';

/**
 * Cave.js
 * ----------------------------------------------------------------------
 * Builds the Mysterious Cave landmark: a rocky dome shell with an open
 * mouth, a handful of flickering torch point-lights, and four floor
 * pressure plates used by the PressurePlatePuzzle. The cave interior is
 * intentionally dim (handled by the caller reducing ambient light in
 * this radius conceptually via the torches being the primary light
 * source) to sell the "dark environment" requirement.
 */
export function createCave() {
  const group = new THREE.Group();
  group.name = 'MysteriousCave';

  const rockMat = new THREE.MeshStandardMaterial({ color: '#4a463f', flatShading: true, roughness: 1 });

  // Dome shell (back half of a sphere, inverted normals so we see the inside).
  const domeGeo = new THREE.SphereGeometry(11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const dome = new THREE.Mesh(domeGeo, rockMat);
  dome.material.side = THREE.BackSide;
  dome.position.y = 6;
  dome.receiveShadow = true;
  group.add(dome);

  // Cave floor.
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.5, 0.6, 10), rockMat);
  floor.position.y = -0.3;
  floor.receiveShadow = true;
  group.add(floor);

  // Scattered boulders for cover / atmosphere.
  for (let i = 0; i < 6; i++) {
    const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.6, 0), rockMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 5;
    boulder.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
    boulder.castShadow = true;
    group.add(boulder);
  }

  // Torches: a stick + flame point-light, placed around the walls.
  const torches = [];
  const torchAngles = [0.3, 1.4, 2.6, 3.9, 5.1];
  for (const angle of torchAngles) {
    const torchGroup = new THREE.Group();
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 1.6, 5),
      new THREE.MeshStandardMaterial({ color: '#5b4331', flatShading: true })
    );
    stick.position.y = 0.8;
    torchGroup.add(stick);

    const flameMat = new THREE.MeshStandardMaterial({
      color: '#ff9d3f',
      emissive: '#ff7a1f',
      emissiveIntensity: 1.2,
      flatShading: true
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), flameMat);
    flame.position.y = 1.75;
    torchGroup.add(flame);

    const light = new THREE.PointLight(0xff9d3f, 3.2, 9, 2);
    light.position.y = 1.9;
    torchGroup.add(light);

    const radius = 9.8;
    torchGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    torchGroup.lookAt(0, 0.8, 0);
    group.add(torchGroup);
    torches.push({ group: torchGroup, flame, light });
  }

  // Pressure plates for the puzzle (arranged in a square near cave center).
  const plateMat = new THREE.MeshStandardMaterial({ color: '#3a382f', flatShading: true, roughness: 0.9 });
  const platePositions = [
    [-2.2, 0, -2.2], [2.2, 0, -2.2], [-2.2, 0, 2.2], [2.2, 0, 2.2]
  ];
  const pressurePlates = [];
  platePositions.forEach(([x, , z], i) => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 8), plateMat.clone());
    plate.position.set(x, 0.08, z);
    plate.receiveShadow = true;
    plate.userData.plateIndex = i;
    plate.userData.pressed = false;
    group.add(plate);
    pressurePlates.push(plate);
  });

  // Hidden golden key resting on a small rock ledge at the back of the cave.
  const keyGroup = createGoldenKeyMesh();
  keyGroup.position.set(0, 1.1, -8.5);
  keyGroup.rotation.y = Math.PI / 4;
  group.add(keyGroup);

  return { group, torches, pressurePlates, keyGroup };
}
