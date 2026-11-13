/**
 * EventBus.js
 * ----------------------------------------------------------------------
 * A minimal publish/subscribe event bus. Decouples systems (e.g. the
 * QuestSystem doesn't need a direct reference to the HUD; it just emits
 * "quest:updated" and the UI layer listens for it). This keeps the
 * architecture modular and testable.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} eventName
   * @param {(payload?: any) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(eventName, handler) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this._listeners.get(eventName)?.delete(handler);
  }

  /**
   * Emit an event to all subscribers. Errors in one handler are caught
   * and logged so a single bad listener can't crash the whole game loop.
   */
  emit(eventName, payload) {
    const handlers = this._listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${eventName}" threw:`, err);
      }
    }
  }
}
