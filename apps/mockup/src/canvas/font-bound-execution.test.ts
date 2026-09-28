// S33 ordering/lifetime fakes only. These do not prove native pixels, glyphs or font axes.
import type { PreviewRenderPlan } from "@denn/render";
import { describe, expect, it, vi } from "vitest";
import {
  createIsolatedDisplayTarget,
  type IsolatedDisplayTarget,
  type IsolatedPlanFrameRequest,
  renderIsolatedPlanFrame,
} from "./font-bound-execution";

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
