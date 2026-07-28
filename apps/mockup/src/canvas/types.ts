// Canvas plan-executor boundary types (spec 021 §2, §3, §7). React-free.
//
// Responsibility split: `@denn/render` owns the pure geometry (spec 019) and the deterministic
// preview render PLAN (spec 020); this app layer owns the Canvas 2D execution of that plan. The
// executor NEVER creates a <canvas>, calls getContext, loads an image, or resolves a URL — the
// caller injects both the context and the already-decoded drawables.

import type { PreviewRenderPlan } from "@denn/render";

/**
 * Minimal Canvas 2D surface the executor needs (spec 021 §2). Declared structurally so unit tests
 * can drive a recording fake with no DOM library, while a real `CanvasRenderingContext2D` still
 * satisfies it (asserted at compile time in the unit test).
 *
 * Deliberately absent: `getContext`, `setTransform`/`scale`/`rotate`/`translate` (DPR transform is
 * the caller's job — this executor draws in logical coordinates only), the 9-argument `drawImage`
 * source-crop overload, smoothing flags, `globalCompositeOperation`, and any URL-string drawable.
 */
export interface PreviewCanvasContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;

  save(): void;
  restore(): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
}

/**
 * Read-only lookup from a spec 020 synthetic `imageRef` to an already-decoded, ready-to-draw
 * Canvas drawable held in memory (spec 021 §3).
 *
 * The `imageRef` is ONLY a key: the executor never parses it as a URL, never fetches or decodes it,
 * and never assigns it to `Image.src`. A `ReadonlyMap<string, CanvasImageSource>` structurally
 * satisfies this port. Binding the real image source (and its CORS-clean policy) is a later spec.
 */
export interface PreviewImageBindings {
  get(imageRef: string): CanvasImageSource | undefined;
}

export interface ExecutePreviewRenderPlanArgs {
  /** The caller-owned Canvas 2D execution target (never created or queried by the executor). */
  readonly context: PreviewCanvasContext;
  /** A spec 020 `PreviewRenderPlan`; still re-checked defensively before any draw. */
  readonly plan: PreviewRenderPlan;
  /** In-memory `imageRef` → drawable lookup. */
  readonly imageBindings: PreviewImageBindings;
}

/**
 * Identity-free failure codes (spec 021 §7). A failure never carries a layerId, imageRef, URL,
 * token, or the original exception message/stack.
 */
export type CanvasExecutionErrorCode =
  // context / bindings are unusable (missing methods, non-object, throwing lookup).
  | "INVALID_EXECUTOR_INPUT"
  // the plan is structurally invalid (kind, logicalCanvas, commands, rect/color/width).
  | "INVALID_PLAN"
  // a `draw-image-cover` imageRef has no in-memory binding (or the binding value is nullish).
  | "MISSING_IMAGE_BINDING"
  // a Canvas method or style assignment threw during execution.
  | "CANVAS_OPERATION_FAILED"
  // a `restore()` threw — Canvas state may be polluted, so this is never reported as success.
  | "CANVAS_RESTORE_FAILED";

export type CanvasExecutionResult =
  | {
      readonly ok: true;
      /** Exactly `plan.commands.length`; the leading `clearRect` is not a command. */
      readonly executedCommands: number;
    }
  | {
      readonly ok: false;
      readonly code: CanvasExecutionErrorCode;
      /** Safe 0-based index of the offending command; omitted when there is no such index. */
      readonly commandIndex?: number;
    };
