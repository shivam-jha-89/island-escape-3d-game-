import * as THREE from 'three';

const WALK_SPEED = 4.2;
const RUN_SPEED = 7.6;
const TURN_SPEED = 3.4; // radians/sec when turning in place (A/D without camera-relative strafing)
const GRAVITY = -22;
const JUMP_VELOCITY = 8.2;

/**
 * PlayerController.js
 * ----------------------------------------------------------------------
 * Converts raw input (keyboard or touch) into player movement, applying:
 *   - Fixed, unambiguous tank-style controls, always relative to the
 *     character's OWN facing direction (never the camera):
 *       Up / W     -> move forward (in the direction the player faces)
 *       Down / S   -> move backward
 *       Left / A   -> turn the character left (counter-clockwise)
 *       Right / D  -> turn the character right (clockwise)
 *       Space/Enter -> jump
 *   - Gravity + jumping with terrain-height grounding.
 *   - Simple circle-vs-circle collision against island prop colliders
 *     (trees/rocks/pillars) so the player can't walk through them.
 */
export class PlayerController {
  /**
   * @param {import('./Player.js').Player} player
   * @param {import('../world/Island.js').Island} island
   * @param {import('../input/KeyboardInput.js').KeyboardInput} keyboard
   * @param {import('../input/TouchInput.js').TouchInput} touch
   */
  constructor(player, island, keyboard, touch) {
    this.player = player;
    this.island = island;
    this.keyboard = keyboard;
    this.touch = touch;

    this.velocityY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.animState = 'idle';

    // Start on the beach, facing the island interior.
    this.player.root.position.set(0, 0, 85);
    this.player.root.rotation.y = Math.PI;

    this._forward = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
  }

  get position() {
    return this.player.root.position;
  }

  /**
   * @param {number} dt
   * @param {THREE.Camera} camera - used to compute camera-relative movement
   * @returns {{jumped: boolean, interacted: boolean, pausePressed: boolean}}
   */
  update(dt, camera) {
    const input = this._mergedInput();

    // Left/Right ALWAYS turn the character in place, regardless of
    // whether it's moving forward/backward at the same time. This is the
    // classic, predictable "tank control" scheme and can never flip,
    // since it never depends on the camera's orientation.
    if (input.left) this.player.root.rotation.y += TURN_SPEED * dt;
    if (input.right) this.player.root.rotation.y -= TURN_SPEED * dt;

    // The player's own forward direction on the XZ plane, derived purely
    // from its current facing (rotation.y). Up/W always walks the way the
    // character is currently facing; Down/S always walks backward from it.
    this._forward.set(
      Math.sin(this.player.root.rotation.y),
      0,
      Math.cos(this.player.root.rotation.y)
    );

    this._moveDir.set(0, 0, 0);
    if (input.forward) this._moveDir.add(this._forward);
    if (input.backward) this._moveDir.sub(this._forward);

    const isMoving = this._moveDir.lengthSq() > 0.0001;
    const running = input.running && isMoving;
    const speed = running ? RUN_SPEED : WALK_SPEED;

    if (isMoving) {
      this._moveDir.normalize();
      const proposed = this.player.root.position.clone().addScaledVector(this._moveDir, speed * dt);
      this._resolveCollisions(proposed);
      this.player.root.position.x = proposed.x;
      this.player.root.position.z = proposed.z;
      // Note: no re-orientation here on purpose — the character already
      // faces the direction it's walking (forward or backward), so the
      // camera behind it stays stable instead of swinging around.
    }

    // Gravity + jump.
    const groundHeight = this.island.getGroundHeight(this.player.root.position.x, this.player.root.position.z);
    const jumped = input.jumped && this.isGrounded;
    if (jumped) {
      this.velocityY = JUMP_VELOCITY;
      this.isGrounded = false;
      this.isJumping = true;
    }

    this.velocityY += GRAVITY * dt;
    this.player.root.position.y += this.velocityY * dt;

    if (this.player.root.position.y <= groundHeight) {
      this.player.root.position.y = groundHeight;
      this.velocityY = 0;
      this.isGrounded = true;
      this.isJumping = false;
    }

    // Determine animation state.
    if (this.isJumping) this.animState = 'jump';
    else if (isMoving) this.animState = running ? 'run' : 'walk';
    else this.animState = 'idle';
    this.player.updateAnimation(dt, this.animState);

    return { jumped, interacted: input.interacted, pausePressed: input.pausePressed, isMoving, running };
  }

  _resolveCollisions(proposedPosition) {
    const playerRadius = 0.4;
    for (const collider of this.island.colliders) {
      const dx = proposedPosition.x - collider.position.x;
      const dz = proposedPosition.z - collider.position.z;
      const minDist = collider.radius + playerRadius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 0.0000001) {
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist);
        proposedPosition.x += (dx / dist) * push;
        proposedPosition.z += (dz / dist) * push;
      }
    }
  }

  _mergedInput() {
    // Merge keyboard + touch so both are usable simultaneously (e.g. a
    // tablet with an attached keyboard).
    const kb = this.keyboard;
    const tc = this.touch;
    return {
      forward: kb.forward || (tc && tc.forward),
      backward: kb.backward || (tc && tc.backward),
      left: kb.left || (tc && tc.left),
      right: kb.right || (tc && tc.right),
      running: kb.running || (tc && tc.running),
      jumped: kb.consumeJump() || (tc && tc.consumeJump()),
      interacted: kb.consumeInteract() || (tc && tc.consumeInteract()),
      pausePressed: kb.consumePause() || (tc && tc.consumePause())
    };
  }
}
