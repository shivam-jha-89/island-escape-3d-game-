import * as THREE from 'three';

/**
 * Player.js
 * ----------------------------------------------------------------------
 * Builds a stylized low-poly explorer character out of primitive
 * geometry (head/torso/arms/legs), matching the assignment's fallback
 * requirement of "create a stylized low-poly humanoid character using
 * Three.js geometry" when external assets aren't reliable.
 *
 * Owns simple procedural animation (idle bob, walk cycle, run cycle) so
 * PlayerController only needs to report a motion state each frame.
 */
export class Player {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Player';

    this._animTime = 0;
    this._buildMesh();
  }

  _buildMesh() {
    const skinMat = new THREE.MeshStandardMaterial({ color: '#e8b07a', flatShading: true, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#ff6b4a', flatShading: true, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2f4a6b', flatShading: true, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', flatShading: true });

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.76, 0.36), shirtMat);
    this.torso.position.y = 1.28;
    this.torso.castShadow = true;
    this.root.add(this.torso);

    // Head group (allows independent head-look later if desired)
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.28 + 0.38 + 0.28;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
    head.castShadow = true;
    this.headGroup.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), hairMat);
    hair.position.y = 0.24;
    this.headGroup.add(hair);
    this.root.add(this.headGroup);

    // Arms (pivoted at shoulder for swing animation)
    this.leftArm = this._buildLimb(shirtMat, skinMat, 0.18, 0.62, true);
    this.leftArm.group.position.set(0.42, 1.62, 0);
    this.root.add(this.leftArm.group);

    this.rightArm = this._buildLimb(shirtMat, skinMat, 0.18, 0.62, true);
    this.rightArm.group.position.set(-0.42, 1.62, 0);
    this.root.add(this.rightArm.group);

    // Legs (pivoted at hip for walk cycle)
    this.leftLeg = this._buildLimb(pantsMat, pantsMat, 0.2, 0.72, false);
    this.leftLeg.group.position.set(0.18, 0.9, 0);
    this.root.add(this.leftLeg.group);

    this.rightLeg = this._buildLimb(pantsMat, pantsMat, 0.2, 0.72, false);
    this.rightLeg.group.position.set(-0.18, 0.9, 0);
    this.root.add(this.rightLeg.group);

    this.root.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = true;
    });
  }

  _buildLimb(upperMat, lowerMat, width, length) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), upperMat);
    mesh.position.y = -length / 2;
    group.add(mesh);
    return { group, mesh };
  }

  /**
   * Advances procedural animation.
   * @param {number} dt
   * @param {'idle'|'walk'|'run'|'jump'} state
   */
  updateAnimation(dt, state) {
    if (state === 'walk' || state === 'run') {
      const speedMul = state === 'run' ? 2.1 : 1.0;
      this._animTime += dt * 8 * speedMul;
      const swing = Math.sin(this._animTime) * (state === 'run' ? 0.9 : 0.6);
      this.leftArm.group.rotation.x = swing;
      this.rightArm.group.rotation.x = -swing;
      this.leftLeg.group.rotation.x = -swing;
      this.rightLeg.group.rotation.x = swing;
      this.torso.position.y = 1.28 + Math.abs(Math.sin(this._animTime)) * 0.03;
      this.headGroup.position.y = 1.28 + 0.38 + 0.28 + Math.abs(Math.sin(this._animTime)) * 0.02;
    } else if (state === 'jump') {
      this.leftArm.group.rotation.x = -0.6;
      this.rightArm.group.rotation.x = -0.6;
      this.leftLeg.group.rotation.x = 0.3;
      this.rightLeg.group.rotation.x = -0.3;
    } else {
      // Idle: gentle breathing bob.
      this._animTime += dt * 2;
      const bob = Math.sin(this._animTime) * 0.02;
      this.torso.position.y = 1.28 + bob;
      this.headGroup.position.y = 1.28 + 0.38 + 0.28 + bob;
      this.leftArm.group.rotation.x = THREE.MathUtils.lerp(this.leftArm.group.rotation.x, 0, 0.1);
      this.rightArm.group.rotation.x = THREE.MathUtils.lerp(this.rightArm.group.rotation.x, 0, 0.1);
      this.leftLeg.group.rotation.x = THREE.MathUtils.lerp(this.leftLeg.group.rotation.x, 0, 0.1);
      this.rightLeg.group.rotation.x = THREE.MathUtils.lerp(this.rightLeg.group.rotation.x, 0, 0.1);
    }
  }
}
