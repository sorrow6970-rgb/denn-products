import {
  type BackgroundInputCode,
  type BackgroundInputResult,
  inspectRoomBackgroundInput,
} from "./background-input";
import {
  type BackgroundContainerResult,
  inspectRoomBackgroundContainer,
} from "./background-container";
import {
  type BackgroundMetadataAbsenceResult,
  inspectRoomBackgroundMetadataAbsence,
} from "./background-metadata-absence";

export type BackgroundFileCode =
  | BackgroundInputCode
  | `ROOM_BACKGROUND_FILE_${
      | "INVALID_INPUT"
      | "UNAVAILABLE"
      | "READ_FAILED"
      | "LENGTH_MISMATCH"
      | "CANCELLED"
      | "DISPOSED"}`;
export interface BackgroundFileLease {
  takeBlob(): Blob | null;
  release(): void;
}
type Failure = Readonly<{ ok: false; code: BackgroundFileCode }>;
export type BackgroundFileRunResult =
  | Failure
  | Readonly<{
      ok: true;
      preflight: Extract<BackgroundInputResult, { ok: true }>;
      lease: BackgroundFileLease;
    }>;
export interface BackgroundFileJob {
  run(): Promise<BackgroundFileRunResult>;
  cancel(): void;
  dispose(): void;
}
export type BackgroundEvidence = Extract<BackgroundContainerResult, { ok: true }>;
export type BackgroundEvidenceCode =
  | BackgroundFileCode
  | Extract<BackgroundContainerResult, { ok: false }>["code"];
export interface BackgroundEvidenceLease {
  take(): Readonly<{ blob: Blob; evidence: BackgroundEvidence }> | null;
  release(): void;
}
export type BackgroundEvidenceRunResult =
  | Readonly<{ ok: false; code: BackgroundEvidenceCode }>
  | Readonly<{ ok: true; lease: BackgroundEvidenceLease }>;
export interface BackgroundEvidenceJob {
  run(): Promise<BackgroundEvidenceRunResult>;
  cancel(): void;
  dispose(): void;
}
export type BackgroundAbsenceEvidence = Extract<BackgroundMetadataAbsenceResult, { ok: true }>;
export type BackgroundAbsenceCode =
  | BackgroundFileCode
  | Extract<BackgroundMetadataAbsenceResult, { ok: false }>["code"];
export interface BackgroundAbsenceLease {
  take(): Readonly<{ blob: Blob; evidence: BackgroundAbsenceEvidence }> | null;
  release(): void;
}
export type BackgroundAbsenceRunResult =
  | Readonly<{ ok: false; code: BackgroundAbsenceCode }>
  | Readonly<{ ok: true; lease: BackgroundAbsenceLease }>;
export interface BackgroundAbsenceJob {
  run(): Promise<BackgroundAbsenceRunResult>;
  cancel(): void;
  dispose(): void;
}
type Mode = "preflight" | "orientation" | "absence";
type RunResult = BackgroundFileRunResult | BackgroundEvidenceRunResult | BackgroundAbsenceRunResult;
type InternalJob = Omit<BackgroundFileJob, "run"> & { run(): Promise<RunResult> };
export interface BackgroundFileReaderPort {
  readonly result: unknown;
  readonly readyState: number;
  readAsArrayBuffer(blob: Blob): void;
  abort(): void;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  onloadend: (() => void) | null;
}

const NativeBlob = globalThis.Blob;
const NativeFile = globalThis.File;
const blobSize = NativeBlob && Object.getOwnPropertyDescriptor(NativeBlob.prototype, "size")?.get;
const blobSlice = NativeBlob?.prototype.slice;
const bufferSize = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")?.get;
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const handlers = ["onload", "onerror", "onabort", "onloadend"] as const;
const failure = <Code extends BackgroundEvidenceCode | BackgroundAbsenceCode>(code: Code) =>
  Object.freeze({ ok: false, code });
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Single-use local read. Its immutable handoff still does not authorize decoding. */
export function createRoomBackgroundFileJob(
  request: unknown,
  environment?: unknown,
): Failure | Readonly<{ ok: true; job: BackgroundFileJob }> {
  return createFactory(request, environment, "preflight");
}

/** Same-byte partial evidence and immutable snapshot; no decoding or display permission. */
export function createRoomBackgroundEvidenceJob(
  request: unknown,
  environment?: unknown,
): Failure | Readonly<{ ok: true; job: BackgroundEvidenceJob }> {
  return createFactory(request, environment, "orientation");
}

/** Spec119: same-byte core-only absence evidence; still no decoding or display authority. */
export function createRoomBackgroundAbsenceJob(
  request: unknown,
  environment?: unknown,
): Failure | Readonly<{ ok: true; job: BackgroundAbsenceJob }> {
  return createFactory(request, environment, "absence");
}

function createFactory(
  request: unknown,
  environment: unknown,
  mode: "preflight",
): Failure | Readonly<{ ok: true; job: BackgroundFileJob }>;
function createFactory(
  request: unknown,
  environment: unknown,
  mode: "orientation",
): Failure | Readonly<{ ok: true; job: BackgroundEvidenceJob }>;
function createFactory(
  request: unknown,
  environment: unknown,
  mode: "absence",
): Failure | Readonly<{ ok: true; job: BackgroundAbsenceJob }>;
function createFactory(
  request: unknown,
  environment: unknown,
  mode: Mode,
): Failure | Readonly<{ ok: true; job: InternalJob }> {
  try {
    if (!record(request)) return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    const file = request.file;
    const budget = request.budget;
    if (!record(budget)) return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    const maxEdge = budget.maxEdge;
    if (
      typeof maxEdge !== "number" ||
      !Number.isSafeInteger(maxEdge) ||
      maxEdge < 1 ||
      maxEdge > 40_000_000
    )
      return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    if (!NativeBlob || !blobSize || !blobSlice || !bufferSize || !resizable) {
      return failure("ROOM_BACKGROUND_FILE_UNAVAILABLE");
    }
    if (!record(file)) return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    const proto = Object.getPrototypeOf(file);
    if (proto !== NativeBlob.prototype && (!NativeFile || proto !== NativeFile.prototype)) {
      return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    }
    const size: number = Reflect.apply(blobSize, file, []);
    if (!Number.isSafeInteger(size) || size < 1) {
      return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
    }
    if (size > 20_000_000) return failure("ROOM_BACKGROUND_BYTE_LIMIT");
    let makeReader: () => unknown;
    if (environment !== undefined) {
      if (!record(environment)) return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
      const create = environment.createReader;
      if (typeof create !== "function") return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
      makeReader = () => Reflect.apply(create, environment, []);
    } else {
      const Reader = globalThis.FileReader;
      if (typeof Reader !== "function") return failure("ROOM_BACKGROUND_FILE_UNAVAILABLE");
      makeReader = () => new Reader();
    }
    return Object.freeze({
      ok: true,
      job: createJob(file as unknown as Blob, size, maxEdge, makeReader, mode),
    });
  } catch {
    return failure("ROOM_BACKGROUND_FILE_INVALID_INPUT");
  }
}

function createJob(
  initialFile: Blob,
  size: number,
  maxEdge: number,
  initialFactory: () => unknown,
  mode: Mode,
): InternalJob {
  let source: Blob | null = initialFile;
  let makeReader: (() => unknown) | null = initialFactory;
  let reader: BackgroundFileReaderPort | null = null;
  let abort: (() => void) | null = null;
  let readAttempted = false;
  let abortAttempted = false;
  let terminal = false;
  let phase: "idle" | "installing" | "starting" | "reading" = "idle";
  let candidate: "load" | "error" | null = null;
  let eventConsumed = false;
  let owned: Blob | null = null;
  let joint: Readonly<{ blob: Blob; evidence: BackgroundEvidence }> | null = null;
  let absentJoint: Readonly<{ blob: Blob; evidence: BackgroundAbsenceEvidence }> | null = null;
  let promise: Promise<RunResult> | null = null;
  let resolve: ((result: RunResult) => void) | null = null;

  function ensurePromise(): Promise<RunResult> {
    if (!promise)
      promise = new Promise((done) => {
        resolve = done;
      });
    return promise;
  }
  function detach(target: BackgroundFileReaderPort): void {
    for (const key of handlers) {
      try {
        target[key] = null;
      } catch {
        /* A hostile injected setter cannot be repaired here. */
      }
    }
  }
  function cleanup(stop: boolean): void {
    const target = reader;
    const cancelRead = abort;
    reader = null;
    abort = null;
    source = null;
    makeReader = null;
    candidate = null;
    if (target) detach(target);
    if (stop && readAttempted && !abortAttempted && cancelRead) {
      abortAttempted = true;
      try {
        cancelRead();
      } catch {
        /* Logical termination does not depend on native abort. */
      }
    }
  }
  function finish(result: RunResult, stop = false): void {
    if (terminal) return;
    ensurePromise();
    terminal = true;
    const done = resolve;
    resolve = null;
    cleanup(stop);
    done?.(result);
  }
  function rejectRead(): void {
    finish(failure("ROOM_BACKGROUND_FILE_READ_FAILED"), true);
  }
  function complete(): void {
    try {
      const target = reader;
      if (terminal || !target) return;
      const state = target.readyState;
      if (terminal) return;
      if (state !== 2) {
        rejectRead();
        return;
      }
      const result = target.result;
      if (terminal) return;
      if (
        !record(result) ||
        Object.getPrototypeOf(result) !== ArrayBuffer.prototype ||
        !bufferSize ||
        !resizable ||
        Reflect.apply(resizable, result, []) !== false
      ) {
        rejectRead();
        return;
      }
      const length: number = Reflect.apply(bufferSize, result, []);
      // Constructing a view also rejects a detached zero-length buffer.
      const bytes = new Uint8Array(result as unknown as ArrayBuffer);
      if (length !== size) {
        finish(failure("ROOM_BACKGROUND_FILE_LENGTH_MISMATCH"));
        return;
      }
      const preflight =
        mode === "absence"
          ? inspectRoomBackgroundMetadataAbsence({ bytes, budget: { maxEdge } })
          : mode === "orientation"
            ? inspectRoomBackgroundContainer({ bytes, budget: { maxEdge } })
            : inspectRoomBackgroundInput({ bytes, budget: { maxEdge } });
      if (!preflight.ok) {
        finish(preflight);
        return;
      }
      // No external calls between checking the fixed private bytes and snapshotting them.
      owned = new NativeBlob([bytes], {
        type: preflight.format === "png" ? "image/png" : "image/jpeg",
      });
      if (!blobSize || Reflect.apply(blobSize, owned, []) !== size) {
        owned = null;
        rejectRead();
        return;
      }
      if (preflight.kind === "metadata-absence-evidence") {
        absentJoint = Object.freeze({ blob: owned, evidence: preflight });
        owned = null;
        const lease: BackgroundAbsenceLease = Object.freeze({
          take() {
            const value = absentJoint;
            absentJoint = null;
            return value;
          },
          release() {
            absentJoint = null;
          },
        });
        finish(Object.freeze({ ok: true, lease }));
        return;
      }
      if (preflight.kind === "container-orientation-evidence") {
        joint = Object.freeze({ blob: owned, evidence: preflight });
        owned = null;
        const lease: BackgroundEvidenceLease = Object.freeze({
          take() {
            const value = joint;
            joint = null;
            return value;
          },
          release() {
            joint = null;
          },
        });
        finish(Object.freeze({ ok: true, lease }));
        return;
      }
      const lease: BackgroundFileLease = Object.freeze({
        takeBlob() {
          const value = owned;
          owned = null;
          return value;
        },
        release() {
          owned = null;
        },
      });
      finish(Object.freeze({ ok: true, preflight, lease }));
    } catch {
      owned = null;
      joint = null;
      absentJoint = null;
      rejectRead();
    }
  }
  function event(kind: "load" | "error"): void {
    if (terminal || eventConsumed) return;
    if (phase === "installing") {
      rejectRead();
      return;
    }
    if (phase === "starting") {
      candidate ??= kind;
      return;
    }
    eventConsumed = true;
    if (kind === "load") complete();
    else rejectRead();
  }
  function start(): void {
    try {
      if (!source || !makeReader || !blobSlice || !blobSize) {
        rejectRead();
        return;
      }
      const bounded: Blob = Reflect.apply(blobSlice, source, [0, size]);
      if (Reflect.apply(blobSize, bounded, []) !== size) {
        rejectRead();
        return;
      }
      const target: unknown = makeReader();
      if (!record(target)) {
        rejectRead();
        return;
      }
      reader = target as unknown as BackgroundFileReaderPort;
      if (terminal) {
        detach(reader);
        reader = null;
        return;
      }
      const read = reader.readAsArrayBuffer;
      if (terminal) return;
      const stop = reader.abort;
      if (terminal) return;
      if (typeof read !== "function" || typeof stop !== "function") {
        rejectRead();
        return;
      }
      const captured = reader;
      abort = () => Reflect.apply(stop, captured, []);
      phase = "installing";
      for (const key of handlers) {
        captured[key] = () => event(key === "onload" ? "load" : "error");
        if (terminal) {
          detach(captured);
          return;
        }
      }
      phase = "starting";
      readAttempted = true;
      Reflect.apply(read, captured, [bounded]);
      if (terminal) return;
      phase = "reading";
      const pending = candidate;
      candidate = null;
      if (pending) event(pending);
    } catch {
      rejectRead();
    }
  }
  function cancel(code: "ROOM_BACKGROUND_FILE_CANCELLED" | "ROOM_BACKGROUND_FILE_DISPOSED"): void {
    owned = null;
    joint = null;
    absentJoint = null;
    finish(failure(code), true);
  }
  return Object.freeze({
    run() {
      const existing = promise;
      if (existing) return existing;
      const result = ensurePromise();
      if (!terminal) start();
      return result;
    },
    cancel() {
      cancel("ROOM_BACKGROUND_FILE_CANCELLED");
    },
    dispose() {
      cancel("ROOM_BACKGROUND_FILE_DISPOSED");
    },
  });
}
