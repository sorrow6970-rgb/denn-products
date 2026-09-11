type State = "empty" | "pending" | "ready" | "blocked" | "disposed";
type RecordValue = Record<string, unknown>;
export interface RoomCommittedSource {
  readonly identity: object;
  readonly kind: "frame";
  readonly projectionOk: true;
  readonly planReady: true;
  readonly clockPreview: null;
  readonly plan: object;
  readonly imageBindings: { get(ref: string): unknown };
}
export interface RoomSourceTicket {
  commit(input: unknown): boolean;
  invalidate(): void;
}
export interface RoomCommittedSourceOwner {
  begin(): RoomSourceTicket | null;
  readSource(): RoomCommittedSource | null;
  invalidate(): void;
  dispose(): void;
  getState(): State;
}
interface Entry {
  attempted: boolean;
  source: RoomCommittedSource | null;
  check: (() => unknown) | null;
  get: ((ref: string) => unknown) | null;
}
const record = (value: unknown): RecordValue => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
  return value as RecordValue;
};
const dimension = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 1_000_000)
    throw new Error();
};
/** Internal commit protocol, not a React commit detector or an owned pixel snapshot. */
export function createRoomCommittedSourceOwner(
  environment: unknown,
):
  | { readonly ok: true; readonly owner: RoomCommittedSourceOwner }
  | { readonly ok: false; readonly code: "ROOM_SOURCE_INVALID_INPUT" } {
  let notify: () => void;
  try {
    const env = record(environment),
      callback = env.onInvalidate;
    if (typeof callback !== "function") throw new Error();
    notify = () => {
      Reflect.apply(callback, env, []);
    };
  } catch {
    return Object.freeze({ ok: false, code: "ROOM_SOURCE_INVALID_INPUT" });
  }
  let state: State = "empty",
    current: Entry | null = null,
    checking = false,
    getting = false;
  const active = (entry: Entry) => current === entry && state !== "disposed" && state !== "blocked";
  const discard = (entry: Entry) => {
    entry.source = null;
    entry.get = null;
    entry.check = null;
  };
  const notifySafely = () => {
    try {
      notify();
    } catch {
      if (current) discard(current);
      current = null;
      if (state !== "disposed") state = "blocked";
    }
  };
  function invalidate(entry: Entry | null) {
    if (!entry || !active(entry)) return;
    current = null;
    state = "empty";
    discard(entry);
    notifySafely();
  }
  function check(entry: Entry): boolean {
    if (!active(entry) || !entry.source || !entry.check || checking) return false;
    checking = true;
    try {
      const result = entry.check();
      if (!active(entry)) return false;
      if (result !== true) {
        invalidate(entry);
        return false;
      }
      return true;
    } catch {
      invalidate(entry);
      return false;
    } finally {
      checking = false;
    }
  }
  const owner: RoomCommittedSourceOwner = {
    getState: () => state,
    begin() {
      if (state === "disposed" || state === "blocked") return null;
      const previous = current;
      const entry: Entry = { attempted: false, source: null, check: null, get: null };
      current = entry;
      state = "pending";
      if (previous) {
        discard(previous);
        notifySafely();
      }
      return Object.freeze({
        commit(raw: unknown): boolean {
          // A recursive proof cannot publish another source while the outer proof is unresolved.
          if (!active(entry) || entry.attempted || checking) return false;
          entry.attempted = true;
          const guard = () => {
            if (!active(entry)) throw new Error();
          };
          const field = (object: RecordValue, key: string) => {
            const value = object[key];
            guard();
            return value;
          };
          try {
            const value = record(raw);
            if (
              field(value, "kind") !== "frame" ||
              field(value, "projectionOk") !== true ||
              field(value, "planReady") !== true ||
              field(value, "clockPreview") !== null
            )
              throw new Error();
            const plan = record(field(value, "plan"));
            if (field(plan, "kind") !== "frame") throw new Error();
            const size = record(field(plan, "logicalCanvas"));
            dimension(field(size, "width"));
            dimension(field(size, "height"));
            const bindings = record(field(value, "imageBindings")),
              get = field(bindings, "get");
            const isCurrent = field(value, "isCurrent");
            if (typeof get !== "function" || typeof isCurrent !== "function") throw new Error();
            entry.check = () => Reflect.apply(isCurrent, value, []);
            entry.get = (ref) => Reflect.apply(get, bindings, [ref]);
            entry.source = Object.freeze({
              identity: Object.freeze({}),
              kind: "frame",
              projectionOk: true,
              planReady: true,
              clockPreview: null,
              plan,
              imageBindings: Object.freeze({
                get(ref: string): unknown {
                  if (getting || typeof ref !== "string" || !check(entry)) return undefined;
                  getting = true;
                  try {
                    const result = entry.get?.(ref);
                    return check(entry) ? result : undefined;
                  } catch {
                    invalidate(entry);
                    return undefined;
                  } finally {
                    getting = false;
                  }
                },
              }),
            });
            state = "ready";
            return check(entry);
          } catch {
            invalidate(entry);
            return false;
          }
        },
        invalidate: () => invalidate(entry),
      });
    },
    readSource() {
      const entry = current;
      return entry && check(entry) ? entry.source : null;
    },
    invalidate: () => invalidate(current),
    dispose() {
      if (state === "disposed") return;
      const previous = current;
      current = null;
      state = "disposed";
      if (previous) {
        discard(previous);
        notifySafely();
      }
    },
  };
  return Object.freeze({ ok: true, owner: Object.freeze(owner) });
}
