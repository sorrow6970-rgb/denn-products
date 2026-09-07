import {
  createRoomPlacementSession,
  type RoomSessionTicket,
  type RoomSessionState,
} from "./session";

export type RoomPreparationCode =
  | "ROOM_PREPARATION_INVALID_INPUT"
  | "ROOM_PREPARATION_SOURCE_BLOCKED"
  | "ROOM_PREPARATION_CAPTURE_FAILED"
  | "ROOM_PREPARATION_BACKGROUND_FAILED"
  | "ROOM_PREPARATION_SUPERSEDED"
  | "ROOM_PREPARATION_CANCELLED"
  | "ROOM_PREPARATION_DISPOSED";
export type PrepareResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: RoomPreparationCode };
interface Size {
  readonly width: number;
  readonly height: number;
}
export interface PreparedInfo {
  readonly frameSize: Size;
  readonly backgroundSize: Size;
}
export interface RoomBackgroundSink {
  complete(value: unknown): void;
  fail(): void;
}
export interface RoomPreparationController {
  prepare(request: unknown): Promise<PrepareResult>;
  getState(): RoomSessionState;
  readPrepared(request: unknown): PreparedInfo | null;
  clear(): void;
  dispose(): void;
}
interface Request {
  sourceIdentity: object;
  backgroundIdentity: object;
}
interface Resource {
  size: Size;
  release(): void;
  released: boolean;
}
interface Cohort {
  request: Request | null;
  ticket: RoomSessionTicket | null;
  ended: boolean;
  settled: boolean;
  resolve(result: PrepareResult): void;
  frame: Resource | null;
  background: Resource | null;
  aggregate: boolean;
  info: PreparedInfo | null;
  starting: boolean;
  delivered: boolean;
  backgroundFailed: boolean;
  cancel: (() => void) | null;
  cancelWanted: boolean;
  taskSucceeded: boolean;
}
const failure = (code: RoomPreparationCode): PrepareResult => ({ ok: false, code });
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
  return value as Record<string, unknown>;
}
function requestOf(value: unknown): Request | null {
  try {
    const r = record(value);
    const sourceIdentity = r.sourceIdentity;
    const backgroundIdentity = r.backgroundIdentity;
    record(sourceIdentity);
    record(backgroundIdentity);
    return {
      sourceIdentity: sourceIdentity as object,
      backgroundIdentity: backgroundIdentity as object,
    };
  } catch {
    return null;
  }
}
function method(value: Record<string, unknown>, key: string): (...args: unknown[]) => unknown {
  const fn = value[key];
  if (typeof fn !== "function") throw new Error();
  return (...args) => Reflect.apply(fn, value, args);
}
const dimension = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 1_000_000)
    throw new Error();
  return value;
};

/** Injected lifecycle only: no default browser ports, renderer, timers or resource creation. */
export function createRoomPreparationController(
  input: unknown,
):
  | { readonly ok: false; readonly code: "ROOM_PREPARATION_INVALID_INPUT" }
  | { readonly ok: true; readonly controller: RoomPreparationController } {
  let readSource: () => unknown;
  let capture: (...args: unknown[]) => unknown;
  let start: (...args: unknown[]) => unknown;
  try {
    const ports = record(input);
    readSource = method(ports, "readSource");
    capture = method(ports, "captureFrame");
    start = method(ports, "startBackground");
  } catch {
    return { ok: false, code: "ROOM_PREPARATION_INVALID_INPUT" };
  }

  const session = createRoomPlacementSession();
  const resources = new WeakMap<object, Resource>();
  const admitting = new WeakSet<object>();
  let current: Cohort | null = null;
  let state: RoomSessionState = "empty";
  let readingSource = false;
  const active = (c: Cohort) => current === c && !c.ended && state !== "disposed";
  const release = (r: Resource | null) => {
    if (!r || r.released) return;
    r.released = true;
    try {
      r.release();
    } catch {
      /* At most one attempt, not proof of physical cleanup. */
    }
  };
  function admit(value: unknown): Resource | null {
    let r: Resource | null = null;
    let object: Record<string, unknown> | null = null;
    let reserved = false;
    try {
      object = record(value);
      if (resources.has(object) || admitting.has(object)) return null;
      admitting.add(object);
      reserved = true;
      const cleanup = method(object, "release");
      r = {
        size: { width: 0, height: 0 },
        release: () => {
          cleanup();
        },
        released: false,
      };
      resources.set(object, r);
      const width = dimension(object.width);
      const height = dimension(object.height);
      // A capture must be synchronous; a thenable with lease-shaped fields is not accepted.
      if (typeof object.then === "function") throw new Error();
      r.size = { width, height };
      return r;
    } catch {
      release(r);
      return null;
    } finally {
      if (object && reserved) admitting.delete(object);
    }
  }
  function settle(c: Cohort, result: PrepareResult) {
    if (c.settled) return;
    c.settled = true;
    c.resolve(result);
  }
  function cancel(c: Cohort) {
    if (!c.cancelWanted || c.taskSucceeded || !c.cancel) return;
    const fn = c.cancel;
    c.cancel = null;
    try {
      fn();
    } catch {
      /* Continue cleaning the separately owned leases. */
    }
  }
  function retire(c: Cohort, code: RoomPreparationCode) {
    if (c.ended) return;
    c.ended = true;
    c.info = null;
    settle(c, failure(code));
    c.cancelWanted = true;
    const frame = c.frame;
    const background = c.background;
    c.frame = null;
    c.background = null;
    // Session detaches its owned aggregate BEFORE release can re-enter this controller.
    if (c.aggregate) {
      c.aggregate = false;
      session.clear();
    } else c.ticket?.fail();
    cancel(c);
    release(frame);
    release(background);
  }
  function end(c: Cohort, code: RoomPreparationCode) {
    if (active(c)) {
      current = null;
      state = "empty";
    }
    retire(c, code);
  }
  function sourceMatches(c: Cohort): boolean {
    if (!active(c) || readingSource) return false;
    readingSource = true;
    try {
      const source = record(readSource());
      const identity = source.identity;
      const kind = source.kind;
      const projectionOk = source.projectionOk;
      const planReady = source.planReady;
      const clockPreview = source.clockPreview;
      return (
        active(c) &&
        identity === c.request?.sourceIdentity &&
        kind === "frame" &&
        projectionOk === true &&
        planReady === true &&
        clockPreview === null
      );
    } catch {
      return false;
    } finally {
      readingSource = false;
    }
  }
  function requireCurrentSource(c: Cohort): boolean {
    if (sourceMatches(c)) return true;
    end(c, "ROOM_PREPARATION_SUPERSEDED");
    return false;
  }
  function finishBackground(c: Cohort) {
    if (!active(c) || c.starting || !c.delivered) return;
    if (c.backgroundFailed || !c.frame || !c.background) {
      end(c, "ROOM_PREPARATION_BACKGROUND_FAILED");
      return;
    }
    if (!requireCurrentSource(c)) return;
    const frame = c.frame;
    const background = c.background;
    const info = { frameSize: { ...frame.size }, backgroundSize: { ...background.size } };
    c.frame = null;
    c.background = null;
    const aggregate = {
      release: () => {
        release(frame);
        release(background);
      },
    };
    // Mark the task complete only after valid source/leases. Successful tasks need no cancel.
    if (!c.ticket?.complete(aggregate)) {
      aggregate.release();
      end(c, "ROOM_PREPARATION_SUPERSEDED");
      return;
    }
    c.aggregate = true;
    c.taskSucceeded = true;
    c.cancel = null;
    c.info = info;
    state = "ready";
    settle(c, { ok: true });
  }
  function run(c: Cohort, raw: unknown) {
    c.request = requestOf(raw);
    if (!active(c)) return;
    if (!c.request) {
      end(c, "ROOM_PREPARATION_INVALID_INPUT");
      return;
    }
    if (!sourceMatches(c)) {
      end(c, "ROOM_PREPARATION_SOURCE_BLOCKED");
      return;
    }
    c.ticket = session.begin();
    if (!active(c)) return;
    let value: unknown;
    try {
      value = capture(c.request.sourceIdentity);
    } catch {
      end(c, "ROOM_PREPARATION_CAPTURE_FAILED");
      return;
    }
    const frame = admit(value);
    if (!active(c)) {
      release(frame);
      return;
    }
    if (!frame) {
      end(c, "ROOM_PREPARATION_CAPTURE_FAILED");
      return;
    }
    c.frame = frame;
    if (!requireCurrentSource(c)) return;
    if (!requireCurrentSource(c)) return; // independent pre-start gate, after capture gate
    c.starting = true;
    const sink: RoomBackgroundSink = {
      complete(value) {
        // Reserve the first delivery before any lease getter may synchronously deliver again.
        const first = active(c) && !c.delivered;
        if (first) c.delivered = true;
        const resource = admit(value);
        if (!first || !active(c)) {
          release(resource);
          return;
        }
        c.background = resource;
        c.backgroundFailed = resource === null;
        finishBackground(c);
      },
      fail() {
        if (!active(c) || c.delivered) return;
        c.delivered = true;
        c.backgroundFailed = true;
        finishBackground(c);
      },
    };
    try {
      const task = record(start(c.request.backgroundIdentity, sink));
      const abort = method(task, "cancel");
      c.cancel = () => {
        abort();
      };
    } catch {
      end(c, "ROOM_PREPARATION_BACKGROUND_FAILED");
    }
    c.starting = false;
    if (!active(c)) {
      cancel(c);
      return;
    }
    if (!requireCurrentSource(c)) return;
    finishBackground(c);
  }
  const controller: RoomPreparationController = {
    getState: () => state,
    prepare(raw) {
      if (state === "disposed") return Promise.resolve(failure("ROOM_PREPARATION_DISPOSED"));
      let resolve!: (result: PrepareResult) => void;
      const promise = new Promise<PrepareResult>((done) => {
        resolve = done;
      });
      const c: Cohort = {
        request: null,
        ticket: null,
        ended: false,
        settled: false,
        resolve,
        frame: null,
        background: null,
        aggregate: false,
        info: null,
        starting: false,
        delivered: false,
        backgroundFailed: false,
        cancel: null,
        cancelWanted: false,
        taskSucceeded: false,
      };
      const previous = current;
      current = c;
      state = "pending";
      if (previous) retire(previous, "ROOM_PREPARATION_SUPERSEDED");
      if (active(c)) run(c, raw);
      return promise;
    },
    readPrepared(raw) {
      const c = current;
      if (!c || state !== "ready") return null;
      const request = requestOf(raw);
      if (
        !active(c) ||
        !request ||
        request.sourceIdentity !== c.request?.sourceIdentity ||
        request.backgroundIdentity !== c.request.backgroundIdentity
      )
        return null;
      if (!requireCurrentSource(c) || !c.info) return null;
      return { frameSize: { ...c.info.frameSize }, backgroundSize: { ...c.info.backgroundSize } };
    },
    clear() {
      if (state === "disposed") return;
      const previous = current;
      current = null;
      state = "empty";
      if (previous) retire(previous, "ROOM_PREPARATION_CANCELLED");
    },
    dispose() {
      if (state === "disposed") return;
      const previous = current;
      current = null;
      state = "disposed";
      if (previous) retire(previous, "ROOM_PREPARATION_DISPOSED");
      session.dispose();
    },
  };
  return { ok: true, controller };
}
