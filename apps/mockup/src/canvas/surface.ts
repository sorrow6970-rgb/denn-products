// Framework-free preview Canvas surface engine (spec 022). React wiring lives in
// usePreviewCanvasSurface.ts; this file owns the size/backing/transform/execute state machine so it
// can be unit tested against fake ports with no DOM library.
//
// Fixed order per draw (spec 022 §3):
//   observed CSS size → invariant check against plan.logicalCanvas → computeBackingStoreSize
//   → conditional canvas.width/height assignment → setTransform(effectiveDpr) → executor.
// The backing assignment resets context state, which is why the transform is (re)applied after it —
// and it is re-applied on every draw, even when the backing did not change.
//
// This surface never invents a plan, a colour, a zone or a size: it only executes what the caller
// passes. No URL/base64/token/storagePath/imageRef/layerId ever reaches its state (spec 022 §2).

import { computeBackingStoreSize, type PreviewRenderPlan } from "@denn/render";
import { executePreviewRenderPlan } from "./executePreviewPlan";
import type { PreviewCanvasContext, PreviewImageBindings } from "./types";

/**
 * DPR ceiling for the CUSTOMER PREVIEW surface only (spec 022 §1 Q2). Evidence: the preview Canvas
 * cap of `poc/platform-compatibility/src/App.tsx` (DPR_CAP = 2), which passed the spec 008 device
 * check. NOT a product-wide policy: the legacy room Canvas cap (4), print DPI and the admin Canvas
 * are untouched by this constant.
 */
export const PREVIEW_DPR_CAP = 2;

/** Max per-axis difference (CSS px) tolerated between the observed size and plan.logicalCanvas. */
export const LOGICAL_SIZE_TOLERANCE_PX = 0.5;

export type PreviewSurfaceState = "waiting-for-size" | "ready" | "failed";

/** The executor port (spec 021) plus the one transform call this layer owns. */
export interface PreviewSurfaceContext extends PreviewCanvasContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

/** Minimal canvas surface: assignable backing + 2d context. A real HTMLCanvasElement satisfies it. */
export interface PreviewSurfaceCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): PreviewSurfaceContext | null;
}

export interface PreviewSurfaceSnapshot {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
}

export interface ObservedSize {
  readonly width: number;
  readonly height: number;
}

export interface PreviewSurfacePorts {
  readonly canvas: PreviewSurfaceCanvas;
  /** latest plan + bindings; read at DRAW time so a stale frame can never win. */
  readonly getSnapshot: () => PreviewSurfaceSnapshot | null;
  /** observed content-box CSS size, or null when it cannot be measured. */
  readonly measure: () => ObservedSize | null;
  /** read at draw time — never at import time (spec 022 §5). */
  readonly getDevicePixelRatio: () => number;
  readonly schedule: (callback: () => void) => number;
  readonly cancel: (handle: number) => void;
  /** subscribe to size changes; returns the unsubscribe/disconnect function. */
  readonly observe: (onResize: () => void) => () => void;
  readonly onState: (state: PreviewSurfaceState) => void;
  /** injectable for unit tests; defaults to the spec 021 executor. */
  readonly execute?: typeof executePreviewRenderPlan;
}

export interface PreviewSurface {
  /** Coalesce a draw into the next frame (at most one pending frame per surface). */
  readonly requestDraw: () => void;
  /** Disconnect the observer, cancel the pending frame, and neutralise every later callback. */
  readonly dispose: () => void;
}

const isFinitePositive = (v: number): boolean => Number.isFinite(v) && v > 0;

/**
 * Create a surface that owns exactly one observer and at most one pending frame. Every callback is
 * generation-guarded: after `dispose()` a late observer or frame callback draws nothing, assigns
 * nothing and reports no state (spec 022 §5).
 */
export function createPreviewSurface(ports: PreviewSurfacePorts): PreviewSurface {
  const execute = ports.execute ?? executePreviewRenderPlan;
  let disposed = false;
  let frame: number | null = null;
  let lastState: PreviewSurfaceState | null = null;

  const report = (state: PreviewSurfaceState): void => {
    if (disposed || state === lastState) return;
    lastState = state;
    ports.onState(state);
  };

  const draw = (): void => {
    if (disposed) return;
    const snapshot = ports.getSnapshot();
    if (snapshot === null) {
      report("waiting-for-size");
      return;
    }

    const size = ports.measure();
    if (size === null || !isFinitePositive(size.width) || !isFinitePositive(size.height)) {
      report("waiting-for-size");
      return;
    }

    // Invariant: the surface executes plan coordinates as-is; it never rescales them (§3.5).
    const logical = snapshot.plan.logicalCanvas;
    if (
      Math.abs(size.width - logical.width) > LOGICAL_SIZE_TOLERANCE_PX ||
      Math.abs(size.height - logical.height) > LOGICAL_SIZE_TOLERANCE_PX
    ) {
      report("failed");
      return;
    }

    const backing = computeBackingStoreSize({
      cssSize: { width: size.width, height: size.height },
      deviceDpr: ports.getDevicePixelRatio(),
      dprCap: PREVIEW_DPR_CAP,
    });
    if (!backing.ok) {
      report("failed");
      return;
    }

    let context: PreviewSurfaceContext | null;
    try {
      context = ports.canvas.getContext("2d");
    } catch {
      report("failed");
      return;
    }
    if (context === null) {
      report("failed");
      return;
    }

    const { width, height } = backing.value.backingSize;
    const dpr = backing.value.effectiveDpr;
    try {
      // Conditional: assigning width/height resets the whole context state, so only do it on change.
      if (ports.canvas.width !== width) ports.canvas.width = width;
      if (ports.canvas.height !== height) ports.canvas.height = height;
      // Always re-applied, even when the backing was unchanged, so the transform is never assumed.
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch {
      report("failed");
      return;
    }

    const result = execute({
      context,
      plan: snapshot.plan,
      imageBindings: snapshot.imageBindings,
    });
    // Only the safe boolean outcome is used; no code / commandIndex is stored or surfaced.
    report(result.ok ? "ready" : "failed");
  };

  const runFrame = (): void => {
    frame = null;
    draw();
  };

  const requestDraw = (): void => {
    if (disposed || frame !== null) return;
    frame = ports.schedule(runFrame);
  };

  const disconnect = ports.observe(() => {
    // Resize entries within one frame collapse into a single scheduled draw that re-measures.
    requestDraw();
  });

  return {
    requestDraw,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disconnect();
      if (frame !== null) {
        ports.cancel(frame);
        frame = null;
      }
    },
  };
}
