import * as THREE from 'three';

/**
 * Ruins.js
 * ----------------------------------------------------------------------
 * Builds the Ancient Ruins landmark: a broken stone courtyard with four
 * standing pillars, a locked stone gate, and three glowing symbol
 * pedestals used by the SymbolPuzzle. Returns both the visual group and
 * references to the interactive pieces so gameplay systems can wire up
 * logic without re-traversing the scene graph.
 */
export function createRuins() {
  const group = new THREE.Group();
  group.name = 'AncientRuins';

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#9c9484', flatShading: true, roughness: 0.95 });
  const mossMat = new THREE.MeshStandardMaterial({ color: '#6f8a5a', flatShading: true, roughness: 1 });

  // Courtyard floor.
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 0.6, 8), stoneMat);
  floor.position.y = 0.3;
  floor.receiveShadow = true;
  group.add(floor);

  // Four broken pillars around the courtyard.
  const pillarPositions = [
    [-6, 0, -6], [6, 0, -6], [-6, 0, 6], [6, 0, 6]
  ];
  for (const [x, , z] of pillarPositions) {
    const height = 3 + Math.random() * 2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, height, 8), stoneMat);
    pillar.position.set(x, height / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mossMat);
    cap.position.set(x, height + 0.2, z);
    group.add(cap);
  }

  // Locked gate at the back of the courtyard.
  const gateGroup = new THREE.Group();
  const gateMat = new THREE.MeshStandardMaterial({ color: '#7d7568', flatShading: true, roughness: 0.9 });
  const gateFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), gateMat);
  gateFrameLeft.position.set(-2.2, 2.5, 0);
  const gateFrameRight = gateFrameLeft.clone();
  gateFrameRight.position.set(2.2, 2.5, 0);
  const gateTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 0.8), gateMat);
  gateTop.position.set(0, 5.4, 0);
  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.6, 0.4), new THREE.MeshStandardMaterial({ color: '#4a4438', flatShading: true }));
  gateDoor.position.set(0, 2.4, 0);
  gateGroup.add(gateFrameLeft, gateFrameRight, gateTop, gateDoor);
  gateGroup.position.set(0, 0, -8.5);
  gateGroup.castShadow = true;
  group.add(gateGroup);

  // Three symbol pedestals in front of the gate (SymbolPuzzle targets).
  const symbolColors = [0xff6b4a, 0x4ad3ff, 0xffd75e];
  const symbolPedestals = [];
  const symbolXs = [-3, 0, 3];
  symbolXs.forEach((x, i) => {
    const pedestal = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.2, 6), stoneMat);
    base.position.y = 0.6;
    base.castShadow = true;
    base.receiveShadow = true;
    pedestal.add(base);

    const symbolMat = new THREE.MeshStandardMaterial({
      color: symbolColors[i],
      emissive: symbolColors[i],
      emissiveIntensity: 0.15,
      flatShading: true
    });
    const symbol = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), symbolMat);
    symbol.position.y = 1.6;
    pedestal.add(symbol);

    pedestal.position.set(x, 0.3, -3.5);
    pedestal.userData.symbolIndex = i;
    pedestal.userData.symbolMesh = symbol;
    pedestal.userData.symbolMat = symbolMat;
    pedestal.userData.baseIntensity = 0.15;
    pedestal.userData.activeIntensity = 1.1;
    group.add(pedestal);
    symbolPedestals.push(pedestal);
  });

  group.userData.collisionRadius = 0; // handled per-pillar via child colliders if needed
  return { group, gateGroup, symbolPedestals };
}
