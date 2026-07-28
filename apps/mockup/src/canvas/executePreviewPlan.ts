// Canvas 2D executor for the spec 020 preview render plan (spec 021). React-free, DOM-free:
// the caller injects the context and the already-decoded drawables.
//
// Hard boundaries (spec 021 §1, §3, §9):
//  - never creates a <canvas>, never calls getContext/querySelector, never touches document/window.
//  - never creates an Image/ImageBitmap, never fetches/decodes, never resolves a URL or storagePath.
//  - `imageRef` is ONLY an in-memory lookup key — it is never parsed as, or used as, a URL. Using it
//    as a URL would break the spec 020 trust boundary.
//  - no console output, no telemetry callback, no stored exception object.
//  - no setTransform/scale/rotate/translate: DPR/backing transform stays the caller's job and this
//    executor draws in logical coordinates only.
//  - never throws: malformed input and Canvas failures come back as an identity-free Result.
//
// Honesty note (spec 021 §5): Canvas pixels are NOT rolled back by save/restore. Preflight prevents
// a partial draw from a structural/binding error, but if the context throws mid-execution, already
// drawn pixels remain. Not committing a failed frame (staging/double-buffer) is a later app spec.

import type { PreviewDrawCommand, PreviewRenderPlan } from "@denn/render";
import type {
  CanvasExecutionErrorCode,
  CanvasExecutionResult,
  ExecutePreviewRenderPlanArgs,
  PreviewCanvasContext,
  PreviewImageBindings,
} from "./types";

// Same `#RRGGBB` grammar as the spec 020 builder (no alpha/functions/vars/named colors).
const HEX = /^#[0-9a-fA-F]{6}$/;

const CONTEXT_METHODS = [
  "save",
  "restore",
  "clearRect",
  "fillRect",
  "beginPath",
  "rect",
  "clip",
  "drawImage",
  "strokeRect",
] as const;

// --- defensive primitives (accept unknown; never throw) ---------------------
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isFinitePositive = (v: unknown): v is number => isFiniteNum(v) && v > 0;
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);
const isSize = (v: unknown): boolean =>
  isObj(v) && isFinitePositive(v.width) && isFinitePositive(v.height);
const isRect = (v: unknown): boolean =>
  isObj(v) &&
  isFiniteNum(v.x) &&
  isFiniteNum(v.y) &&
  isFinitePositive(v.width) &&
  isFinitePositive(v.height);

/**
 * The context must expose every method we call plus the style/lineWidth surface. Only reads happen
 * here — preflight performs zero property assignment and zero Canvas operation (spec 021 §4), so
 * real assignability cannot be probed without mutating; a throwing setter surfaces later as
 * CANVAS_OPERATION_FAILED.
 */
function isUsableContext(context: unknown): context is PreviewCanvasContext {
  if (!isObj(context)) return false;
  for (const method of CONTEXT_METHODS) {
    if (typeof context[method] !== "function") return false;
  }
  if (!("fillStyle" in context) || !("strokeStyle" in context)) return false;
  return typeof context.lineWidth === "number";
}

/** A `{get}` port or a `ReadonlyMap` both satisfy this; the collection itself is never copied. */
function isUsableBindings(bindings: unknown): bindings is PreviewImageBindings {
  return isObj(bindings) && typeof bindings.get === "function";
}

function isValidCommand(command: unknown): command is PreviewDrawCommand {
  if (!isObj(command)) return false;
  if (!isNonEmptyString(command.layerId)) return false;
  switch (command.type) {
    case "fill-rect":
      return isRect(command.rect) && isHex(command.color);
    case "stroke-rect":
      return isRect(command.rect) && isHex(command.color) && isFinitePositive(command.width);
    case "draw-image-cover":
      // imageRef is checked as a non-empty lookup key only — never parsed/validated as a URL.
      return (
        isNonEmptyString(command.imageRef) && isRect(command.clipRect) && isRect(command.drawRect)
      );
    default:
      return false;
  }
}

function isValidPlan(plan: unknown): plan is PreviewRenderPlan {
  if (!isObj(plan)) return false;
  if (plan.kind !== "case" && plan.kind !== "frame") return false;
  if (!isSize(plan.logicalCanvas)) return false;
  if (!Array.isArray(plan.commands)) return false;
  return true;
}

type PreflightFailure = {
  readonly ok: false;
  readonly code: CanvasExecutionErrorCode;
  readonly commandIndex?: number;
};

type Preflight =
  | {
      readonly ok: true;
      readonly context: PreviewCanvasContext;
      readonly plan: PreviewRenderPlan;
      /** aligned with `plan.commands`; non-image commands hold `null`. */
      readonly drawables: readonly (CanvasImageSource | null)[];
    }
  | PreflightFailure;

/**
 * Validate everything before a single Canvas operation runs (spec 021 §4): context surface, plan
 * shape, every command, and every image binding. No partial plan is ever executed.
 */
function preflight(args: unknown): Preflight {
  if (!isObj(args)) return { ok: false, code: "INVALID_EXECUTOR_INPUT" };
  const { context, plan, imageBindings } = args;
  if (!isUsableContext(context)) return { ok: false, code: "INVALID_EXECUTOR_INPUT" };
  if (!isUsableBindings(imageBindings)) return { ok: false, code: "INVALID_EXECUTOR_INPUT" };
  if (!isValidPlan(plan)) return { ok: false, code: "INVALID_PLAN" };

  const commands = plan.commands as readonly unknown[];
  for (let index = 0; index < commands.length; index++) {
    if (!isValidCommand(commands[index]))
      return { ok: false, code: "INVALID_PLAN", commandIndex: index };
  }

  const drawables: (CanvasImageSource | null)[] = [];
  // Only the refs actually drawn are looked up, once each: the same ref reuses the same drawable
  // identity, and the binding collection is never cloned, serialized, or logged.
  const resolved = new Map<string, CanvasImageSource>();
  for (let index = 0; index < plan.commands.length; index++) {
    const command = plan.commands[index];
    if (command.type !== "draw-image-cover") {
      drawables.push(null);
      continue;
    }
    const cached = resolved.get(command.imageRef);
    if (cached !== undefined) {
      drawables.push(cached);
      continue;
    }
    let bound: unknown;
    try {
      bound = imageBindings.get(command.imageRef);
    } catch {
      // a throwing lookup is an unusable caller input; the exception object is not captured.
      return { ok: false, code: "INVALID_EXECUTOR_INPUT", commandIndex: index };
    }
    if (bound === undefined || bound === null) {
      // the missing key itself is deliberately NOT reported (spec 021 §3).
      return { ok: false, code: "MISSING_IMAGE_BINDING", commandIndex: index };
    }
    const drawable = bound as CanvasImageSource;
    resolved.set(command.imageRef, drawable);
    drawables.push(drawable);
  }

  return { ok: true, context, plan, drawables };
}

/** Run one Canvas step; a thrown value is swallowed (never stored, logged, or re-thrown). */
function attempt(operation: () => void): boolean {
  try {
    operation();
    return true;
  } catch {
    return false;
  }
}

const failed = (code: CanvasExecutionErrorCode, commandIndex?: number): CanvasExecutionResult =>
  commandIndex === undefined ? { ok: false, code } : { ok: false, code, commandIndex };

/**
 * Execute a single command. `draw-image-cover` keeps the exact save→beginPath→rect→clip→drawImage→
 * restore order; once the inner save succeeds, the inner restore is attempted exactly once even
 * when a step in between fails. Restore failure outranks operation failure (spec 021 §7).
 */
function executeCommand(
  context: PreviewCanvasContext,
  command: PreviewDrawCommand,
  drawable: CanvasImageSource | null,
): CanvasExecutionErrorCode | null {
  switch (command.type) {
    case "fill-rect": {
      const { rect, color } = command;
      const ok = attempt(() => {
        context.fillStyle = color;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
      });
      return ok ? null : "CANVAS_OPERATION_FAILED";
    }
    case "stroke-rect": {
      const { rect, color, width } = command;
      const ok = attempt(() => {
        context.strokeStyle = color;
        context.lineWidth = width;
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });
      return ok ? null : "CANVAS_OPERATION_FAILED";
    }
    case "draw-image-cover": {
      // preflight guarantees a bound drawable; this is a defensive net, not an expected path.
      if (drawable === null) return "MISSING_IMAGE_BINDING";
      if (!attempt(() => context.save())) return "CANVAS_OPERATION_FAILED"; // no inner restore
      const { clipRect, drawRect } = command;
      const drawn = attempt(() => {
        context.beginPath();
        context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        context.clip();
        context.drawImage(drawable, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
      });
      if (!attempt(() => context.restore())) return "CANVAS_RESTORE_FAILED";
      return drawn ? null : "CANVAS_OPERATION_FAILED";
    }
  }
}

/**
 * Execute a spec 020 preview render plan against a caller-supplied Canvas 2D context.
 *
 * Order (spec 021 §5): outer save → one clearRect over the logical canvas → the plan's commands in
 * their original order (never reordered or merged) → outer restore, attempted exactly once whenever
 * the outer save succeeded. Execution stops at the first failing command.
 *
 * Never throws. Failures return an identity-free `{ok:false, code, commandIndex?}` — no layerId,
 * imageRef, URL, token, or original exception message/stack. A `restore()` failure is never
 * reported as success, and success is never claimed as an "atomic" render (pixels do not roll back).
 */
export function executePreviewRenderPlan(
  args: ExecutePreviewRenderPlanArgs,
): CanvasExecutionResult {
  const pre = preflight(args);
  if (!pre.ok) return failed(pre.code, pre.commandIndex);
  const { context, plan, drawables } = pre;

  if (!attempt(() => context.save())) return failed("CANVAS_OPERATION_FAILED"); // no restore

  let failure: { code: CanvasExecutionErrorCode; commandIndex?: number } | null = null;
  const { width, height } = plan.logicalCanvas;
  // exactly one clear of the whole logical surface; not counted as a command.
  if (!attempt(() => context.clearRect(0, 0, width, height))) {
    failure = { code: "CANVAS_OPERATION_FAILED" };
  }
  if (failure === null) {
    for (let index = 0; index < plan.commands.length; index++) {
      const code = executeCommand(context, plan.commands[index], drawables[index]);
      if (code !== null) {
        failure = { code, commandIndex: index };
        break;
      }
    }
  }

  const restored = attempt(() => context.restore());
  if (!restored) return failed("CANVAS_RESTORE_FAILED", failure?.commandIndex);
  if (failure !== null) return failed(failure.code, failure.commandIndex);
  return { ok: true, executedCommands: plan.commands.length };
}
