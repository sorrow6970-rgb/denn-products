// Canvas 2D executor for the spec 020 preview render plan (spec 021). React-free, DOM-free:
// the caller injects the context and the already-decoded drawables.
//
// Hard boundaries (spec 021 §1, §3, §9):
//  - never creates a <canvas>, never calls getContext/querySelector, never touches document/window.
//  - never creates an Image/ImageBitmap, never fetches/decodes, never resolves a URL or storagePath.
//  - `imageRef` is ONLY an in-memory lookup key — it is never parsed as, or used as, a URL. Using it
//    as a URL would break the spec 020 trust boundary.
//  - no console output, no telemetry callback, no stored exception object.
//  - no setTransform and no scale(): DPR/backing transform stays the caller's job and this executor
//    draws in logical coordinates only. Since spec 030 a `draw-image-cover` command MAY carry a
//    quarter-turn rotation; then — and ONLY then — translate()/rotate() run INSIDE that one command,
//    always paired with the save/restore that already wrapped it, so no transform ever leaks into
//    the next command or back to the caller.
//  - never throws: malformed input, hostile getters/Proxy traps, and Canvas failures all come back
//    as an identity-free Result.
//
// Two exception boundaries make "never throws" total:
//  1. preflight READS (property access on args/context/bindings/plan/commands) run inside try/catch,
//     because any of them can be an accessor or a Proxy trap that throws — or a revoked Proxy.
//     Failures classify as INVALID_EXECUTOR_INPUT (args/context/bindings) or INVALID_PLAN (plan).
//  2. every Canvas operation and style assignment runs inside `attempt()`.
//
// Preflight also builds a plain NORMALIZED SNAPSHOT: each validated value is read exactly once and
// copied into a fresh plain object. Execution reads only the snapshot, so a getter cannot return a
// valid value during validation and a different (or throwing) one during the draw. The snapshot
// carries only what a draw needs — no layerId, no imageRef; the drawable is kept as an identity.
//
// Honesty note (spec 021 §5): Canvas pixels are NOT rolled back by save/restore. Preflight prevents
// a partial draw from a structural/binding error, but if the context throws mid-execution, already
// drawn pixels remain. Not committing a failed frame (staging/double-buffer) is a later app spec.

import type {
  CanvasExecutionErrorCode,
  CanvasExecutionResult,
  ExecutePreviewRenderPlanArgs,
  PreviewCanvasContext,
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

/**
 * Rotation needs two methods the spec 021 port does not declare. They are required ONLY when the
 * plan actually contains a rotated command, so a context that satisfies the published port keeps
 * executing every pre-030 plan unchanged; a rotated plan against such a context fails CLOSED in
 * preflight (INVALID_EXECUTOR_INPUT) instead of drawing the photo unrotated.
 */
const ROTATION_METHODS = ["translate", "rotate"] as const;

interface RotationCapableContext {
  translate(x: number, y: number): void;
  rotate(angle: number): void;
}

/** Clockwise radians for a quarter turn. Exact multiples only — no interpolation exists here. */
const QUARTER_TURN_RADIANS = Math.PI / 2;

// --- defensive primitives (accept unknown; never throw on their own) --------
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isFinitePositive = (v: unknown): v is number => isFiniteNum(v) && v > 0;
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

function supportsRotation(
  context: PreviewCanvasContext,
): context is PreviewCanvasContext & RotationCapableContext {
  const record = context as unknown as Record<string, unknown>;
  for (const method of ROTATION_METHODS) {
    if (typeof record[method] !== "function") return false;
  }
  return true;
}

const FAIL_INPUT = { ok: false, code: "INVALID_EXECUTOR_INPUT" } as const;
const FAIL_PLAN = { ok: false, code: "INVALID_PLAN" } as const;

// --- normalized snapshot (plain objects only) -------------------------------

interface SnapshotRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Exactly what a draw needs. No layerId / imageRef; the drawable is an identity only. */
type SnapshotCommand =
  | { readonly type: "fill-rect"; readonly rect: SnapshotRect; readonly color: string }
  | {
      readonly type: "stroke-rect";
      readonly rect: SnapshotRect;
      readonly color: string;
      readonly width: number;
    }
  | {
      readonly type: "draw-image-cover";
      readonly clipRect: SnapshotRect;
      readonly drawRect: SnapshotRect;
      /** spec 030: clockwise quarter turns; 0 means the exact pre-030 draw. */
      readonly rotation: 0 | 1 | 2 | 3;
      readonly drawable: CanvasImageSource;
    }
  | {
      /** spec 028 template art: one stretched draw, no clip, no crop, no state change. */
      readonly type: "draw-image-stretch";
      readonly destRect: SnapshotRect;
      readonly drawable: CanvasImageSource;
    };

interface SnapshotPlan {
  readonly width: number;
  readonly height: number;
  readonly commands: readonly SnapshotCommand[];
}

/** Read x/y/width/height ONCE each, validate the copies, return a fresh plain rect. */
function readRect(value: unknown): SnapshotRect | null {
  if (!isObj(value)) return null;
  const x = value.x;
  const y = value.y;
  const width = value.width;
  const height = value.height;
  if (!isFiniteNum(x) || !isFiniteNum(y)) return null;
  if (!isFinitePositive(width) || !isFinitePositive(height)) return null;
  return { x, y, width, height };
}

/** `undefined` → 0 (absent rotation). Any other non-`0|1|2|3` value → null (invalid plan). */
function readQuarterTurns(value: unknown): 0 | 1 | 2 | 3 | null {
  if (value === undefined) return 0;
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return null;
}

function readSize(value: unknown): { readonly width: number; readonly height: number } | null {
  if (!isObj(value)) return null;
  const width = value.width;
  const height = value.height;
  if (!isFinitePositive(width) || !isFinitePositive(height)) return null;
  return { width, height };
}

/** An image command still needs its binding resolved, so it is reported separately. */
type ReadCommand =
  | { readonly kind: "direct"; readonly command: SnapshotCommand }
  | {
      readonly kind: "image";
      readonly imageRef: string;
      readonly clipRect: SnapshotRect;
      readonly drawRect: SnapshotRect;
      readonly rotation: 0 | 1 | 2 | 3;
    }
  | {
      readonly kind: "stretch";
      readonly imageRef: string;
      readonly destRect: SnapshotRect;
    };

function readCommand(value: unknown): ReadCommand | null {
  if (!isObj(value)) return null;
  // layerId is validated but deliberately NOT copied into the snapshot: a draw never needs it and
  // it must never reach a Result.
  if (!isNonEmptyString(value.layerId)) return null;
  const type = value.type;
  if (type === "fill-rect") {
    const rect = readRect(value.rect);
    const color = value.color;
    if (rect === null || !isHex(color)) return null;
    return { kind: "direct", command: { type: "fill-rect", rect, color } };
  }
  if (type === "stroke-rect") {
    const rect = readRect(value.rect);
    const color = value.color;
    const width = value.width;
    if (rect === null || !isHex(color) || !isFinitePositive(width)) return null;
    return { kind: "direct", command: { type: "stroke-rect", rect, color, width } };
  }
  if (type === "draw-image-cover") {
    // imageRef is read as a non-empty lookup key only — never parsed/validated as a URL.
    const imageRef = value.imageRef;
    const clipRect = readRect(value.clipRect);
    const drawRect = readRect(value.drawRect);
    if (!isNonEmptyString(imageRef) || clipRect === null || drawRect === null) return null;
    // spec 030: read ONCE. Absent is the only accepted absence; every other non-`0|1|2|3` value is
    // an invalid plan — it is never wrapped with a modulo and never defaulted to "no rotation".
    const rotation = readQuarterTurns(value.rotationQuarterTurns);
    if (rotation === null) return null;
    return { kind: "image", imageRef, clipRect, drawRect, rotation };
  }
  if (type === "draw-image-stretch") {
    // spec 028: destination only — there is no source rect, so no crop can be requested here.
    const imageRef = value.imageRef;
    const destRect = readRect(value.destRect);
    if (!isNonEmptyString(imageRef) || destRect === null) return null;
    return { kind: "stretch", imageRef, destRect };
  }
  return null;
}

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

type PreflightFailure = {
  readonly ok: false;
  readonly code: CanvasExecutionErrorCode;
  readonly commandIndex?: number;
};

type Preflight =
  | { readonly ok: true; readonly context: PreviewCanvasContext; readonly plan: SnapshotPlan }
  | PreflightFailure;

type ExecutorSurface =
  | {
      readonly ok: true;
      readonly context: PreviewCanvasContext;
      readonly plan: unknown;
      /** the bindings' `get`, captured once and pre-bound; never re-read from the caller object. */
      readonly lookup: (imageRef: string) => unknown;
    }
  | PreflightFailure;

/**
 * Read the executor surface (args → context, bindings, raw plan). Every property access sits inside
 * the try, so a hostile accessor, a throwing Proxy trap, or a revoked Proxy becomes
 * INVALID_EXECUTOR_INPUT instead of an exception.
 */
function readExecutorSurface(args: unknown): ExecutorSurface {
  try {
    if (!isObj(args)) return FAIL_INPUT;
    const context = args.context;
    const bindings = args.imageBindings;
    const plan = args.plan;
    if (!isUsableContext(context)) return FAIL_INPUT;
    if (!isObj(bindings)) return FAIL_INPUT;
    const get = bindings.get;
    if (typeof get !== "function") return FAIL_INPUT;
    const bound = get as (this: unknown, imageRef: string) => unknown;
    return {
      ok: true,
      context,
      plan,
      lookup: (imageRef: string) => bound.call(bindings, imageRef),
    };
  } catch {
    return FAIL_INPUT;
  }
}

/**
 * Validate the plan and every command, resolve every image binding, and copy the result into a
 * plain snapshot — all before a single Canvas operation runs (spec 021 §4). No partial plan is ever
 * executed, and the snapshot is what execution reads.
 */
function normalizePlan(
  context: PreviewCanvasContext,
  plan: unknown,
  lookup: (imageRef: string) => unknown,
): Preflight {
  if (!isObj(plan)) return FAIL_PLAN;
  const kind = plan.kind;
  if (kind !== "case" && kind !== "frame") return FAIL_PLAN;
  const canvas = readSize(plan.logicalCanvas);
  if (canvas === null) return FAIL_PLAN;
  const rawCommands = plan.commands;
  if (!Array.isArray(rawCommands)) return FAIL_PLAN;

  const commands: SnapshotCommand[] = [];
  // Only the refs actually drawn are looked up, once each: the same ref reuses the same drawable
  // identity, and the binding collection is never cloned, serialized, or logged.
  const resolved = new Map<string, CanvasImageSource>();
  for (let index = 0; index < rawCommands.length; index++) {
    const read = readCommand(rawCommands[index]);
    if (read === null) return { ok: false, code: "INVALID_PLAN", commandIndex: index };
    if (read.kind === "direct") {
      commands.push(read.command);
      continue;
    }
    let drawable = resolved.get(read.imageRef);
    if (drawable === undefined) {
      let bound: unknown;
      try {
        bound = lookup(read.imageRef);
      } catch {
        // a throwing lookup is an unusable caller input; the exception object is not captured.
        return { ok: false, code: "INVALID_EXECUTOR_INPUT", commandIndex: index };
      }
      if (bound === undefined || bound === null) {
        // the missing key itself is deliberately NOT reported (spec 021 §3).
        return { ok: false, code: "MISSING_IMAGE_BINDING", commandIndex: index };
      }
      drawable = bound as CanvasImageSource;
      resolved.set(read.imageRef, drawable);
    }
    if (read.kind === "stretch") {
      commands.push({ type: "draw-image-stretch", destRect: read.destRect, drawable });
      continue;
    }
    // spec 030 fail-closed: a rotated command against a context without translate/rotate is
    // rejected in PREFLIGHT, so nothing is drawn — an unrotated photo is a wrong product, not a
    // graceful degradation.
    if (read.rotation !== 0 && !supportsRotation(context)) {
      return { ok: false, code: "INVALID_EXECUTOR_INPUT", commandIndex: index };
    }
    commands.push({
      type: "draw-image-cover",
      clipRect: read.clipRect,
      drawRect: read.drawRect,
      rotation: read.rotation,
      drawable,
    });
  }

  return { ok: true, context, plan: { width: canvas.width, height: canvas.height, commands } };
}

function preflight(args: unknown): Preflight {
  const surface = readExecutorSurface(args);
  if (!surface.ok) return surface;
  try {
    return normalizePlan(surface.context, surface.plan, surface.lookup);
  } catch {
    // a hostile accessor / Proxy trap / revoked Proxy inside the plan or one of its commands.
    return FAIL_PLAN;
  }
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
 * Execute a single snapshot command. `draw-image-cover` keeps the exact save→beginPath→rect→clip→
 * drawImage→restore order; once the inner save succeeds, the inner restore is attempted exactly
 * once even when a step in between fails. Restore failure outranks operation failure (spec 021 §7).
 */
function executeCommand(
  context: PreviewCanvasContext,
  command: SnapshotCommand,
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
      const { clipRect, drawRect, rotation, drawable } = command;
      if (!attempt(() => context.save())) return "CANVAS_OPERATION_FAILED"; // no inner restore
      const drawn = attempt(() => {
        context.beginPath();
        context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        context.clip();
        if (rotation === 0) {
          // byte-identical to the pre-030 path: no translate, no rotate, same 5-arg drawImage
          context.drawImage(drawable, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
          return;
        }
        // C-4: the centre of rotation is the drawRect centre, which already carries the pan, so
        // rotating never makes the composition jump.
        const rotatable = context as PreviewCanvasContext & RotationCapableContext;
        rotatable.translate(drawRect.x + drawRect.width / 2, drawRect.y + drawRect.height / 2);
        rotatable.rotate(rotation * QUARTER_TURN_RADIANS);
        // drawRect is the ON-SCREEN silhouette; inside the rotated frame a quarter turn exchanges
        // the axes back, so the photo is drawn with its own (pre-rotation) width and height.
        const width = rotation === 2 ? drawRect.width : drawRect.height;
        const height = rotation === 2 ? drawRect.height : drawRect.width;
        context.drawImage(drawable, -width / 2, -height / 2, width, height);
      });
      // The restore below is the ONLY undo for translate/rotate; it is attempted exactly once even
      // when a step above threw, so no transform can leak into the next command.
      if (!attempt(() => context.restore())) return "CANVAS_RESTORE_FAILED";
      return drawn ? null : "CANVAS_OPERATION_FAILED";
    }
    case "draw-image-stretch": {
      // No clip and no style change, so no save/restore pair is needed: one 5-argument drawImage
      // that fills destRect exactly (spec 028 §1). The source aspect is deliberately not preserved.
      const { destRect, drawable } = command;
      const ok = attempt(() => {
        context.drawImage(drawable, destRect.x, destRect.y, destRect.width, destRect.height);
      });
      return ok ? null : "CANVAS_OPERATION_FAILED";
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
 * Never throws — not for malformed input, not for hostile getters/Proxy traps, not for a context
 * that throws mid-draw. Failures return an identity-free `{ok:false, code, commandIndex?}` — no
 * layerId, imageRef, URL, token, or original exception message/stack. A `restore()` failure is
 * never reported as success, and success is never claimed as an "atomic" render (pixels do not roll
 * back).
 */
export function executePreviewRenderPlan(
  args: ExecutePreviewRenderPlanArgs,
): CanvasExecutionResult {
  const pre = preflight(args);
  if (!pre.ok) return failed(pre.code, pre.commandIndex);
  const { context, plan } = pre;

  if (!attempt(() => context.save())) return failed("CANVAS_OPERATION_FAILED"); // no restore

  let failure: { code: CanvasExecutionErrorCode; commandIndex?: number } | null = null;
  // exactly one clear of the whole logical surface, from the snapshot; not counted as a command.
  if (!attempt(() => context.clearRect(0, 0, plan.width, plan.height))) {
    failure = { code: "CANVAS_OPERATION_FAILED" };
  }
  if (failure === null) {
    for (let index = 0; index < plan.commands.length; index++) {
      const code = executeCommand(context, plan.commands[index]);
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
