type State = "idle" | "pending" | "held" | "blocked" | "disposed";
type Code =
  | "ROOM_BACKGROUND_WORK_BUSY"
  | "ROOM_BACKGROUND_WORK_BLOCKED"
  | "ROOM_BACKGROUND_WORK_DISPOSED";
export interface BackgroundWorkTicket {
  settle(resource: unknown): void;
  release(): void;
}
export interface BackgroundWorkAdmission {
  begin():
    | Readonly<{ ok: true; ticket: BackgroundWorkTicket }>
    | Readonly<{ ok: false; code: Code }>;
  getState(): State;
  dispose(): void;
}

/** Trusted port reports actual settlement. Logical cancellation never frees pending capacity. */
export function createRoomBackgroundWorkAdmission(): BackgroundWorkAdmission {
  type Entry = {
    settled: boolean;
    cancelled: boolean;
    cleanup: (() => void) | null;
    cleaning: boolean;
  };
  let current: Entry | null = null;
  let settling = 0;
  let blocked = false,
    disposed = false;
  const seen = new WeakSet<object>();
  function clean(entry: Entry): void {
    if (entry.cleaning) return;
    const release = entry.cleanup;
    entry.cleanup = null;
    entry.cleaning = true;
    if (release) {
      try {
        release();
      } catch {
        blocked = true;
      }
    }
    entry.cleaning = false;
    if (current === entry) current = null;
  }
  function capture(resource: unknown): (() => void) | null {
    try {
      if (resource === null || typeof resource !== "object" || Array.isArray(resource)) {
        blocked = true;
        return null;
      }
      if (seen.has(resource)) return null;
      // Reserve identity before potentially reentrant access.
      seen.add(resource);
      const release = (resource as { release?: unknown }).release;
      if (typeof release !== "function") {
        blocked = true;
        return null;
      }
      return () => Reflect.apply(release, resource, []);
    } catch {
      blocked = true;
      return null;
    }
  }
  function releaseEntry(entry: Entry): void {
    entry.cancelled = true;
    if (entry.settled) clean(entry);
  }
  return Object.freeze({
    begin() {
      if (disposed) return Object.freeze({ ok: false, code: "ROOM_BACKGROUND_WORK_DISPOSED" });
      if (blocked) return Object.freeze({ ok: false, code: "ROOM_BACKGROUND_WORK_BLOCKED" });
      if (current || settling)
        return Object.freeze({ ok: false, code: "ROOM_BACKGROUND_WORK_BUSY" });
      const entry: Entry = { settled: false, cancelled: false, cleanup: null, cleaning: false };
      current = entry;
      const ticket: BackgroundWorkTicket = Object.freeze({
        settle(resource: unknown) {
          settling++;
          try {
            if (entry.settled) {
              if (resource !== null) {
                const cleanup = capture(resource);
                if (cleanup) clean({ settled: true, cancelled: true, cleanup, cleaning: false });
              }
              return;
            }
            // Mark settlement before reading the port, keeping capacity reserved through admission.
            entry.settled = true;
            entry.cleaning = true;
            entry.cleanup = resource === null ? null : capture(resource);
            entry.cleaning = false;
            if (resource === null || !entry.cleanup || entry.cancelled || disposed) clean(entry);
          } finally {
            settling--;
          }
        },
        release() {
          releaseEntry(entry);
        },
      });
      return Object.freeze({ ok: true, ticket });
    },
    getState(): State {
      if (disposed) return "disposed";
      if (blocked) return "blocked";
      return current ? (current.settled ? "held" : "pending") : settling ? "pending" : "idle";
    },
    dispose() {
      disposed = true;
      if (current) releaseEntry(current);
    },
  });
}
