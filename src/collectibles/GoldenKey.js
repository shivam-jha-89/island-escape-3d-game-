import * as THREE from 'three';

/**
 * GoldenKey.js
 * ----------------------------------------------------------------------
 * Factory for the golden key mesh, required to unlock the final
 * treasure. Kept as its own factory (rather than inlined where it's
 * placed) so it can be reused if a future level wants a second key, and
 * so its visual definition lives next to the other collectibles.
 */
export function createGoldenKeyMesh() {
  const group = new THREE.Group();
  const keyMat = new THREE.MeshStandardMaterial({
    color: '#ffcb47',
    emissive: '#ffcb47',
    emissiveIntensity: 0.35,
    metalness: 0.6,
    roughness: 0.3
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), keyMat);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), keyMat);
  shaft.position.x = 0.5;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.1), keyMat);
  tooth.position.set(0.8, -0.1, 0);
  group.add(ring, shaft, tooth);
  return group;
}
