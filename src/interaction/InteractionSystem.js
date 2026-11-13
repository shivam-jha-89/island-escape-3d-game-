/**
 * InteractionSystem.js
 * ----------------------------------------------------------------------
 * A single, reusable proximity-interaction manager. Any interactive
 * object (map piece, key, ancient symbol, door, treasure chest, puzzle
 * mechanism) registers itself with a world position, a radius, and an
 * onInteract callback. Each frame the system finds the closest
 * in-range, not-yet-consumed interactable to the player and shows the
 * "PRESS E TO INTERACT" prompt; pressing E fires its callback.
 *
 * This avoids duplicating "am I near X" distance-check logic across
 * every collectible/puzzle file.
 */
export class InteractionSystem {
  /** @param {import('../utils/EventBus.js').EventBus} eventBus */
  constructor(eventBus) {
    this.eventBus = eventBus;
    /** @type {Array<{id:string, position: import('three').Vector3, radius: number, label: string, onInteract: Function, enabled: boolean, consumed: boolean}>} */
    this.interactables = [];
    this._nearby = null;
    this._promptVisible = false;
  }

  register({ id, position, radius = 2.2, label = 'Interact', onInteract, enabled = true }) {
    const entry = { id, position, radius, label, onInteract, enabled, consumed: false };
    this.interactables.push(entry);
    return entry;
  }

  unregister(id) {
    this.interactables = this.interactables.filter((i) => i.id !== id);
  }

  /**
   * @param {import('three').Vector3} playerPosition
   * @param {boolean} interactPressed
   */
  update(playerPosition, interactPressed) {
    let closest = null;
    let closestDist = Infinity;

    for (const item of this.interactables) {
      if (!item.enabled || item.consumed) continue;
      const dist = item.position.distanceTo(playerPosition);
      if (dist <= item.radius && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }

    this._nearby = closest;
    const shouldShowPrompt = !!closest;
    if (shouldShowPrompt !== this._promptVisible) {
      this._promptVisible = shouldShowPrompt;
      this.eventBus.emit('interaction:prompt-visibility', shouldShowPrompt);
    }

    if (closest && interactPressed) {
      closest.onInteract();
    }
  }
}
