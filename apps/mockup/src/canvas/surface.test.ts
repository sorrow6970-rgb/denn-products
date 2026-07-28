// Unit contract for the preview Canvas surface engine (spec 022 §8 Unit). Fake ports only — no DOM
// library, no real canvas, no timer. Real browser pixels are covered by the Chromium E2E; passing
// this file does NOT prove real Canvas rendering.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PreviewRenderPlan } from "@denn/render";
import { describe, expect, it, vi } from "vitest";
import {
  createPreviewSurface,
  LOGICAL_SIZE_TOLERANCE_PX,
  PREVIEW_DPR_CAP,
  type PreviewSurfaceContext,
  type PreviewSurfacePorts,
  type PreviewSurfaceState,
} from "./surface";
import type { PreviewImageBindings } from "./types";

const BINDINGS: PreviewImageBindings = new Map<string, CanvasImageSource>();

const plan = (width: number, height: number): PreviewRenderPlan => ({
  kind: "case",
  logicalCanvas: { width, height },
  commands: [
    {
      type: "fill-rect",
      layerId: "case:body",
      rect: { x: 0, y: 0, width, height },
      color: "#191A1D",
    },
  ],
});

interface Harness {
  readonly ports: PreviewSurfacePorts;
  readonly execute: ReturnType<typeof vi.fn>;
  readonly calls: string[];
  readonly states: PreviewSurfaceState[];
  readonly canvas: {
    width: number;
    height: number;
    getContext: () => PreviewSurfaceContext | null;
  };
  readonly frames: Array<{ id: number; run: () => void; cancelled: boolean }>;
  readonly runFrames: () => void;
  readonly resize: (size: { width: number; height: number } | null) => void;
  readonly observers: { active: number; disconnects: number };
  setSize: (size: { width: number; height: number } | null) => void;
  setSnapshot: (next: { plan: PreviewRenderPlan; imageBindings: PreviewImageBindings }) => void;
  setDpr: (dpr: number) => void;
}

function harness(
  options: {
    size?: { width: number; height: number } | null;
    dpr?: number;
    context?: PreviewSurfaceContext | null;
    contextThrows?: boolean;
    transformThrows?: boolean;
    executeOk?: boolean;
    initialPlan?: PreviewRenderPlan;
  } = {},
): Harness {
  const calls: string[] = [];
  const states: PreviewSurfaceState[] = [];
  const frames: Harness["frames"] = [];
  const observers = { active: 0, disconnects: 0 };
  let size = options.size === undefined ? { width: 300, height: 200 } : options.size;
  let dpr = options.dpr ?? 1;
  let snapshot = { plan: options.initialPlan ?? plan(300, 200), imageBindings: BINDINGS };
  let notify: (() => void) | null = null;
  let nextFrame = 1;

  const context: PreviewSurfaceContext | null =
    options.context === undefined
      ? ({
          setTransform: (a: number, _b: number, _c: number, d: number) => {
            if (options.transformThrows) throw new Error("fake setTransform failure");
            calls.push(`setTransform(${a},${d})`);
          },
        } as unknown as PreviewSurfaceContext)
      : options.context;

  const canvas = {
    width: 0,
    height: 0,
    getContext: (): PreviewSurfaceContext | null => {
      if (options.contextThrows) throw new Error("fake getContext failure");
      calls.push("getContext");
      return context;
    },
  };
  // record every backing assignment (only the ones the engine actually performs)
  const canvasProxy = new Proxy(canvas, {
    set(target, key, value) {
      if (key === "width" || key === "height") calls.push(`set:${String(key)}=${String(value)}`);
      return Reflect.set(target, key, value);
    },
  });

  const execute = vi.fn(() => {
    calls.push("execute");
    return options.executeOk === false
      ? ({ ok: false, code: "CANVAS_OPERATION_FAILED" } as const)
      : ({ ok: true, executedCommands: 1 } as const);
  });

  const ports: PreviewSurfacePorts = {
    canvas: canvasProxy,
    getSnapshot: () => snapshot,
    measure: () => size,
    getDevicePixelRatio: () => dpr,
    schedule: (callback) => {
      const id = nextFrame++;
      frames.push({ id, run: callback, cancelled: false });
      calls.push(`schedule#${id}`);
      return id;
    },
    cancel: (handle) => {
      const frame = frames.find((f) => f.id === handle);
      if (frame) frame.cancelled = true;
      calls.push(`cancel#${handle}`);
    },
    observe: (onResize) => {
      observers.active += 1;
      notify = onResize;
      return () => {
        observers.active -= 1;
        observers.disconnects += 1;
        notify = null;
      };
    },
    onState: (state) => {
      states.push(state);
      calls.push(`state:${state}`);
    },
    execute,
  };

  const runFrames = (): void => {
    // run every scheduled, non-cancelled frame once (in order), like a browser frame tick
    for (const frame of [...frames]) {
      if (frame.cancelled || frame.run === undefined) continue;
      const run = frame.run;
      frame.cancelled = true; // a frame only fires once
      run();
    }
  };

  return {
    ports,
    execute,
    calls,
    states,
    canvas,
    frames,
    runFrames,
    observers,
    resize: (next) => {
      size = next;
      notify?.();
    },
    setSize: (next) => {
      size = next;
    },
    setSnapshot: (next) => {
      snapshot = next;
    },
    setDpr: (next) => {
      dpr = next;
    },
  };
}

describe("preview surface — DPR policy", () => {
  it("caps the preview DPR at 2 and applies it as the context transform", () => {
    for (const [deviceDpr, effective] of [
      [1, 1],
      [2, 2],
      [3.5, 2],
    ] as const) {
      const h = harness({ dpr: deviceDpr });
      const surface = createPreviewSurface(h.ports);
      surface.requestDraw();
      h.runFrames();
      expect(h.calls).toContain(`setTransform(${effective},${effective})`);
      expect(h.canvas.width).toBe(Math.round(300 * effective));
      expect(h.canvas.height).toBe(Math.round(200 * effective));
      surface.dispose();
    }
    expect(PREVIEW_DPR_CAP).toBe(2);
  });
});

describe("preview surface — draw order", () => {
  it("assigns backing, then transforms, then executes", () => {
    const h = harness({ dpr: 2 });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    const order = h.calls.filter(
      (c) => c.startsWith("set:") || c.startsWith("setTransform") || c === "execute",
    );
    expect(order).toEqual(["set:width=600", "set:height=400", "setTransform(2,2)", "execute"]);
    expect(h.states).toEqual(["ready"]);
    surface.dispose();
  });

  it("does not reassign an unchanged backing but still transforms before executing", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    h.calls.length = 0;
    surface.requestDraw();
    h.runFrames();
    expect(h.calls.filter((c) => c.startsWith("set:"))).toEqual([]);
    expect(h.calls.filter((c) => c.startsWith("setTransform") || c === "execute")).toEqual([
      "setTransform(1,1)",
      "execute",
    ]);
    surface.dispose();
  });
});

describe("preview surface — scheduling", () => {
  it("coalesces a resize burst into a single frame", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.resize({ width: 300, height: 200 });
    h.resize({ width: 300, height: 200 });
    surface.requestDraw();
    expect(h.frames.filter((f) => !f.cancelled)).toHaveLength(1);
    h.runFrames();
    expect(h.execute).toHaveBeenCalledTimes(1);
    surface.dispose();
  });

  it("uses the last valid size of the burst", () => {
    const h = harness({ dpr: 1, initialPlan: plan(300, 200) });
    const surface = createPreviewSurface(h.ports);
    h.resize({ width: 111, height: 222 }); // mismatching intermediate size
    h.setSize({ width: 300, height: 200 }); // final size wins because measure() runs at draw time
    h.runFrames();
    expect(h.states).toEqual(["ready"]);
    surface.dispose();
  });

  it("schedules again after the frame ran", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    surface.requestDraw();
    expect(h.calls.filter((c) => c.startsWith("schedule"))).toEqual(["schedule#1", "schedule#2"]);
    surface.dispose();
  });
});

describe("preview surface — size guards", () => {
  it.each([
    ["zero", { width: 0, height: 0 }],
    ["negative", { width: -10, height: 20 }],
    ["NaN", { width: Number.NaN, height: 200 }],
    ["Infinity", { width: Number.POSITIVE_INFINITY, height: 200 }],
    ["unmeasurable", null],
  ])("stays waiting-for-size and draws nothing (%s)", (_label, size) => {
    const h = harness({ size: size as { width: number; height: number } | null });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    expect(h.states).toEqual(["waiting-for-size"]);
    expect(h.execute).not.toHaveBeenCalled();
    expect(h.calls.filter((c) => c.startsWith("set:"))).toEqual([]);
    surface.dispose();
  });

  it("fails safely when the observed size does not match plan.logicalCanvas", () => {
    const h = harness({ size: { width: 320, height: 200 } });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    expect(h.states).toEqual(["failed"]);
    expect(h.execute).not.toHaveBeenCalled();
    surface.dispose();
  });

  it("accepts subpixel drift within the tolerance", () => {
    const h = harness({ size: { width: 300 + LOGICAL_SIZE_TOLERANCE_PX, height: 200 } });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    expect(h.states).toEqual(["ready"]);
    surface.dispose();
  });

  it("recovers when a valid size arrives after a zero size", () => {
    const h = harness({ size: { width: 0, height: 0 } });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    expect(h.states).toEqual(["waiting-for-size"]);
    h.resize({ width: 300, height: 200 });
    h.runFrames();
    expect(h.states).toEqual(["waiting-for-size", "ready"]);
    surface.dispose();
  });
});

describe("preview surface — lifecycle and staleness", () => {
  it("disconnects the observer and cancels the pending frame on dispose", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    surface.dispose();
    expect(h.observers.active).toBe(0);
    expect(h.observers.disconnects).toBe(1);
    expect(h.calls).toContain("cancel#1");
    h.runFrames();
    expect(h.execute).not.toHaveBeenCalled();
  });

  it("neutralises a late frame callback of a disposed surface", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    const pending = h.frames[0];
    surface.dispose();
    h.states.length = 0;
    pending.run(); // browser fires it anyway
    expect(h.execute).not.toHaveBeenCalled();
    expect(h.states).toEqual([]);
  });

  it("keeps one active owner across mount → cleanup → mount (StrictMode)", () => {
    const h = harness();
    const first = createPreviewSurface(h.ports);
    first.requestDraw();
    first.dispose();
    const second = createPreviewSurface(h.ports);
    second.requestDraw();
    expect(h.observers.active).toBe(1);
    expect(h.frames.filter((f) => !f.cancelled)).toHaveLength(1);
    h.runFrames();
    expect(h.execute).toHaveBeenCalledTimes(1);
    second.dispose();
    expect(h.observers.active).toBe(0);
  });

  it("executes only the newest plan when a draw was already scheduled", () => {
    const planB = plan(300, 200);
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw(); // scheduled while plan A is current
    h.setSnapshot({ plan: planB, imageBindings: BINDINGS });
    surface.requestDraw(); // coalesced into the same frame
    h.runFrames();
    expect(h.execute).toHaveBeenCalledTimes(1);
    expect(h.execute.mock.calls[0][0].plan).toBe(planB);
    surface.dispose();
  });

  it("reports each state only once until it changes", () => {
    const h = harness();
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    surface.requestDraw();
    h.runFrames();
    expect(h.states).toEqual(["ready"]);
    surface.dispose();
  });
});

describe("preview surface — safe failures", () => {
  it.each([
    ["null context", { context: null }],
    ["throwing getContext", { contextThrows: true }],
    ["throwing setTransform", { transformThrows: true }],
    ["executor failure", { executeOk: false }],
  ])("turns %s into the failed state without throwing", (_label, options) => {
    const h = harness(options as Parameters<typeof harness>[0]);
    const surface = createPreviewSurface(h.ports);
    expect(() => {
      surface.requestDraw();
      h.runFrames();
    }).not.toThrow();
    expect(h.states).toEqual(["failed"]);
    surface.dispose();
  });

  it("does not schedule an automatic retry after a failure", () => {
    const h = harness({ executeOk: false });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    expect(h.frames.filter((f) => !f.cancelled)).toHaveLength(0);
    surface.dispose();
  });

  it("keeps identifiers out of the reported state", () => {
    const h = harness({ executeOk: false });
    const surface = createPreviewSurface(h.ports);
    surface.requestDraw();
    h.runFrames();
    const serialized = JSON.stringify(h.states);
    expect(serialized).toBe('["failed"]');
    for (const forbidden of ["http", "token", "imageRef", "layerId", "case:body", "data:"]) {
      expect(serialized).not.toContain(forbidden);
    }
    surface.dispose();
  });
});

describe("preview surface — forbidden APIs in production source", () => {
  it("adds no pixel-read, network, URL or CORS API (comments stripped)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sources = ["surface.ts", "usePreviewCanvasSurface.ts", "PreviewCanvasSurface.tsx"].map(
      (file) => stripComments(readFileSync(join(here, file), "utf8")),
    );
    const forbidden = [
      /\bgetImageData\b/,
      /\btoBlob\b/,
      /\btoDataURL\b/,
      /\bfetch\s*\(/,
      /\bcrossOrigin\b/,
      /\bgetDownloadURL\b/,
      /\bnew\s+Image\b/,
      /\bnew\s+URL\b/,
      /\bfirebase\b/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\borientationchange\b/,
      /:\s*any\b/,
    ];
    for (const source of sources) {
      for (const pattern of forbidden) expect(source).not.toMatch(pattern);
    }
  });
});

/** Remove line and block comments so the scan measures runtime references only. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("preview surface — structural ports", () => {
  it("a real canvas + 2d context satisfy the surface ports", () => {
    type CanvasOk = HTMLCanvasElement extends { width: number; height: number } ? true : false;
    type ContextOk = CanvasRenderingContext2D extends PreviewSurfaceContext ? true : false;
    const canvasOk: CanvasOk = true;
    const contextOk: ContextOk = true;
    expect(canvasOk && contextOk).toBe(true);
  });
});
