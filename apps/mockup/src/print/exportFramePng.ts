// Local frame PNG export (spec 033). Framework-free: every DOM capability arrives through an
// injected port, so the whole contract is unit-testable against fakes with no browser.
//
// The core decision (E-1 / C-1) is that this NEVER rebuilds the plan. The frame plan's logical
// width comes from the measured CSS width, and the font size and wrap width are percentages of it —
// so rebuilding at print width would re-run measureText and the line breaks could legitimately come
// out different. Spec 032 P-6 requires the preview and the print to break lines identically, and
// the only way to guarantee that structurally is to keep the SAME plan instance (its `draw-text`
// commands already carry the final lines) and let a uniform context transform do the scaling.
//
// This mirrors what `canvas/surface.ts` already does for DPR: setTransform, then hand the same plan
// to the same executor. `surface.ts` itself cannot be reused because it fails any draw whose
// observed size differs from `plan.logicalCanvas`, which is exactly what print does on purpose.
//
// Hard boundary (spec 032 P-4a / P-5c): nothing here uploads, builds an order payload, writes
// IndexedDB, opens Kakao, or stores/transmits the customer's words. The words exist only as pixels
// inside the PNG, and the file name carries centimetres and a timestamp only.

import { executePreviewRenderPlan } from "../canvas/executePreviewPlan";
import type { PreviewCanvasContext, PreviewImageBindings } from "../canvas/types";
import { buildPrintFileName, computeFramePrintPixelSize } from "./printSize";

/** The plan shape this module needs. Structural on purpose — no dependency on the render package. */
export interface ExportablePlan {
  readonly logicalCanvas: { readonly width: number; readonly height: number };
}

/** The executor port plus the one transform call this layer owns (same shape as the surface). */
export interface PrintCanvasContext extends PreviewCanvasContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

/** Minimal detached canvas: assignable backing + a 2d context + a blob encoder. */
export interface PrintCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): PrintCanvasContext | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string): void;
}

export interface ExportFramePngPorts {
  /** create a DETACHED canvas; never queried from the document. */
  readonly createCanvas: () => PrintCanvas;
  readonly createObjectUrl: (blob: Blob) => string;
  readonly revokeObjectUrl: (url: string) => void;
  /** hand the finished object URL + file name to the browser's download mechanism. */
  readonly triggerDownload: (url: string, fileName: string) => void;
  /** read at export time, never at import time. */
  readonly now: () => Date;
  /** injectable for unit tests; defaults to the spec 021 executor. */
  readonly execute?: typeof executePreviewRenderPlan;
}

export interface ExportFramePngRequest {
  /** the APPROVED plan instance from the preview — passed through, never rebuilt or copied. */
  readonly plan: ExportablePlan;
  /** the bindings from the SAME render cycle as `plan`. */
  readonly imageBindings: PreviewImageBindings;
  /** operator-authored centimetres from spec 032. `null` never reaches here. */
  readonly physicalSize: { readonly widthCm: number; readonly heightCm: number };
}

/**
 * Why an export produced no file. Identity-free: never a centimetre value, a pixel size, a layerId,
 * an imageRef, a URL, a catalog id, a customer word or an exception message.
 */
export type ExportErrorCode =
  // the request shape (plan / bindings / physical size) is unusable.
  | "INVALID_EXPORT_INPUT"
  // the pure size calculation failed (missing cm, non-finite, or both constraints unsatisfiable).
  | "INVALID_PRINT_SIZE"
  // width and height would need different scales — a non-uniform transform is never applied.
  | "NON_UNIFORM_SCALE"
  // the canvas, its 2d context or the backing assignment could not be obtained.
  | "CANVAS_UNAVAILABLE"
  // the plan did not draw. No blob is requested in this case.
  | "EXECUTION_FAILED"
  // toBlob returned null, threw, or the canvas was tainted.
  | "ENCODE_FAILED"
  // the file name could not be built (so nothing is downloaded rather than using a guessed name).
  | "FILE_NAME_UNAVAILABLE";

export type ExportFramePngResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: ExportErrorCode };

/**
 * Max relative difference tolerated between the horizontal and vertical scale.
 *
 * The two output edges are independently rounded integers, so an exactly uniform ratio is not
 * reachable; a 1px rounding on a ~3000px edge is well inside this. Anything larger means the
 * aspect genuinely disagrees and the draw would be distorted, so it fails instead.
 */
export const SCALE_TOLERANCE = 0.005;

const fail = (code: ExportErrorCode): ExportFramePngResult => ({ ok: false, code });

const isPositiveFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isFn = (value: unknown): boolean => typeof value === "function";

/**
 * An export session owns at most ONE live object URL.
 *
 * The legacy download revoked on an 800ms timer, so closing the tab in between leaked the URL and a
 * slow device could have it revoked before the download started. Here the creator revokes: the
 * previous URL is released before a new one is handed out, and `dispose()` releases the last one.
 */
export interface FramePngExporter {
  readonly export: (request: ExportFramePngRequest) => Promise<ExportFramePngResult>;
  /** release any live object URL. Safe to call more than once. */
  readonly dispose: () => void;
}

export function createFramePngExporter(ports: ExportFramePngPorts): FramePngExporter {
  const execute = ports.execute ?? executePreviewRenderPlan;
  let liveUrl: string | null = null;
  let disposed = false;

  const releaseLive = (): void => {
    if (liveUrl === null) return;
    const url = liveUrl;
    liveUrl = null;
    try {
      ports.revokeObjectUrl(url);
    } catch {
      // revoking is best-effort cleanup; a throwing port must not become an export failure
    }
  };

  const run = async (request: ExportFramePngRequest): Promise<ExportFramePngResult> => {
    if (disposed) return fail("INVALID_EXPORT_INPUT");

    // --- 1. validate the request, reading each field exactly once --------------
    const plan = request?.plan;
    const imageBindings = request?.imageBindings;
    const physicalSize = request?.physicalSize;
    if (plan === null || typeof plan !== "object") return fail("INVALID_EXPORT_INPUT");
    if (imageBindings === null || typeof imageBindings !== "object")
      return fail("INVALID_EXPORT_INPUT");
    if (!isFn((imageBindings as PreviewImageBindings).get)) return fail("INVALID_EXPORT_INPUT");
    if (physicalSize === null || typeof physicalSize !== "object")
      return fail("INVALID_EXPORT_INPUT");

    const logical = plan.logicalCanvas;
    if (logical === null || typeof logical !== "object") return fail("INVALID_EXPORT_INPUT");
    const logicalWidth = logical.width;
    const logicalHeight = logical.height;
    if (!isPositiveFinite(logicalWidth) || !isPositiveFinite(logicalHeight))
      return fail("INVALID_EXPORT_INPUT");

    // --- 2. pure size + file name (no canvas exists yet) -----------------------
    const size = computeFramePrintPixelSize(physicalSize);
    if (!size.ok) return fail("INVALID_PRINT_SIZE");
    const { width: outputWidth, height: outputHeight } = size.value;

    const fileName = buildPrintFileName(physicalSize, ports.now());
    if (fileName === null) return fail("FILE_NAME_UNAVAILABLE");

    // --- 3. the scale must be uniform -----------------------------------------
    const scaleX = outputWidth / logicalWidth;
    const scaleY = outputHeight / logicalHeight;
    if (!isPositiveFinite(scaleX) || !isPositiveFinite(scaleY)) return fail("NON_UNIFORM_SCALE");
    if (Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY) > SCALE_TOLERANCE)
      return fail("NON_UNIFORM_SCALE");
    // one scale for both axes: an anisotropic transform would distort what the customer approved
    const printScale = scaleX;

    // --- 4. detached canvas, backing, single uniform transform -----------------
    let canvas: PrintCanvas;
    let context: PrintCanvasContext | null;
    try {
      canvas = ports.createCanvas();
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      context = canvas.getContext("2d");
    } catch {
      return fail("CANVAS_UNAVAILABLE");
    }
    if (context === null || typeof context !== "object") return fail("CANVAS_UNAVAILABLE");
    if (!isFn(context.setTransform)) return fail("CANVAS_UNAVAILABLE");

    try {
      // exactly once, from identity, uniform. The executor draws in logical coordinates only.
      context.setTransform(printScale, 0, 0, printScale, 0, 0);
    } catch {
      return fail("CANVAS_UNAVAILABLE");
    }

    // --- 5. the SAME plan instance and bindings --------------------------------
    const result = execute({
      context,
      // the plan is passed straight through: no clone, no rewrite, no coordinate scaling
      plan: plan as Parameters<typeof executePreviewRenderPlan>[0]["plan"],
      imageBindings: imageBindings as PreviewImageBindings,
    });
    // P-3: a plan that did not draw produces NO file. toBlob is not even called.
    if (!result.ok) return fail("EXECUTION_FAILED");

    // --- 6. encode ------------------------------------------------------------
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((value) => resolve(value ?? null), "image/png");
      } catch {
        // a tainted canvas throws SecurityError here; it is a failure, never a retry
        resolve(null);
      }
    });
    if (blob === null) return fail("ENCODE_FAILED");
    if (disposed) return fail("INVALID_EXPORT_INPUT"); // unmounted mid-encode: hand out nothing

    // --- 7. one live URL, released by its creator -----------------------------
    releaseLive();
    let url: string;
    try {
      url = ports.createObjectUrl(blob);
    } catch {
      return fail("ENCODE_FAILED");
    }
    liveUrl = url;
    try {
      ports.triggerDownload(url, fileName);
    } catch {
      releaseLive();
      return fail("ENCODE_FAILED");
    }
    return { ok: true };
  };

  return {
    export: (request) => run(request).catch(() => fail("INVALID_EXPORT_INPUT")), // never rejects
    dispose: () => {
      disposed = true;
      releaseLive();
    },
  };
}
