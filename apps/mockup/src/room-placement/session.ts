export type RoomSessionState = "empty" | "pending" | "ready" | "disposed";
export interface RoomSessionTicket {
  complete(lease: unknown): boolean;
  fail(): boolean;
}
export interface RoomPlacementSession {
  begin(): RoomSessionTicket | null;
  getState(): RoomSessionState;
  clear(): void;
  dispose(): void;
}
interface LeaseRecord {
  release(): void;
  released: boolean;
}

/**
 * No loader, timers or resource creation. The caller supplies one exclusive lease object per
 * background/frame cohort. Never transfer the same resource to another session. This owner
 * guarantees at most one release ATTEMPT per admitted lease, not successful physical cleanup.
 */
export function createRoomPlacementSession(): RoomPlacementSession {
  let state: RoomSessionState = "empty";
  let current: object | null = null;
  let owned: LeaseRecord | null = null;
  const leases = new WeakMap<object, LeaseRecord>();
  const admitting = new WeakSet<object>();

  function release(lease: LeaseRecord | null) {
    if (!lease || lease.released) return;
    lease.released = true;
    try {
      lease.release();
    } catch {
      // No raw error exposure or implicit retry; resource cleanup may have failed.
    }
  }
  function leave(next: "empty" | "disposed") {
    if (state === "disposed") return;
    current = null;
    state = next;
    const previous = owned;
    owned = null;
    release(previous);
  }

  return {
    getState: () => state,
    clear: () => leave("empty"),
    dispose: () => leave("disposed"),
    begin() {
      if (state === "disposed") return null;
      const key = {};
      current = key;
      state = "pending";
      const previous = owned;
      owned = null;
      release(previous);
      const fail = () => {
        if (current !== key || state !== "pending") return false;
        current = null;
        state = "empty";
        return true;
      };
      return Object.freeze({
        fail,
        complete(value: unknown) {
          let lease: LeaseRecord;
          try {
            if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
            // A duplicate delivery cannot destroy the live resource or adopt a released one.
            if (leases.has(value) || admitting.has(value)) return false;
            admitting.add(value);
            try {
              const callback = (value as { release?: unknown }).release;
              if (typeof callback !== "function") throw new Error();
              lease = { release: () => Reflect.apply(callback, value, []), released: false };
              leases.set(value, lease);
            } finally {
              admitting.delete(value);
            }
          } catch {
            fail();
            return false;
          }
          if (current !== key || state !== "pending") {
            release(lease);
            return false;
          }
          owned = lease;
          state = "ready";
          return true;
        },
      });
    },
  };
}
