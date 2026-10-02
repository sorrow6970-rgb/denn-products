import type { PreviewRenderPlan } from "@denn/render";
import { executePreviewRenderPlan } from "./executePreviewPlan";
import type { PreviewImageBindings } from "./types";
import type { ExecutePreviewRenderPlanArgs, CanvasExecutionResult } from "./types";
import type { ManagedFontExecutionBorrow } from "../preview/composer-font-proof";

export interface FontExecutionLease extends ManagedFontExecutionBorrow {
  execute(args: ExecutePreviewRenderPlanArgs): CanvasExecutionResult;
}

export interface FontBoundExecution {
  isCurrent(): boolean;
  acquire(): FontExecutionLease | null;
}

// Only this module's shared-executor bindings can enter the combined frame owner.
const fontBindings = new WeakSet<object>();

/** Internal lifetime binding, not an attestation of arbitrary caller plans. The managed product
 * builder supplies its own deeply frozen plan and trusted session ports. No executor injection. */
export function createFontBoundExecution(
  plan: PreviewRenderPlan,
  isCurrent: () => boolean,
  borrow: () => ManagedFontExecutionBorrow | null,
): FontBoundExecution {
  let acquiring = false;
  let validating = false;
  const current = () => {
    if (validating) return false;
    validating = true;
    try {
      return isCurrent() === true;
    } catch {
      return false;
    } finally {
      validating = false;
    }
  };
  const binding: FontBoundExecution = Object.freeze({
    isCurrent: current,
    acquire() {
      if (acquiring) return null;
      acquiring = true;
      let fonts: ManagedFontExecutionBorrow | null = null;
      let transferred = false;
      try {
        const frozenTree = (value: unknown, seen = new Set<object>()): boolean => {
          if (value === null || typeof value !== "object") return typeof value !== "function";
          if (!Object.isFrozen(value) || seen.has(value)) return false;
          const proto = Object.getPrototypeOf(value);
          if (proto !== Object.prototype && proto !== Array.prototype) return false;
          seen.add(value);
          for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
            if (!("value" in descriptor) || !frozenTree(descriptor.value, seen)) return false;
          }
          seen.delete(value);
          return true;
        };
        if (!frozenTree(plan) || !current()) return null;
        fonts = borrow();
        if (!fonts || !current() || !fonts.isCurrent()) return null;
        const owned = fonts;
        let alive = true;
        let operations = 0;
        let checking = false;
        let preparing = false;
        let executing = false;
        let cleaned = false;
        let prepared: CanvasRenderingContext2D | undefined;
        const cleanup = () => {
          if (alive || operations !== 0 || cleaned) return;
          cleaned = true;
          try {
            owned.release();
          } catch {
            /* Logical disposal is terminal. */
          }
        };
        const live = (): boolean => {
          if (!alive || checking) return false;
          checking = true;
          operations++;
          try {
            return owned.isCurrent() === true && alive;
          } catch {
            return false;
          } finally {
            checking = false;
            operations--;
            cleanup();
          }
        };
        const requireLive = () => {
          if (!live()) throw new Error("FONT_EXECUTION_STALE");
        };
        const lease: FontExecutionLease = {
          language: owned.language,
          isCurrent: live,
          prepare(context) {
            if (!alive || preparing || executing || (prepared && prepared !== context))
              return false;
            preparing = true;
            operations++;
            try {
              if (!live() || owned.prepare(context) !== true || !live()) return false;
              prepared = context;
              return true;
            } catch {
              return false;
            } finally {
              preparing = false;
              operations--;
              cleanup();
            }
          },
          execute(args) {
            if (!alive || executing || preparing)
              return { ok: false, code: "INVALID_EXECUTOR_INPUT" };
            executing = true;
            operations++;
            try {
              // Snapshot once: a drifting args getter cannot replace a validated plan/context.
              const context = args.context;
              const candidate = args.plan;
              const imageBindings = args.imageBindings;
              if (candidate !== plan || !prepared || context !== prepared || !live())
                return { ok: false, code: "INVALID_EXECUTOR_INPUT" };
              if (!owned.prepare(prepared) || !live())
                return { ok: false, code: "CANVAS_OPERATION_FAILED" };
              // Guard every native read/write/call, not just the final result. Preserve native
              // receivers and the primitive's already installed DPR/print transform.
              const guarded = new Proxy(context, {
                get(target, key) {
                  requireLive();
                  const value = Reflect.get(target, key, target);
                  requireLive();
                  if (typeof value !== "function") return value;
                  return (...values: unknown[]) => {
                    requireLive();
                    const result = Reflect.apply(value, target, values);
                    requireLive();
                    return result;
                  };
                },
                set(target, key, value) {
                  requireLive();
                  const result = Reflect.set(target, key, value, target);
                  requireLive();
                  return result;
                },
              });
              const result = executePreviewRenderPlan({ context: guarded, plan, imageBindings });
              if (!live() || !owned.prepare(prepared) || !live())
                return { ok: false, code: "CANVAS_OPERATION_FAILED" };
              return result;
            } catch {
              return { ok: false, code: "CANVAS_OPERATION_FAILED" };
            } finally {
              executing = false;
              operations--;
              cleanup();
            }
          },
          release() {
            alive = false;
            prepared = undefined;
            cleanup();
          },
        };
        transferred = true;
        return Object.freeze(lease);
      } catch {
        return null;
      } finally {
        acquiring = false;
        if (!transferred && fonts) {
          try {
            fonts.release();
          } catch {
            /* Finish partial acquisition. */
          }
        }
      }
    },
  });
  fontBindings.add(binding);
  return binding;
}

type Failure = {
  readonly ok: false;
  readonly code:
    | "ISOLATED_INVALID_INPUT"
    | "ISOLATED_UNAVAILABLE"
    | "ISOLATED_STALE"
    | "ISOLATED_RENDER_FAILED"
    | "ISOLATED_PRESENT_FAILED"
    | "ISOLATED_ENCODE_FAILED"
    | "ISOLATED_ALREADY_USED";
};
const fail = (code: Failure["code"]): Failure => ({ ok: false, code });

export interface IsolatedPlanFrame {
  /** Exclusive display target: deliberately discards its previous clip/state/bitmap. */
  present(target: IsolatedDisplayTarget): { readonly ok: true } | Failure;
  /** One attempt per frame. No URL creation, download or retry. */
  encode(): Promise<{ readonly ok: true; readonly blob: Blob } | Failure>;
  release(): void;
}

export interface IsolatedDisplayTarget {
  readonly element: HTMLCanvasElement;
  release(): void;
}

// Creation provenance, not fabricated readback: both factories transfer NEW unused canvases.
// Missing fields are documented as unavailable. Explicit conflicting fields still fail closed.
function settingsAgree(context: CanvasRenderingContext2D): boolean {
  const settings = context.getContextAttributes();
  return (
    (settings.alpha === undefined || settings.alpha === true) &&
    (settings.colorSpace === undefined || settings.colorSpace === "srgb")
  );
}

class DisplayTarget implements IsolatedDisplayTarget {
  #live = true;
  constructor(
    readonly element: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  read(): CanvasRenderingContext2D | null {
    if (!this.#live || !settingsAgree(this.context)) return null;
    return this.#live ? this.context : null;
  }

  release(): void {
    if (!this.#live) return;
    this.#live = false;
    try {
      this.element.width = 0;
      this.element.height = 0;
    } catch {
      // Logical disposal is terminal. Only this owner's bitmap is touched.
    }
  }
}

/** Trusted factory transfers a NEW unused Canvas; no arbitrary existing-target adoption. */
export function createIsolatedDisplayTarget(
  createCanvas: () => HTMLCanvasElement,
): IsolatedDisplayTarget | null {
  let canvas: HTMLCanvasElement | undefined;
  let owned = false;
  let adopted = false;
  try {
    canvas = createCanvas();
    if (!canvas || canvas.isConnected || canvas.parentNode !== null) return null;
    owned = true;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
    if (!context || !settingsAgree(context) || canvas.isConnected || canvas.parentNode !== null)
      return null;
    const target = new DisplayTarget(canvas, context);
    adopted = true;
    return Object.freeze(target);
  } catch {
    return null;
  } finally {
    if (owned && !adopted && canvas) {
      try {
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        // Preserve terminal failure without surfacing native exception text.
      }
    }
  }
}

export interface IsolatedPlanFrameRequest {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly language: "en" | "ko";
  /** Caller applies its existing preview/capture/print size budget before allocation. */
  readonly createCanvas: () => HTMLCanvasElement;
  /** Supplied by the future font lease, NOT a font/glyph proof implemented by this primitive. */
  readonly isCurrent: () => boolean;
  readonly prepare: (context: CanvasRenderingContext2D) => boolean;
  readonly execute?: typeof executePreviewRenderPlan;
}

export type FontBoundPlanFrameRequest = Omit<
  IsolatedPlanFrameRequest,
  "language" | "prepare" | "execute"
> & { readonly fonts: FontBoundExecution };

/** S48: own the independent font borrow until private frame release AND async settlement.
 * Image/proof identity is the caller's explicit current port, not attested by this helper. */
export function renderFontBoundPlanFrame(
  request: FontBoundPlanFrameRequest,
): { readonly ok: true; readonly frame: IsolatedPlanFrame } | Failure {
  let fonts: FontExecutionLease | null = null;
  let frame: IsolatedPlanFrame | undefined;
  let alive = true;
  let operations = 0;
  let checking = false;
  let presenting = false;
  let encoding = false;
  let cleaned = false;
  let transferred = false;
  const cleanup = () => {
    if (alive || operations !== 0 || cleaned) return;
    cleaned = true;
    try {
      fonts?.release();
    } catch {
      /* Logical disposal is terminal. */
    }
  };
  const release = () => {
    if (!alive) return;
    alive = false;
    try {
      frame?.release();
    } catch {
      /* Still finish font disposal. */
    }
    cleanup();
  };
  try {
    const {
      fonts: binding,
      plan,
      imageBindings,
      width,
      height,
      scale,
      createCanvas,
      isCurrent,
    } = request;
    if (!binding || !fontBindings.has(binding)) return fail("ISOLATED_INVALID_INPUT");
    const current = (): boolean => {
      if (!alive || checking) return false;
      checking = true;
      operations++;
      try {
        return isCurrent() === true && alive && fonts?.isCurrent() === true && alive;
      } catch {
        return false;
      } finally {
        checking = false;
        operations--;
        cleanup();
      }
    };
    fonts = binding.acquire();
    if (!fonts || !current()) return fail("ISOLATED_STALE");
    const result = renderIsolatedPlanFrame({
      plan,
      imageBindings,
      width,
      height,
      scale,
      createCanvas,
      language: fonts.language,
      isCurrent: current,
      prepare: fonts.prepare,
      execute: fonts.execute,
    });
    if (!result.ok) return result;
    frame = result.frame;
    if (!current()) return fail("ISOLATED_STALE");
    const owned = frame;
    const owner: IsolatedPlanFrame = {
      present(target) {
        if (presenting || encoding) return fail("ISOLATED_ALREADY_USED");
        if (!current()) return fail("ISOLATED_STALE");
        presenting = true;
        operations++;
        try {
          const outcome = owned.present(target);
          return current() ? outcome : fail("ISOLATED_STALE");
        } catch {
          return fail("ISOLATED_PRESENT_FAILED");
        } finally {
          presenting = false;
          operations--;
          cleanup();
        }
      },
      async encode() {
        if (presenting || encoding) return fail("ISOLATED_ALREADY_USED");
        if (!current()) return fail("ISOLATED_STALE");
        encoding = true;
        operations++;
        try {
          const outcome = await owned.encode();
          return current() ? outcome : fail("ISOLATED_STALE");
        } catch {
          return fail("ISOLATED_ENCODE_FAILED");
        } finally {
          encoding = false;
          operations--;
          cleanup();
        }
      },
      release,
    };
    transferred = true;
    return { ok: true, frame: Object.freeze(owner) };
  } catch {
    return fail("ISOLATED_RENDER_FAILED");
  } finally {
    if (!transferred) release();
  }
}

/**
 * Spec132 S33 internal primitive. No default DOM/FontFace/IO, no production wiring.
 * createCanvas must transfer a NEW, exclusively owned, detached canvas. The frame keeps it
 * private; callers receive neither its context nor its drawable. A font binding must hold its
 * own lease until release/async settlement. Fake ports only prove ordering, not font support.
 */
export function renderIsolatedPlanFrame(
  request: IsolatedPlanFrameRequest,
): { readonly ok: true; readonly frame: IsolatedPlanFrame } | Failure {
  let canvas: HTMLCanvasElement | undefined;
  let owned = false;
  let handedOff = false;
  let alive = true;
  let encoding = false;
  let encoded = false;
  let presenting = false;
  let cleaned = false;
  let sized = false;
  let checking = false;
  const cleanup = () => {
    if (alive || !owned || cleaned || encoding || !canvas) return;
    cleaned = true;
    // Only the transferred private canvas. Never delete DOM nodes or touch caller targets here.
    try {
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // Logical release remains terminal even when physical cleanup fails.
    }
  };
  try {
    const {
      plan,
      imageBindings,
      width,
      height,
      scale,
      language,
      createCanvas,
      isCurrent,
      prepare,
    } = request;
    const execute = request.execute ?? executePreviewRenderPlan;
    if (
      !plan ||
      !imageBindings ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isSafeInteger(4 * width * height) ||
      !Number.isFinite(scale) ||
      scale <= 0 ||
      (language !== "en" && language !== "ko") ||
      typeof createCanvas !== "function" ||
      typeof isCurrent !== "function" ||
      typeof prepare !== "function" ||
      typeof execute !== "function"
    )
      return fail("ISOLATED_INVALID_INPUT");

    const current = (): boolean => {
      if (!alive || checking) return false;
      checking = true;
      try {
        const result = isCurrent();
        // A callback may have reentered release(). Check both sides.
        return (
          alive &&
          result === true &&
          (!owned || (canvas?.isConnected === false && canvas.parentNode === null)) &&
          (!sized ||
            (canvas?.width === width && canvas.height === height && canvas.lang === language))
        );
      } catch {
        return false;
      } finally {
        checking = false;
      }
    };
    const check = () => {
      if (!current()) throw fail("ISOLATED_STALE");
    };
    if (!current()) return fail("ISOLATED_STALE");
    canvas = createCanvas();
    // A connected or parented canvas is not the private resource promised by the factory.
    if (!canvas || canvas.isConnected || canvas.parentNode !== null)
      return fail("ISOLATED_UNAVAILABLE");
    owned = true;
    check();
    canvas.lang = language;
    check();
    canvas.width = width;
    check();
    canvas.height = height;
    check();
    sized = true;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
    check();
    if (!context || canvas.width !== width || canvas.height !== height)
      return fail("ISOLATED_UNAVAILABLE");
    const validSettings = settingsAgree(context);
    check();
    if (!validSettings) return fail("ISOLATED_UNAVAILABLE");
    context.direction = "ltr";
    check();
    if (!prepare(context)) return fail("ISOLATED_RENDER_FAILED");
    check();
    // Never let font preparation reset a caller's effective DPR/print scale afterwards.
    context.setTransform(scale, 0, 0, scale, 0, 0);
    check();
    const result = execute({ context, plan, imageBindings });
    check();
    const succeeded = result.ok;
    check();
    if (!succeeded) return fail("ISOLATED_RENDER_FAILED");

    const privateCanvas = canvas;
    const frame: IsolatedPlanFrame = {
      present(displayTarget) {
        if (!current()) return fail("ISOLATED_STALE");
        if (presenting || encoding || encoded) return fail("ISOLATED_ALREADY_USED");
        if (!(displayTarget instanceof DisplayTarget)) return fail("ISOLATED_INVALID_INPUT");
        const target = displayTarget.element;
        presenting = true;
        let touched = false;
        try {
          if (!target || target === privateCanvas || target.ownerDocument !== canvas?.ownerDocument)
            return fail("ISOLATED_INVALID_INPUT");
          check();
          const display = displayTarget.read();
          check();
          if (!display) return fail("ISOLATED_PRESENT_FAILED");
          // This is an exclusive managed display, not a borrowed arbitrary Canvas context.
          touched = true;
          target.width = width;
          check();
          target.height = height;
          check();
          const sameContext = target.getContext("2d") === display;
          check();
          if (!sameContext || target.width !== width || target.height !== height)
            return fail("ISOLATED_PRESENT_FAILED");
          const displayStillLive = displayTarget.read() === display;
          check();
          if (!displayStillLive) return fail("ISOLATED_PRESENT_FAILED");
          display.setTransform(1, 0, 0, 1, 0, 0);
          check();
          display.drawImage(privateCanvas, 0, 0, width, height);
          check();
          display.setTransform(scale, 0, 0, scale, 0, 0);
          check();
          if (displayTarget.read() !== display) return fail("ISOLATED_PRESENT_FAILED");
          check();
          touched = false;
          return { ok: true };
        } catch {
          return fail(current() ? "ISOLATED_PRESENT_FAILED" : "ISOLATED_STALE");
        } finally {
          if (touched) {
            try {
              target.width = width;
            } catch {
              // The surface caller must also hide every failed frame.
            }
          }
          presenting = false;
          cleanup();
        }
      },
      async encode() {
        if (!current()) return fail("ISOLATED_STALE");
        if (encoding || encoded || presenting) return fail("ISOLATED_ALREADY_USED");
        encoded = true;
        encoding = true;
        try {
          const blob = await new Promise<Blob | null>((resolve) => {
            try {
              privateCanvas.toBlob((value) => resolve(value), "image/png");
            } catch {
              resolve(null);
            }
          });
          if (!current()) return fail("ISOLATED_STALE");
          return blob === null ? fail("ISOLATED_ENCODE_FAILED") : { ok: true, blob };
        } finally {
          encoding = false;
          if (!alive) cleanup();
        }
      },
      release() {
        if (!alive) return;
        alive = false;
        cleanup();
      },
    };
    handedOff = true;
    return { ok: true, frame };
  } catch {
    return fail("ISOLATED_RENDER_FAILED");
  } finally {
    if (!handedOff) {
      alive = false;
      cleanup();
    }
  }
}
