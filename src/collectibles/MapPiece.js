import * as THREE from 'three';

/**
 * MapPiece.js
 * ----------------------------------------------------------------------
 * One of the 3 treasure map fragments the player must find. Rendered as
 * a rolled parchment (cylinder) with a glowing rim so it reads clearly
 * against the jungle/rock backdrop. Uses the InteractionSystem (press E)
 * rather than auto-pickup, since map pieces are meant to feel like
 * meaningful discoveries.
 */
export function createMapPieceMesh() {
  const group = new THREE.Group();
  const paperMat = new THREE.MeshStandardMaterial({ color: '#e8d9ab', roughness: 0.8, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#ffcb47',
    emissive: '#ffcb47',
    emissiveIntensity: 0.4,
    roughness: 0.4
  });

  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 10), paperMat);
  scroll.rotation.z = Math.PI / 2;
  group.add(scroll);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 6, 12), trimMat);
  ringA.position.x = -0.32;
  ringA.rotation.y = Math.PI / 2;
  group.add(ringA);

  const ringB = ringA.clone();
  ringB.position.x = 0.32;
  group.add(ringB);

  group.position.y += 0.5;
  return group;
}
