import { executePreviewRenderPlan } from "../canvas/executePreviewPlan";
import type { ExecutePreviewRenderPlanArgs } from "../canvas/types";

type Suffix =
  | "INVALID_INPUT"
  | "SOURCE_BLOCKED"
  | "SOURCE_CHANGED"
  | "CAPTURE_FAILED"
  | "PAINT_FAILED"
  | "BUSY"
  | "RELEASED"
  | "DISPOSED";
type Failure = { readonly ok: false; readonly code: `ROOM_SNAPSHOT_${Suffix}` };
export type SnapshotPaintResult = { readonly ok: true } | Failure;
export interface FrameSnapshotLease {
  readonly width: number;
  readonly height: number;
  paint(request: unknown): SnapshotPaintResult;
  release(): void;
}
export type SnapshotCaptureResult =
  | { readonly ok: true; readonly lease: FrameSnapshotLease }
  | Failure;
export interface FrameSnapshotCapturer {
  capture(request: unknown): SnapshotCaptureResult;
  dispose(): void;
}
type RecordValue = Record<string, unknown>;
type Rect = { x: number; y: number; width: number; height: number };
const object = (v: unknown): v is RecordValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const failure = (suffix: Suffix): Failure => ({ ok: false, code: `ROOM_SNAPSHOT_${suffix}` });

/** Spec102: trusted synchronous ports, no browser allocation or product source producer here. */
export function createFrameSnapshotCapturer(
  ports: unknown,
): { ok: true; capturer: FrameSnapshotCapturer } | Failure {
  try {
    if (!object(ports)) return failure("INVALID_INPUT");
    const read = ports.readSource;
    const create = ports.createSurface;
    const execute = "execute" in ports ? ports.execute : executePreviewRenderPlan;
    if (
      typeof read !== "function" ||
      typeof create !== "function" ||
      typeof execute !== "function"
    ) {
      return failure("INVALID_INPUT");
    }
    return {
      ok: true,
      capturer: makeCapturer(
        () => Reflect.apply(read, ports, []),
        (size) => Reflect.apply(create, ports, [size]),
        (args) => Reflect.apply(execute, ports, [args]),
      ),
    };
  } catch {
    return failure("INVALID_INPUT");
  }
}

function makeCapturer(
  readSource: () => unknown,
  createSurface: (size: { width: number; height: number }) => unknown,
  execute: (args: ExecutePreviewRenderPlanArgs) => unknown,
): FrameSnapshotCapturer {
  let disposed = false;
  let capturing = false;
  let closeCurrent: (() => void) | undefined;
  const seen = new WeakSet<object>();
  const checkDisposed = () => {
    if (disposed) throw failure("DISPOSED");
  };
  // Each getter is an external call: never continue reading after a reentrant terminal transition.
  const field = (value: RecordValue, key: string, guard = checkDisposed): unknown => {
    const result = value[key];
    guard();
    return result;
  };
  const gate = (identity: object, guard = checkDisposed): RecordValue => {
    const source = readSource();
    guard();
    if (
      !object(source) ||
      field(source, "identity", guard) !== identity ||
      field(source, "kind", guard) !== "frame" ||
      field(source, "projectionOk", guard) !== true ||
      field(source, "planReady", guard) !== true ||
      field(source, "clockPreview", guard) !== null
    )
      throw failure("SOURCE_CHANGED");
    return source;
  };
  const stillCurrent = (identity: object, guard = checkDisposed): boolean => {
    try {
      gate(identity, guard);
      return true;
    } catch {
      return false;
    }
  };

  return {
    dispose() {
      disposed = true;
      closeCurrent?.();
    },
    capture(request) {
      if (disposed) return failure("DISPOSED");
      if (capturing || closeCurrent) return failure("BUSY");
      capturing = true;
      let cleanup: (() => void) | undefined;
      let error: Suffix = "INVALID_INPUT";
      try {
        if (!object(request)) throw failure(error);
        const identity = field(request, "sourceIdentity");
        const scale = field(request, "scale");
        const budget = field(request, "budget");
        if (!object(identity) || !positive(scale) || !object(budget)) throw failure(error);
        const maxEdge = field(budget, "maxEdge");
        const maxPixels = field(budget, "maxPixels");
        if (
          !positive(maxEdge) ||
          !positive(maxPixels) ||
          !Number.isSafeInteger(maxEdge) ||
          !Number.isSafeInteger(maxPixels)
        )
          throw failure(error);

        error = "SOURCE_BLOCKED";
        const source = gate(identity);
        const plan = field(source, "plan");
        const bindings = field(source, "imageBindings");
        if (!object(plan) || field(plan, "kind") !== "frame") throw failure(error);
        const logical = field(plan, "logicalCanvas");
        if (!object(logical)) throw failure(error);
        const width = field(logical, "width");
        const height = field(logical, "height");
        if (
          !positive(width) ||
          !positive(height) ||
          width < 1 ||
          height < 1 ||
          width > 1_000_000 ||
          height > 1_000_000 ||
          !object(bindings) ||
          typeof field(bindings, "get") !== "function"
        )
          throw failure(error);

        error = "INVALID_INPUT";
        const contentWidth = width * scale;
        const contentHeight = height * scale;
        const backingWidth = Math.ceil(contentWidth);
        const backingHeight = Math.ceil(contentHeight);
        if (
          !positive(contentWidth) ||
          !positive(contentHeight) ||
          !Number.isSafeInteger(backingWidth) ||
          !Number.isSafeInteger(backingHeight) ||
          backingWidth > maxEdge ||
          backingHeight > maxEdge ||
          backingWidth > Math.min(maxPixels, Number.MAX_SAFE_INTEGER) / backingHeight ||
          !Number.isSafeInteger(backingWidth * backingHeight)
        )
          throw failure(error);

        error = "CAPTURE_FAILED";
        const surface = createSurface({ width: backingWidth, height: backingHeight });
        // Even if createSurface disposed us, first acquire its returned cleanup capability.
        if (!object(surface) || seen.has(surface)) throw failure(error);
        seen.add(surface);
        const release = surface.release;
        if (typeof release !== "function") throw failure(error);
        let cleanupAttempted = false;
        cleanup = () => {
          if (!cleanupAttempted) {
            cleanupAttempted = true;
            try {
              Reflect.apply(release, surface, []);
            } catch {
              /* One attempt, no raw errors or retry. */
            }
          }
        };
        checkDisposed();
        if (typeof field(surface, "then") === "function") throw failure(error);
        const context = field(surface, "context");
        const copyTo = field(surface, "copyTo");
        if (!object(context) || typeof copyTo !== "function") throw failure(error);
        const transform = field(context, "setTransform");
        if (typeof transform !== "function") throw failure(error);
        if (!stillCurrent(identity)) {
          error = "SOURCE_CHANGED";
          throw failure(error);
        }
        Reflect.apply(transform, context, [scale, 0, 0, scale, 0, 0]);
        checkDisposed();
        if (!stillCurrent(identity)) {
          error = "SOURCE_CHANGED";
          throw failure(error);
        }
        const result = execute({
          context,
          plan,
          imageBindings: bindings,
        } as unknown as ExecutePreviewRenderPlanArgs);
        checkDisposed();
        const ok = object(result) && field(result, "ok") === true;
        if (!stillCurrent(identity)) {
          error = "SOURCE_CHANGED";
          throw failure(error);
        }
        if (!ok) throw failure(error);

        // Lease closure holds only its own capabilities and scalar geometry, not plan/bindings.
        const lease = makeLease(
          identity,
          width,
          height,
          contentWidth,
          contentHeight,
          (target, crop, destination) =>
            Reflect.apply(copyTo, surface, [target, crop, destination]),
          cleanup,
        );
        cleanup = undefined;
        return { ok: true, lease };
      } catch {
        cleanup?.();
        return failure(disposed ? "DISPOSED" : error);
      } finally {
        capturing = false;
      }
    },
  };

  function makeLease(
    identity: object,
    width: number,
    height: number,
    contentWidth: number,
    contentHeight: number,
    initialCopy: (target: object, crop: Rect, destination: Rect) => void,
    initialCleanup: () => void,
  ): FrameSnapshotLease {
    let copy: typeof initialCopy | undefined = initialCopy;
    let clean: (() => void) | undefined = initialCleanup;
    let live = true;
    let painting = false;
    const release = () => {
      if (!live) return;
      live = false;
      const fn = clean;
      clean = undefined;
      copy = undefined;
      if (closeCurrent === release) closeCurrent = undefined;
      fn?.();
    };
    closeCurrent = release;
    const guard = () => {
      checkDisposed();
      if (!live) throw failure("RELEASED");
    };
    return Object.freeze({
      width,
      height,
      release,
      paint(request: unknown): SnapshotPaintResult {
        if (disposed) return failure("DISPOSED");
        if (!live) return failure("RELEASED");
        if (painting) return failure("BUSY");
        painting = true;
        let error: Suffix = "INVALID_INPUT";
        let retire = false;
        try {
          if (!object(request)) throw failure(error);
          const target = field(request, "target", guard);
          const rect = field(request, "rect", guard);
          if (!object(target) || !object(rect)) throw failure(error);
          const x = field(rect, "x", guard);
          const y = field(rect, "y", guard);
          const w = field(rect, "width", guard);
          const h = field(rect, "height", guard);
          if (!finite(x) || !finite(y) || !positive(w) || !positive(h)) throw failure(error);
          const sx = w / width;
          const sy = h / height;
          const actualHeight = height * sx;
          if (
            !positive(sx) ||
            !positive(sy) ||
            !positive(actualHeight) ||
            Math.abs(sx - sy) / Math.max(sx, sy) > 1e-9
          )
            throw failure(error);
          error = "SOURCE_CHANGED";
          retire = true;
          if (!stillCurrent(identity, guard)) throw failure(error);
          guard();
          error = "PAINT_FAILED";
          copy?.(
            target,
            { x: 0, y: 0, width: contentWidth, height: contentHeight },
            { x, y, width: w, height: actualHeight },
          );
          guard();
          error = "SOURCE_CHANGED";
          if (!stillCurrent(identity, guard)) throw failure(error);
          guard();
          return { ok: true };
        } catch {
          const wasReleased = !live;
          if (retire) release();
          return failure(disposed ? "DISPOSED" : wasReleased ? "RELEASED" : error);
        } finally {
          painting = false;
        }
      },
    });
  }
}
