// S33 ordering/lifetime fakes only. These do not prove native pixels, glyphs or font axes.
import type { PreviewRenderPlan } from "@denn/render";
import { describe, expect, it, vi } from "vitest";
import {
  createIsolatedDisplayTarget,
  type IsolatedDisplayTarget,
  type IsolatedPlanFrameRequest,
  renderIsolatedPlanFrame,
  createFontBoundExecution,
  renderFontBoundPlanFrame,
  type FontBoundPlanFrameRequest,
} from "./font-bound-execution";

function boundHarness() {
  const plan: PreviewRenderPlan = Object.freeze({
    kind: "frame",
    logicalCanvas: Object.freeze({ width: 100, height: 50 }),
    commands: Object.freeze([
      Object.freeze({
        type: "fill-rect",
        layerId: "mat",
        rect: Object.freeze({ x: 0, y: 0, width: 100, height: 50 }),
        color: "#FFFFFF",
      }),
    ]),
  });
  let parent = true;
  let supply = true;
  const fonts = {
    language: "en" as const,
    isCurrent: vi.fn(() => supply),
    prepare: vi.fn(() => true),
    release: vi.fn(),
  };
  const acquire = vi.fn(() => fonts);
  const binding = createFontBoundExecution(plan, () => parent, acquire);
  const context = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    setTransform: vi.fn(),
  };
  const start = () => {
    const lease = binding.acquire();
    if (!lease) throw new Error("synthetic binding");
    return lease;
  };
  return {
    plan,
    fonts,
    acquire,
    binding,
    context,
    start,
    native: context as unknown as CanvasRenderingContext2D,
    retire: () => {
      supply = false;
    },
    endSession: () => {
      parent = false;
    },
  };
}

describe("spec132 exact font-bound shared execution (fake protocol)", () => {
  it("executes the same frozen plan through the real shared executor without resetting scale", () => {
    const h = boundHarness();
    const lease = h.start();
    expect(lease.prepare(h.native)).toBe(true);
    h.context.setTransform(2, 0, 0, 2, 0, 0);
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() })).toEqual({
      ok: true,
      executedCommands: 1,
    });
    expect(h.context.fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(h.context.setTransform).toHaveBeenCalledTimes(1);
    expect(h.fonts.prepare).toHaveBeenCalledTimes(3);
    lease.release();
    lease.release();
    expect(h.fonts.release).toHaveBeenCalledTimes(1);
  });

  it("rejects a same-content foreign plan before draw", () => {
    const h = boundHarness();
    const lease = h.start();
    lease.prepare(h.native);
    expect(
      lease.execute({
        context: h.context,
        plan: structuredClone(h.plan),
        imageBindings: new Map(),
      }),
    ).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    expect(h.context.fillRect).not.toHaveBeenCalled();
    lease.release();
  });

  it("rejects an unprepared context and a context swapped after preparation", () => {
    const h = boundHarness();
    const lease = h.start();
    const args = { context: h.context, plan: h.plan, imageBindings: new Map() };
    expect(lease.execute(args).ok).toBe(false);
    expect(lease.prepare(h.native)).toBe(true);
    const other = { ...h.context };
    expect(lease.prepare(other as unknown as CanvasRenderingContext2D)).toBe(false);
    expect(lease.execute({ ...args, context: other }).ok).toBe(false);
    expect(h.context.fillRect).not.toHaveBeenCalled();
    lease.release();
  });

  it("rejects shallow frozen plans without acquiring", () => {
    const h = boundHarness();
    const shallow = Object.freeze({ ...h.plan, commands: [...h.plan.commands] });
    const binding = createFontBoundExecution(shallow, () => true, h.acquire);
    expect(binding.acquire()).toBeNull();
    expect(h.acquire).not.toHaveBeenCalled();
  });

  it("rejects an accessor in a frozen plan without invoking it", () => {
    const h = boundHarness();
    const get = vi.fn(() => []);
    const plan = Object.freeze(Object.defineProperty({ ...h.plan }, "commands", { get }));
    expect(createFontBoundExecution(plan, () => true, h.acquire).acquire()).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(h.acquire).not.toHaveBeenCalled();
  });

  it("existing borrow survives measurement-session end but new acquisition fails", () => {
    const h = boundHarness();
    const lease = h.start();
    h.endSession();
    expect(h.binding.isCurrent()).toBe(false);
    expect(h.binding.acquire()).toBeNull();
    expect(lease.isCurrent()).toBe(true);
    lease.prepare(h.native);
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() }).ok).toBe(
      true,
    );
    lease.release();
  });

  it("retirement prevents further draw without implicitly releasing a caller's lease", () => {
    const h = boundHarness();
    const lease = h.start();
    lease.prepare(h.native);
    h.retire();
    expect(lease.isCurrent()).toBe(false);
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() }).ok).toBe(
      false,
    );
    expect(h.context.fillRect).not.toHaveBeenCalled();
    expect(h.fonts.release).not.toHaveBeenCalled();
    lease.release();
  });

  it.each(["current", "prepare", "draw"])("defers physical release during %s reentry", (stage) => {
    const h = boundHarness();
    const lease = h.start();
    lease.prepare(h.native);
    const release = () => {
      lease.release();
      expect(lease.isCurrent()).toBe(false);
      expect(h.fonts.release).not.toHaveBeenCalled();
      return true;
    };
    if (stage === "current") h.fonts.isCurrent.mockImplementation(release);
    else if (stage === "prepare") h.fonts.prepare.mockImplementation(release);
    else h.context.fillRect.mockImplementation(release);
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() }).ok).toBe(
      false,
    );
    expect(h.fonts.release).toHaveBeenCalledTimes(1);
  });

  it("stops later commands after a draw invalidates the supply", () => {
    const h = boundHarness();
    const plan = Object.freeze({
      ...h.plan,
      commands: Object.freeze([...h.plan.commands, ...h.plan.commands]),
    });
    const lease = createFontBoundExecution(plan, () => true, h.acquire).acquire();
    if (!lease) throw new Error("fixture");
    lease.prepare(h.native);
    h.context.fillRect.mockImplementation(h.retire);
    expect(lease.execute({ context: h.context, plan, imageBindings: new Map() }).ok).toBe(false);
    expect(h.context.fillRect).toHaveBeenCalledTimes(1);
    lease.release();
  });

  it("contains drawing exceptions without exposing raw messages", () => {
    const h = boundHarness();
    const lease = h.start();
    lease.prepare(h.native);
    h.context.fillRect.mockImplementation(() => {
      throw new Error("secret");
    });
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() })).toEqual({
      ok: false,
      code: "CANVAS_OPERATION_FAILED",
      commandIndex: 0,
    });
    lease.release();
  });

  it("rejects recursive execute while allowing the outer execution to finish", () => {
    const h = boundHarness();
    const lease = h.start();
    lease.prepare(h.native);
    const args = { context: h.context, plan: h.plan, imageBindings: new Map() };
    h.context.fillRect.mockImplementation(() => {
      expect(lease.execute(args)).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    });
    expect(lease.execute(args).ok).toBe(true);
    expect(h.context.fillRect).toHaveBeenCalledTimes(1);
    lease.release();
  });

  it("rejects recursive acquisition from a trusted borrow callback", () => {
    const h = boundHarness();
    h.acquire.mockImplementation(() => {
      expect(h.binding.acquire()).toBeNull();
      return h.fonts;
    });
    h.start().release();
    expect(h.acquire).toHaveBeenCalledTimes(1);
  });

  it("cleans acquisition when the measurement session ends in the borrow port", () => {
    const h = boundHarness();
    h.acquire.mockImplementation(() => {
      h.endSession();
      return h.fonts;
    });
    expect(h.binding.acquire()).toBeNull();
    expect(h.fonts.release).toHaveBeenCalledTimes(1);
  });

  it("cannot revive a released lease", () => {
    const h = boundHarness();
    const lease = h.start();
    lease.release();
    expect(lease.prepare(h.native)).toBe(false);
    expect(lease.execute({ context: h.context, plan: h.plan, imageBindings: new Map() }).ok).toBe(
      false,
    );
    expect(h.context.fillRect).not.toHaveBeenCalled();
  });
});

const PLAN: PreviewRenderPlan = {
  kind: "case",
  logicalCanvas: { width: 100, height: 50 },
  commands: [],
};

function harness() {
  const calls: string[] = [];
  const documentIdentity = {};
  let current = true;
  let blobCallback: BlobCallback | undefined;
  const makeCanvas = () => {
    let width = 0;
    let height = 0;
    const context = {
      direction: "inherit",
      getContextAttributes: vi.fn(() => ({ alpha: true, colorSpace: "srgb" })),
      setTransform: vi.fn((a: number, _b: number, _c: number, d: number) => {
        calls.push(`scale:${a}:${d}`);
      }),
      drawImage: vi.fn(() => calls.push("copy")),
    };
    const canvas = {
      isConnected: false,
      parentNode: null,
      ownerDocument: documentIdentity,
      lang: "",
      get width() {
        return width;
      },
      set width(value: number) {
        calls.push(`width:${value}`);
        width = value;
      },
      get height() {
        return height;
      },
      set height(value: number) {
        calls.push(`height:${value}`);
        height = value;
      },
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => {
        blobCallback = callback;
      }),
    };
    return { canvas, context, port: canvas as unknown as HTMLCanvasElement };
  };
  const privateTarget = makeCanvas();
  const display = makeCanvas();
  const displayOwner = createIsolatedDisplayTarget(() => display.port);
  if (!displayOwner) throw new Error("synthetic display owner setup");
  const execute = vi.fn(() => {
    calls.push("execute");
    return { ok: true as const, executedCommands: 0 };
  });
  const createCanvas = vi.fn(() => privateTarget.port);
  const prepare = vi.fn(() => {
    calls.push("prepare");
    return true;
  });
  const request: IsolatedPlanFrameRequest = {
    plan: PLAN,
    imageBindings: new Map(),
    width: 200,
    height: 100,
    scale: 2,
    language: "en",
    createCanvas,
    isCurrent: () => current,
    prepare,
    execute,
  };
  const start = (overrides: Partial<IsolatedPlanFrameRequest> = {}) =>
    renderIsolatedPlanFrame({ ...request, ...overrides });
  const frame = () => {
    const result = start();
    if (!result.ok) throw new Error("synthetic setup failed");
    return result.frame;
  };
  return {
    calls,
    request,
    start,
    frame,
    privateTarget,
    display,
    displayOwner,
    execute,
    prepare,
    createCanvas,
    expire: () => {
      current = false;
    },
    settle: (blob: Blob | null) => blobCallback?.(blob),
  };
}

function boundFrameHarness() {
  const h = harness();
  const b = boundHarness();
  // Complete fake native context for the REAL shared executor; no executor override.
  Object.assign(h.privateTarget.context, {
    fillStyle: b.context.fillStyle,
    strokeStyle: b.context.strokeStyle,
    lineWidth: 1,
    save: b.context.save,
    restore: b.context.restore,
    clearRect: b.context.clearRect,
    fillRect: b.context.fillRect,
    beginPath: b.context.beginPath,
    rect: b.context.rect,
    clip: b.context.clip,
    strokeRect: b.context.strokeRect,
  });
  const request: FontBoundPlanFrameRequest = {
    fonts: b.binding,
    plan: b.plan,
    imageBindings: new Map(),
    width: 200,
    height: 100,
    scale: 2,
    createCanvas: h.createCanvas,
    isCurrent: h.request.isCurrent,
  };
  const start = (over: Partial<FontBoundPlanFrameRequest> = {}) =>
    renderFontBoundPlanFrame({ ...request, ...over });
  const frame = () => {
    const result = start();
    if (!result.ok) throw new Error("synthetic bound frame");
    return result.frame;
  };
  return { ...h, b, request, start, frame };
}

describe("spec132 bound private frame async font ownership (fake protocol)", () => {
  it("rejects a structurally forged binding that would inject its own executor", () => {
    const h = boundFrameHarness();
    const acquire = vi.fn(() => ({
      ...h.b.fonts,
      execute: vi.fn(() => ({ ok: true as const, executedCommands: 0 })),
    }));
    expect(h.start({ fonts: { isCurrent: () => true, acquire } })).toEqual({
      ok: false,
      code: "ISOLATED_INVALID_INPUT",
    });
    expect(acquire).not.toHaveBeenCalled();
    expect(h.createCanvas).not.toHaveBeenCalled();
  });

  it("renders/presents/encodes with one independent borrow and owns no URL/download", async () => {
    const h = boundFrameHarness();
    const frame = h.frame();
    expect(h.b.acquire).toHaveBeenCalledTimes(1);
    expect(h.b.context.fillRect).toHaveBeenCalledTimes(1);
    expect(h.privateTarget.context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(frame.present(h.displayOwner)).toEqual({ ok: true });
    const pending = frame.encode();
    const blob = new Blob(["synthetic"], { type: "image/png" });
    h.settle(blob);
    expect(await pending).toEqual({ ok: true, blob });
    expect(h.b.fonts.release).not.toHaveBeenCalled();
    expect(await frame.encode()).toEqual({ ok: false, code: "ISOLATED_ALREADY_USED" });
    frame.release();
    frame.release();
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
    expect(h.privateTarget.canvas.width).toBe(0);
    expect(h.display.canvas.width).toBe(200);
  });

  it("keeps an already acquired frame alive after the measurement session ends", async () => {
    const h = boundFrameHarness();
    const frame = h.frame();
    h.b.endSession();
    expect(h.b.binding.acquire()).toBeNull();
    expect(frame.present(h.displayOwner).ok).toBe(true);
    const pending = frame.encode();
    h.settle(new Blob(["old click"]));
    expect((await pending).ok).toBe(true);
    frame.release();
  });

  it("release during async encode invalidates immediately but holds fonts/bitmap until callback", async () => {
    const h = boundFrameHarness();
    const frame = h.frame();
    const pending = frame.encode();
    frame.release();
    frame.release();
    expect(frame.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_ALREADY_USED" });
    expect(h.b.fonts.release).not.toHaveBeenCalled();
    expect(h.privateTarget.canvas.width).toBe(200);
    h.settle(new Blob(["late"]));
    expect(await pending).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
    expect(h.privateTarget.canvas.width).toBe(0);
    expect(await frame.encode()).toEqual({ ok: false, code: "ISOLATED_STALE" });
  });

  it.each(["proof", "font"])("rejects late Blob after %s retirement", async (source) => {
    const h = boundFrameHarness();
    const frame = h.frame();
    const pending = frame.encode();
    if (source === "proof") h.expire();
    else h.b.retire();
    h.settle(new Blob(["late"]));
    expect(await pending).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.b.fonts.release).not.toHaveBeenCalled();
    frame.release();
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
  });

  it("release reentry during synchronous copy defers font disposal and rejects presentation", () => {
    const h = boundFrameHarness();
    const frame = h.frame();
    h.display.context.drawImage.mockImplementation(() => {
      frame.release();
      expect(h.b.fonts.release).not.toHaveBeenCalled();
      expect(frame.present(h.displayOwner).ok).toBe(false);
      return 0;
    });
    expect(frame.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
  });

  it("contains a reentrant current-port release and keeps logical invalidation terminal", () => {
    const h = boundFrameHarness();
    let outer: ReturnType<typeof h.frame> | undefined;
    let releaseInCurrent = false;
    const result = h.start({
      isCurrent: () => {
        if (releaseInCurrent) {
          outer?.release();
          expect(h.b.fonts.release).not.toHaveBeenCalled();
        }
        return true;
      },
    });
    if (!result.ok) throw new Error("fixture");
    outer = result.frame;
    releaseInCurrent = true;
    expect(outer.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
    expect(h.display.context.drawImage).not.toHaveBeenCalled();
  });

  it.each(["acquire", "proof", "prepare", "foreign-plan", "canvas"])(
    "cleans failed %s acquisition/render",
    (mode) => {
      const h = boundFrameHarness();
      if (mode === "acquire") h.b.endSession();
      if (mode === "proof") h.expire();
      if (mode === "prepare") h.b.fonts.prepare.mockReturnValue(false);
      if (mode === "canvas")
        h.createCanvas.mockImplementation(() => {
          throw new Error("secret");
        });
      const result = h.start(mode === "foreign-plan" ? { plan: structuredClone(h.b.plan) } : {});
      expect(result.ok).toBe(false);
      expect(h.b.fonts.release).toHaveBeenCalledTimes(mode === "acquire" ? 0 : 1);
      if (mode === "acquire" || mode === "proof") expect(h.createCanvas).not.toHaveBeenCalled();
    },
  );

  it("ignores an injected executor rather than allowing a success-forging seam", () => {
    const h = boundFrameHarness();
    const execute = vi.fn(() => ({ ok: true, executedCommands: 0 }));
    const result = renderFontBoundPlanFrame({ ...h.request, execute } as FontBoundPlanFrameRequest);
    expect(result.ok).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(h.b.context.fillRect).toHaveBeenCalledTimes(1);
    if (result.ok) result.frame.release();
  });

  it.each(["null", "throw"])("contains encode %s and permits no retry", async (mode) => {
    const h = boundFrameHarness();
    const frame = h.frame();
    if (mode === "throw")
      h.privateTarget.canvas.toBlob.mockImplementation(() => {
        throw new Error("secret");
      });
    const pending = frame.encode();
    if (mode === "null") h.settle(null);
    expect(await pending).toEqual({ ok: false, code: "ISOLATED_ENCODE_FAILED" });
    expect(await frame.encode()).toEqual({ ok: false, code: "ISOLATED_ALREADY_USED" });
    expect(h.privateTarget.canvas.toBlob).toHaveBeenCalledTimes(1);
    frame.release();
    expect(h.b.fonts.release).toHaveBeenCalledTimes(1);
  });
});

describe("spec132 isolated frame primitive", () => {
  it("uses explicit first-acquisition options and accepts unavailable fields without fabricating them", () => {
    const h = harness();
    const unavailable = {} as { alpha: boolean; colorSpace: string };
    h.privateTarget.context.getContextAttributes.mockReturnValue(unavailable);
    h.display.context.getContextAttributes.mockReturnValue(unavailable);
    const frame = h.frame();
    expect(h.privateTarget.canvas.getContext).toHaveBeenCalledWith("2d", {
      alpha: true,
      colorSpace: "srgb",
    });
    expect(h.display.canvas.getContext).toHaveBeenCalledWith("2d", {
      alpha: true,
      colorSpace: "srgb",
    });
    expect(frame.present(h.displayOwner).ok).toBe(true);
    expect(unavailable).toEqual({});
    frame.release();
    h.displayOwner.release();
  });

  it("rejects a forged display capability without acquiring its context", () => {
    const h = harness();
    const frame = h.frame();
    h.display.canvas.getContext.mockClear();
    expect(frame.present({ element: h.display.port, release() {} })).toEqual({
      ok: false,
      code: "ISOLATED_INVALID_INPUT",
    });
    expect(h.display.canvas.getContext).not.toHaveBeenCalled();
    frame.release();
  });

  it("rejects a released display before touching it", () => {
    const h = harness();
    const frame = h.frame();
    h.displayOwner.release();
    const count = h.calls.length;
    h.displayOwner.release();
    expect(frame.present(h.displayOwner).ok).toBe(false);
    expect(h.calls).toHaveLength(count);
    frame.release();
  });

  it("rejects release reentrancy during the display copy", () => {
    const h = harness();
    const frame = h.frame();
    h.display.context.drawImage.mockImplementation(() => {
      h.displayOwner.release();
      return 0;
    });
    expect(frame.present(h.displayOwner).ok).toBe(false);
    frame.release();
  });

  it("never adopts a connected canvas or conflicting first-acquisition settings", () => {
    const h = harness();
    h.display.canvas.isConnected = true;
    expect(createIsolatedDisplayTarget(() => h.display.port)).toBeNull();
    h.display.canvas.isConnected = false;
    h.display.context.getContextAttributes.mockReturnValue({
      alpha: true,
      colorSpace: "display-p3",
    });
    expect(createIsolatedDisplayTarget(() => h.display.port)).toBeNull();
  });

  it("passes exact plan/bindings to one executor after prepare and output transform", () => {
    const h = harness();
    const frame = h.frame();
    expect(h.execute).toHaveBeenCalledExactlyOnceWith({
      plan: PLAN,
      imageBindings: h.request.imageBindings,
      context: h.privateTarget.context,
    });
    expect(h.calls).toEqual(["width:200", "height:100", "prepare", "scale:2:2", "execute"]);
    expect(h.privateTarget.canvas.lang).toBe("en");
    expect(h.privateTarget.context.direction).toBe("ltr");
    expect(Object.keys(frame).sort()).toEqual(["encode", "present", "release"]);
    frame.release();
  });

  it.each([
    { width: 0 },
    { height: -1 },
    { width: 0.5 },
    { width: Number.MAX_SAFE_INTEGER },
    { scale: Number.NaN },
    { scale: 0 },
    { language: "fr" as "en" },
  ])("rejects invalid bounds before allocation: %j", (change) => {
    const h = harness();
    expect(h.start(change)).toEqual({ ok: false, code: "ISOLATED_INVALID_INPUT" });
    expect(h.createCanvas).not.toHaveBeenCalled();
  });

  it("rejects stale/throwing currentness before allocation", () => {
    const h = harness();
    h.expire();
    expect(h.start()).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(
      h.start({
        isCurrent: () => {
          throw new Error("must not escape");
        },
      }),
    ).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.createCanvas).not.toHaveBeenCalled();
  });

  it("does not clear a connected factory result", () => {
    const h = harness();
    h.privateTarget.canvas.isConnected = true;
    expect(h.start()).toEqual({ ok: false, code: "ISOLATED_UNAVAILABLE" });
    expect(h.calls).toEqual([]);
  });

  it("rejects a private target with incompatible color/alpha settings", () => {
    const h = harness();
    h.privateTarget.context.getContextAttributes.mockReturnValue({
      alpha: false,
      colorSpace: "srgb",
    });
    expect(h.start()).toEqual({ ok: false, code: "ISOLATED_UNAVAILABLE" });
    expect(h.execute).not.toHaveBeenCalled();
  });

  it("rejects existing display color space instead of assuming getContext options changed it", () => {
    const h = harness();
    const frame = h.frame();
    h.display.context.getContextAttributes.mockReturnValue({
      alpha: true,
      colorSpace: "display-p3",
    });
    expect(frame.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_PRESENT_FAILED" });
    expect(h.display.context.drawImage).not.toHaveBeenCalled();
    frame.release();
  });

  it("rejects dimension mutation during preparation", () => {
    const h = harness();
    h.prepare.mockImplementation(() => {
      h.privateTarget.canvas.width = 1;
      return true;
    });
    expect(h.start().ok).toBe(false);
    expect(h.execute).not.toHaveBeenCalled();
  });

  it.each(["prepare-false", "prepare-throw", "prepare-retire", "execute-throw", "execute-retire"])(
    "never hands off after %s and clears only its private bitmap",
    (mode) => {
      const h = harness();
      h.prepare.mockImplementation(() => {
        if (mode === "prepare-false") return false;
        if (mode === "prepare-throw") throw new Error("private message");
        if (mode === "prepare-retire") h.expire();
        return true;
      });
      h.execute.mockImplementation(() => {
        if (mode === "execute-throw") throw new Error("private message");
        if (mode === "execute-retire") h.expire();
        return { ok: true, executedCommands: 0 };
      });
      expect(h.start().ok).toBe(false);
      expect(h.privateTarget.canvas.width).toBe(0);
      expect(h.privateTarget.canvas.height).toBe(0);
      expect(h.display.context.drawImage).not.toHaveBeenCalled();
      if (mode.startsWith("prepare")) expect(h.execute).not.toHaveBeenCalled();
    },
  );

  it("resets display even at the same dimensions, copies 1:1, then reapplies scale", () => {
    const h = harness();
    const frame = h.frame();
    h.calls.length = 0;
    expect(frame.present(h.displayOwner)).toEqual({ ok: true });
    expect(h.calls).toEqual(["width:200", "height:100", "scale:1:1", "copy", "scale:2:2"]);
    expect(h.display.context.drawImage).toHaveBeenCalledWith(h.privateTarget.port, 0, 0, 200, 100);
    expect(h.privateTarget.canvas.width).toBe(200);
    h.calls.length = 0;
    expect(frame.present(h.displayOwner)).toEqual({ ok: true });
    expect(h.calls.slice(0, 2)).toEqual(["width:200", "height:100"]);
    frame.release();
  });

  it("rejects own/foreign-document display without touching it", () => {
    const h = harness();
    const frame = h.frame();
    h.calls.length = 0;
    expect(frame.present(h.privateTarget.port as unknown as IsolatedDisplayTarget).ok).toBe(false);
    h.display.canvas.ownerDocument = {};
    expect(frame.present(h.displayOwner).ok).toBe(false);
    expect(h.calls).toEqual([]);
    frame.release();
  });

  it.each(["throw", "retire", "release"])("clears failed display after copy %s", (mode) => {
    const h = harness();
    const frame = h.frame();
    h.display.context.drawImage.mockImplementation(() => {
      if (mode === "throw") throw new Error("private pixels");
      if (mode === "retire") h.expire();
      if (mode === "release") frame.release();
      return 0;
    });
    expect(frame.present(h.displayOwner).ok).toBe(false);
    expect(h.calls.at(-1)).toBe("width:200");
    frame.release();
  });

  it("blocks reentrant presentation and terminal release is idempotent", () => {
    const h = harness();
    const frame = h.frame();
    h.display.context.drawImage.mockImplementation(() => {
      expect(frame.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_ALREADY_USED" });
      return 0;
    });
    expect(frame.present(h.displayOwner).ok).toBe(true);
    frame.release();
    const count = h.calls.length;
    frame.release();
    expect(frame.present(h.displayOwner)).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.calls).toHaveLength(count);
  });

  it("encodes the original output target once, retains it until settlement", async () => {
    const h = harness();
    const frame = h.frame();
    const pending = frame.encode();
    expect(await frame.encode()).toEqual({ ok: false, code: "ISOLATED_ALREADY_USED" });
    expect(frame.present(h.displayOwner).ok).toBe(false);
    const blob = new Blob(["synthetic"]);
    h.settle(blob);
    expect(await pending).toEqual({ ok: true, blob });
    expect(h.privateTarget.canvas.toBlob).toHaveBeenCalledTimes(1);
    expect(h.privateTarget.canvas.width).toBe(200);
    frame.release();
    expect(h.privateTarget.canvas.width).toBe(0);
  });

  it("defers physical release during encode and rejects the late blob", async () => {
    const h = harness();
    const frame = h.frame();
    const pending = frame.encode();
    frame.release();
    expect(h.privateTarget.canvas.width).toBe(200);
    h.settle(new Blob(["late"]));
    expect(await pending).toEqual({ ok: false, code: "ISOLATED_STALE" });
    expect(h.privateTarget.canvas.width).toBe(0);
  });

  it.each(["null", "throw", "retire"])("does not retry after encode %s", async (mode) => {
    const h = harness();
    const frame = h.frame();
    if (mode === "throw")
      h.privateTarget.canvas.toBlob.mockImplementation(() => {
        throw new Error("secret exception");
      });
    const pending = frame.encode();
    if (mode === "retire") h.expire();
    if (mode !== "throw") h.settle(mode === "null" ? null : new Blob());
    expect((await pending).ok).toBe(false);
    expect((await frame.encode()).ok).toBe(false);
    expect(h.privateTarget.canvas.toBlob).toHaveBeenCalledTimes(1);
    frame.release();
  });
});
