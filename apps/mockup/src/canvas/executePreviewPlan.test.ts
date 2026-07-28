// Unit contract for the Canvas plan executor (spec 021 §B–§G).
//
// SCOPE HONESTY: every assertion here runs against a RECORDING FAKE context, not a browser Canvas.
// Passing this file proves command order, preflight, and the save/restore state machine — it does
// NOT prove real Canvas pixels, real clip/drawImage behaviour, CORS-clean sources, DPR, or device
// rendering. Those stay NOT TESTED (later specs). No new Canvas E2E is added by spec 021.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPreviewRenderPlan,
  type PreviewDrawCommand,
  type PreviewRenderPlan,
} from "@denn/render";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executePreviewRenderPlan } from "./executePreviewPlan";
import type { PreviewCanvasContext, PreviewImageBindings } from "./types";

// --- recording fake (spec 021 §B) -------------------------------------------

type MethodName =
  | "save"
  | "restore"
  | "clearRect"
  | "fillRect"
  | "beginPath"
  | "rect"
  | "clip"
  | "drawImage"
  | "strokeRect";
type PropertyName = "fillStyle" | "strokeStyle" | "lineWidth";

const CONTEXT_KEYS: readonly string[] = [
  "save",
  "restore",
  "clearRect",
  "fillRect",
  "beginPath",
  "rect",
  "clip",
  "drawImage",
  "strokeRect",
  "fillStyle",
  "strokeStyle",
  "lineWidth",
];

interface FakeControl {
  /** throw on the Nth (1-based, default 1) *attempt* of this method. */
  readonly throwOn?: { readonly method: MethodName; readonly occurrence?: number };
  /** throw when this style property is assigned. */
  readonly throwOnProperty?: PropertyName;
}

type Op =
  | { readonly kind: "set"; readonly property: PropertyName; readonly value: unknown }
  | {
      readonly kind: "call";
      readonly method: MethodName;
      readonly args: readonly number[];
      /** drawable identity only — never serialized. */
      readonly image?: object;
    };

/**
 * Records every attempted operation (an attempt is recorded *before* a controlled throw, so restore
 * attempts are countable) and can be told to throw at a specific method occurrence or style
 * assignment. Numeric arguments only; the drawable is kept as an object identity.
 */
class RecordingContext implements PreviewCanvasContext {
  readonly ops: Op[] = [];
  readonly calls = new Map<MethodName, number>();
  private styleFill: string | CanvasGradient | CanvasPattern = "#000000";
  private styleStroke: string | CanvasGradient | CanvasPattern = "#000000";
  private width = 1;

  constructor(private readonly control: FakeControl = {}) {}

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.styleFill;
  }
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.assign("fillStyle", value);
    this.styleFill = value;
  }

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.styleStroke;
  }
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.assign("strokeStyle", value);
    this.styleStroke = value;
  }

  get lineWidth(): number {
    return this.width;
  }
  set lineWidth(value: number) {
    this.assign("lineWidth", value);
    this.width = value;
  }

  save(): void {
    this.attempt("save", []);
  }
  restore(): void {
    this.attempt("restore", []);
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this.attempt("clearRect", [x, y, w, h]);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.attempt("fillRect", [x, y, w, h]);
  }
  beginPath(): void {
    this.attempt("beginPath", []);
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.attempt("rect", [x, y, w, h]);
  }
  clip(): void {
    this.attempt("clip", []);
  }
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void {
    this.attempt("drawImage", [dx, dy, dw, dh], image as unknown as object);
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this.attempt("strokeRect", [x, y, w, h]);
  }

  countOf(method: MethodName): number {
    return this.calls.get(method) ?? 0;
  }

  /** Compact, human-readable trace used for exact order assertions. */
  trace(): string[] {
    return this.ops.map((op) => {
      if (op.kind === "set") return `set:${op.property}=${String(op.value)}`;
      return op.args.length === 0 ? `call:${op.method}` : `call:${op.method}(${op.args.join(",")})`;
    });
  }

  private assign(property: PropertyName, value: unknown): void {
    this.ops.push({ kind: "set", property, value });
    if (this.control.throwOnProperty === property) throw new Error("fake style assignment failure");
  }

  private attempt(method: MethodName, args: readonly number[], image?: object): void {
    const seen = this.countOf(method) + 1;
    this.calls.set(method, seen);
    this.ops.push(
      image === undefined ? { kind: "call", method, args } : { kind: "call", method, args, image },
    );
    const control = this.control.throwOn;
    if (control && control.method === method && (control.occurrence ?? 1) === seen) {
      throw new Error("fake canvas operation failure");
    }
  }
}

/** Wraps a context in a Proxy recording every property touched (spec 021 §F runtime evidence). */
function observed(context: PreviewCanvasContext): {
  readonly context: PreviewCanvasContext;
  readonly touched: Set<string>;
} {
  const touched = new Set<string>();
  // Reflect calls deliberately omit the receiver so accessors run with `this` = the real fake:
  // otherwise the fake's own internal property access would show up as "touched".
  const proxy = new Proxy(context, {
    get(target, key) {
      if (typeof key === "string") touched.add(key);
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, key, value) {
      if (typeof key === "string") touched.add(key);
      return Reflect.set(target, key, value);
    },
    has(target, key) {
      if (typeof key === "string") touched.add(key);
      return Reflect.has(target, key);
    },
  });
  return { context: proxy, touched };
}

// --- synthetic fixtures (no URL / base64 / token / real product data) -------

const IMAGE_A = { synthetic: "drawable-a" } as unknown as CanvasImageSource;
const IMAGE_B = { synthetic: "drawable-b" } as unknown as CanvasImageSource;
const BINDINGS: PreviewImageBindings = new Map<string, CanvasImageSource>([
  ["imgA", IMAGE_A],
  ["imgB", IMAGE_B],
]);

const CANVAS = { width: 100, height: 200 } as const;

const plan = (
  commands: readonly PreviewDrawCommand[],
  logicalCanvas: { width: number; height: number } = CANVAS,
): PreviewRenderPlan => ({ kind: "case", logicalCanvas, commands });

const FILL: PreviewDrawCommand = {
  type: "fill-rect",
  layerId: "case:body",
  rect: { x: 0, y: 0, width: 100, height: 200 },
  color: "#191A1D",
};
const STROKE: PreviewDrawCommand = {
  type: "stroke-rect",
  layerId: "case:guide:z1",
  rect: { x: 5, y: 6, width: 40, height: 50 },
  color: "#9F887A",
  width: 2,
};
const IMAGE: PreviewDrawCommand = {
  type: "draw-image-cover",
  layerId: "case:user-image:z1",
  imageRef: "imgA",
  clipRect: { x: 5, y: 6, width: 40, height: 50 },
  drawRect: { x: -3, y: 6, width: 60, height: 50 },
};

/** Generic expectation: outer save → one clear → commands in order → outer restore. */
function expectedTrace(source: PreviewRenderPlan): string[] {
  const out = [
    "call:save",
    `call:clearRect(0,0,${source.logicalCanvas.width},${source.logicalCanvas.height})`,
  ];
  for (const command of source.commands) {
    if (command.type === "fill-rect") {
      const { x, y, width, height } = command.rect;
      out.push(`set:fillStyle=${command.color}`, `call:fillRect(${x},${y},${width},${height})`);
    } else if (command.type === "stroke-rect") {
      const { x, y, width, height } = command.rect;
      out.push(
        `set:strokeStyle=${command.color}`,
        `set:lineWidth=${command.width}`,
        `call:strokeRect(${x},${y},${width},${height})`,
      );
    } else {
      const c = command.clipRect;
      const d = command.drawRect;
      out.push(
        "call:save",
        "call:beginPath",
        `call:rect(${c.x},${c.y},${c.width},${c.height})`,
        "call:clip",
        `call:drawImage(${d.x},${d.y},${d.width},${d.height})`,
        "call:restore",
      );
    }
  }
  out.push("call:restore");
  return out;
}

function realCasePlan(): PreviewRenderPlan {
  const built = buildPreviewRenderPlan({
    kind: "case",
    logicalCanvas: { width: 390, height: 780 },
    bodyColor: "#191A1D",
    image: { width: 1200, height: 1600 },
    defaultTransform: { scale: 1, x: 0, y: 0 },
    zones: [
      {
        id: "z1",
        imageRef: "imgA",
        rect: { units: "logical", x: 10, y: 10, width: 120, height: 160 },
        guide: { color: "#9F887A", width: 2 },
      },
      {
        id: "z2",
        imageRef: "imgB",
        rect: { units: "percent", x: 10, y: 20, width: 50, height: 30 },
        transform: { scale: 1.4, x: 5, y: -5 },
      },
    ],
  });
  if (!built.ok) throw new Error("fixture plan must build");
  return built.plan;
}

function realFramePlan(): PreviewRenderPlan {
  const built = buildPreviewRenderPlan({
    kind: "frame",
    logicalCanvas: { width: 500, height: 500 },
    // canvas ⊇ frameRect ⊇ matRect ⊇ imageZone (spec 024)
    frameRect: { x: 0, y: 0, width: 500, height: 500 },
    matRect: { x: 40, y: 40, width: 420, height: 320 },
    imageZone: { x: 50, y: 50, width: 400, height: 300 },
    frameColor: "#9F887A",
    matColor: "#FFFFFF",
    image: { width: 2000, height: 1000 },
    transform: { scale: 1, x: 0, y: 0 },
    imageRef: "imgA",
    innerBorder: { color: "#191A1D", width: 1 },
  });
  if (!built.ok) throw new Error("fixture plan must build");
  return built.plan;
}

const run = (
  context: PreviewCanvasContext,
  source: PreviewRenderPlan,
  bindings: PreviewImageBindings = BINDINGS,
) => executePreviewRenderPlan({ context, plan: source, imageBindings: bindings });

// --- §C normal execution ----------------------------------------------------

describe("executePreviewRenderPlan — normal execution", () => {
  it("real CanvasRenderingContext2D structurally satisfies the context port", () => {
    // compile-time assertion (spec 021 §2): fails typecheck if the port drifts from the DOM type.
    type Satisfied = CanvasRenderingContext2D extends PreviewCanvasContext ? true : false;
    const satisfied: Satisfied = true;
    expect(satisfied).toBe(true);
  });

  it("empty command plan does outer save, one clear, outer restore only", () => {
    const context = new RecordingContext();
    const result = run(context, plan([]));
    expect(result).toEqual({ ok: true, executedCommands: 0 });
    expect(context.trace()).toEqual(["call:save", "call:clearRect(0,0,100,200)", "call:restore"]);
  });

  it("fill command assigns fillStyle then fillRect", () => {
    const context = new RecordingContext();
    expect(run(context, plan([FILL]))).toEqual({ ok: true, executedCommands: 1 });
    expect(context.trace()).toEqual([
      "call:save",
      "call:clearRect(0,0,100,200)",
      "set:fillStyle=#191A1D",
      "call:fillRect(0,0,100,200)",
      "call:restore",
    ]);
  });

  it("stroke command assigns strokeStyle then lineWidth then strokeRect", () => {
    const context = new RecordingContext();
    expect(run(context, plan([STROKE]))).toEqual({ ok: true, executedCommands: 1 });
    expect(context.trace()).toEqual([
      "call:save",
      "call:clearRect(0,0,100,200)",
      "set:strokeStyle=#9F887A",
      "set:lineWidth=2",
      "call:strokeRect(5,6,40,50)",
      "call:restore",
    ]);
  });

  it("image command runs save→beginPath→rect→clip→drawImage→restore", () => {
    const context = new RecordingContext();
    expect(run(context, plan([IMAGE]))).toEqual({ ok: true, executedCommands: 1 });
    expect(context.trace()).toEqual([
      "call:save",
      "call:clearRect(0,0,100,200)",
      "call:save",
      "call:beginPath",
      "call:rect(5,6,40,50)",
      "call:clip",
      "call:drawImage(-3,6,60,50)",
      "call:restore",
      "call:restore",
    ]);
  });

  it("preserves the command order of a full spec 020 case plan", () => {
    const source = realCasePlan();
    const context = new RecordingContext();
    const result = run(context, source);
    expect(result).toEqual({ ok: true, executedCommands: source.commands.length });
    expect(source.commands.map((c) => c.type)).toEqual([
      "fill-rect",
      "draw-image-cover",
      "draw-image-cover",
      "stroke-rect",
    ]);
    expect(context.trace()).toEqual(expectedTrace(source));
  });

  it("preserves the command order of a full spec 020 frame plan", () => {
    const source = realFramePlan();
    const context = new RecordingContext();
    const result = run(context, source);
    expect(result).toEqual({ ok: true, executedCommands: source.commands.length });
    expect(source.commands.map((c) => c.type)).toEqual([
      "fill-rect",
      "fill-rect",
      "draw-image-cover",
      "stroke-rect",
    ]);
    expect(context.trace()).toEqual(expectedTrace(source));
  });

  it("clears exactly once using the logical canvas size", () => {
    const context = new RecordingContext();
    run(context, plan([FILL, IMAGE, STROKE], { width: 375, height: 812 }));
    expect(context.countOf("clearRect")).toBe(1);
    const clears = context.ops.filter((op) => op.kind === "call" && op.method === "clearRect");
    expect(clears).toEqual([{ kind: "call", method: "clearRect", args: [0, 0, 375, 812] }]);
  });

  it("reuses one drawable identity for repeated imageRefs and looks each ref up once", () => {
    const second: PreviewDrawCommand = { ...IMAGE, layerId: "case:user-image:z2" };
    const lookups: string[] = [];
    const bindings: PreviewImageBindings = {
      get: (ref) => {
        lookups.push(ref);
        return ref === "imgA" ? IMAGE_A : undefined;
      },
    };
    const context = new RecordingContext();
    expect(run(context, plan([IMAGE, second]), bindings)).toEqual({
      ok: true,
      executedCommands: 2,
    });
    expect(lookups).toEqual(["imgA"]);
    const drawn = context.ops.filter((op) => op.kind === "call" && op.method === "drawImage");
    expect(drawn).toHaveLength(2);
    for (const op of drawn) {
      expect(op.kind === "call" && op.image).toBe(IMAGE_A);
    }
  });

  it("does not mutate the plan, the bindings, or the drawables", () => {
    const source = realCasePlan();
    const before = JSON.stringify(source);
    const bindings = new Map<string, CanvasImageSource>([
      ["imgA", IMAGE_A],
      ["imgB", IMAGE_B],
    ]);
    const drawableBefore = JSON.stringify(IMAGE_A);
    expect(run(new RecordingContext(), source, bindings).ok).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
    expect(bindings.size).toBe(2);
    expect(bindings.get("imgA")).toBe(IMAGE_A);
    expect(JSON.stringify(IMAGE_A)).toBe(drawableBefore);
  });
});

// --- §D preflight -----------------------------------------------------------

describe("executePreviewRenderPlan — preflight", () => {
  const bad = (args: unknown) =>
    executePreviewRenderPlan(args as Parameters<typeof executePreviewRenderPlan>[0]);

  it("returns INVALID_EXECUTOR_INPUT for nullish/primitive args without throwing", () => {
    for (const args of [null, undefined, 0, "plan", true, [], () => undefined]) {
      expect(bad(args)).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    }
  });

  it("returns INVALID_EXECUTOR_INPUT for nullish/primitive context or bindings", () => {
    for (const context of [null, undefined, 0, "ctx", {}]) {
      expect(bad({ context, plan: plan([FILL]), imageBindings: BINDINGS })).toEqual({
        ok: false,
        code: "INVALID_EXECUTOR_INPUT",
      });
    }
    for (const imageBindings of [null, undefined, 0, "map", {}, { get: 1 }]) {
      expect(bad({ context: new RecordingContext(), plan: plan([FILL]), imageBindings })).toEqual({
        ok: false,
        code: "INVALID_EXECUTOR_INPUT",
      });
    }
  });

  it("rejects a context missing any required method or style surface", () => {
    for (const missing of CONTEXT_KEYS) {
      const context = new RecordingContext();
      // a Proxy that hides exactly one key, keeping every other member intact.
      const partial = new Proxy(context, {
        get: (t, k, r) => (k === missing ? undefined : Reflect.get(t, k, r)),
        has: (t, k) => (k === missing ? false : Reflect.has(t, k)),
      });
      const result = bad({ context: partial, plan: plan([FILL]), imageBindings: BINDINGS });
      expect(result).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
      expect(context.ops).toEqual([]);
    }
  });

  it("returns INVALID_PLAN for malformed plans and never touches the context", () => {
    const malformed: unknown[] = [
      null,
      undefined,
      42,
      "plan",
      [],
      {},
      { kind: "poster", logicalCanvas: CANVAS, commands: [] },
      { kind: "case", logicalCanvas: null, commands: [] },
      { kind: "case", logicalCanvas: { width: 0, height: 200 }, commands: [] },
      { kind: "case", logicalCanvas: { width: Number.NaN, height: 200 }, commands: [] },
      { kind: "case", logicalCanvas: { width: 100 }, commands: [] },
      { kind: "case", logicalCanvas: CANVAS, commands: null },
      { kind: "case", logicalCanvas: CANVAS, commands: "fill" },
    ];
    for (const candidate of malformed) {
      const context = new RecordingContext();
      const result = bad({ context, plan: candidate, imageBindings: BINDINGS });
      expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
      expect(context.ops).toEqual([]);
    }
  });

  it("returns INVALID_PLAN with the offending index for malformed commands", () => {
    const cases: readonly unknown[] = [
      null,
      undefined,
      "fill-rect",
      { type: "flood-fill", layerId: "l", rect: { x: 0, y: 0, width: 1, height: 1 } },
      {
        type: "fill-rect",
        layerId: "",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        color: "#000000",
      },
      {
        type: "fill-rect",
        layerId: "l",
        rect: { x: 0, y: 0, width: 0, height: 1 },
        color: "#000000",
      },
      {
        type: "fill-rect",
        layerId: "l",
        rect: { x: Number.NaN, y: 0, width: 1, height: 1 },
        color: "#000000",
      },
      { type: "fill-rect", layerId: "l", rect: { x: 0, y: 0, width: 1, height: 1 }, color: "red" },
      {
        type: "fill-rect",
        layerId: "l",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        color: "#12345678",
      },
      {
        type: "stroke-rect",
        layerId: "l",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        color: "#000000",
        width: 0,
      },
      {
        type: "stroke-rect",
        layerId: "l",
        rect: { x: 0, y: 0, width: 1, height: 1 },
        color: "#000000",
        width: Number.POSITIVE_INFINITY,
      },
      {
        type: "draw-image-cover",
        layerId: "l",
        imageRef: "",
        clipRect: { x: 0, y: 0, width: 1, height: 1 },
        drawRect: { x: 0, y: 0, width: 1, height: 1 },
      },
      {
        type: "draw-image-cover",
        layerId: "l",
        imageRef: "imgA",
        clipRect: null,
        drawRect: { x: 0, y: 0, width: 1, height: 1 },
      },
      {
        type: "draw-image-cover",
        layerId: "l",
        imageRef: "imgA",
        clipRect: { x: 0, y: 0, width: 1, height: 1 },
        drawRect: { x: 0, y: 0, width: 1, height: Number.NaN },
      },
    ];
    for (const candidate of cases) {
      const context = new RecordingContext();
      const result = bad({
        context,
        plan: { kind: "case", logicalCanvas: CANVAS, commands: [FILL, candidate] },
        imageBindings: BINDINGS,
      });
      expect(result).toEqual({ ok: false, code: "INVALID_PLAN", commandIndex: 1 });
      expect(context.ops).toEqual([]);
    }
  });

  it("returns MISSING_IMAGE_BINDING before drawing anything", () => {
    const unbound: PreviewDrawCommand = { ...IMAGE, imageRef: "imgMissing" };
    const context = new RecordingContext();
    const result = run(context, plan([FILL, unbound]));
    expect(result).toEqual({ ok: false, code: "MISSING_IMAGE_BINDING", commandIndex: 1 });
    expect(context.ops).toEqual([]);
  });

  it("treats a nullish binding value as a missing binding", () => {
    for (const value of [null, undefined]) {
      const bindings: PreviewImageBindings = {
        get: () => value as unknown as CanvasImageSource | undefined,
      };
      const context = new RecordingContext();
      expect(run(context, plan([IMAGE]), bindings)).toEqual({
        ok: false,
        code: "MISSING_IMAGE_BINDING",
        commandIndex: 0,
      });
      expect(context.ops).toEqual([]);
    }
  });

  it("treats a throwing binding lookup as invalid executor input, not a crash", () => {
    const bindings: PreviewImageBindings = {
      get: () => {
        throw new Error("fake binding lookup failure");
      },
    };
    const context = new RecordingContext();
    expect(run(context, plan([FILL, IMAGE]), bindings)).toEqual({
      ok: false,
      code: "INVALID_EXECUTOR_INPUT",
      commandIndex: 1,
    });
    expect(context.ops).toEqual([]);
  });

  it("failure results carry no identifier, URL, token, message, or stack", () => {
    const secretish = "case:user-image:zone-secret";
    const command: PreviewDrawCommand = {
      type: "draw-image-cover",
      layerId: secretish,
      imageRef: "refDoNotLeak",
      clipRect: { x: 0, y: 0, width: 10, height: 10 },
      drawRect: { x: 0, y: 0, width: 10, height: 10 },
    };
    const result = run(
      new RecordingContext(),
      plan([command]),
      new Map<string, CanvasImageSource>(),
    );
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toEqual(["code", "commandIndex", "ok"]);
    const serialized = JSON.stringify(result);
    for (const forbidden of [secretish, "refDoNotLeak", "http", "token", "message", "stack"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// --- §E restore / exception state machine -----------------------------------

describe("executePreviewRenderPlan — restore and exception paths", () => {
  it("outer save failure attempts no restore", () => {
    const context = new RecordingContext({ throwOn: { method: "save" } });
    expect(run(context, plan([FILL]))).toEqual({ ok: false, code: "CANVAS_OPERATION_FAILED" });
    expect(context.countOf("restore")).toBe(0);
    expect(context.countOf("clearRect")).toBe(0);
    expect(context.countOf("fillRect")).toBe(0);
  });

  it("clear failure still restores once and reports no command index", () => {
    const context = new RecordingContext({ throwOn: { method: "clearRect" } });
    expect(run(context, plan([FILL]))).toEqual({ ok: false, code: "CANVAS_OPERATION_FAILED" });
    expect(context.countOf("restore")).toBe(1);
    expect(context.countOf("fillRect")).toBe(0);
  });

  it("style assignment failure is an operation failure at the right index", () => {
    const context = new RecordingContext({ throwOnProperty: "lineWidth" });
    expect(run(context, plan([FILL, STROKE]))).toEqual({
      ok: false,
      code: "CANVAS_OPERATION_FAILED",
      commandIndex: 1,
    });
    expect(context.countOf("strokeRect")).toBe(0);
    expect(context.countOf("restore")).toBe(1);
  });

  it("inner save failure attempts no inner restore but still restores the outer state", () => {
    // occurrence 2 = the image command's inner save (occurrence 1 is the outer save).
    const context = new RecordingContext({ throwOn: { method: "save", occurrence: 2 } });
    expect(run(context, plan([FILL, IMAGE]))).toEqual({
      ok: false,
      code: "CANVAS_OPERATION_FAILED",
      commandIndex: 1,
    });
    expect(context.countOf("save")).toBe(2);
    expect(context.countOf("restore")).toBe(1); // outer only
    expect(context.countOf("beginPath")).toBe(0);
  });

  it.each(["beginPath", "rect", "clip", "drawImage"] as const)(
    "inner %s failure restores inner and outer exactly once each",
    (method) => {
      const context = new RecordingContext({ throwOn: { method } });
      expect(run(context, plan([FILL, IMAGE]))).toEqual({
        ok: false,
        code: "CANVAS_OPERATION_FAILED",
        commandIndex: 1,
      });
      expect(context.countOf("save")).toBe(2);
      expect(context.countOf("restore")).toBe(2); // inner + outer
    },
  );

  it("inner restore failure reports CANVAS_RESTORE_FAILED and still attempts the outer restore", () => {
    const context = new RecordingContext({ throwOn: { method: "restore" } }); // first restore = inner
    expect(run(context, plan([IMAGE]))).toEqual({
      ok: false,
      code: "CANVAS_RESTORE_FAILED",
      commandIndex: 0,
    });
    expect(context.countOf("restore")).toBe(2);
  });

  it("outer restore failure after successful commands is never reported as success", () => {
    const context = new RecordingContext({ throwOn: { method: "restore" } }); // only restore = outer
    expect(run(context, plan([FILL]))).toEqual({ ok: false, code: "CANVAS_RESTORE_FAILED" });
    expect(context.countOf("fillRect")).toBe(1);
  });

  it("outer restore failure outranks an earlier operation failure", () => {
    const context = new RecordingContext({
      throwOn: { method: "fillRect" },
    });
    // make the single (outer) restore fail as well by wrapping the context.
    const failing: PreviewCanvasContext = new Proxy(context, {
      get: (t, k, r) => {
        if (k === "restore") {
          return () => {
            t.restore();
            throw new Error("fake outer restore failure");
          };
        }
        const value = Reflect.get(t, k, r);
        return typeof value === "function" ? value.bind(t) : value;
      },
    });
    expect(run(failing, plan([FILL]))).toEqual({
      ok: false,
      code: "CANVAS_RESTORE_FAILED",
      commandIndex: 0,
    });
    expect(context.countOf("restore")).toBe(1);
  });

  it("stops executing later commands after the first failure", () => {
    const context = new RecordingContext({ throwOn: { method: "fillRect" } });
    expect(run(context, plan([FILL, IMAGE, STROKE]))).toEqual({
      ok: false,
      code: "CANVAS_OPERATION_FAILED",
      commandIndex: 0,
    });
    expect(context.countOf("drawImage")).toBe(0);
    expect(context.countOf("strokeRect")).toBe(0);
    expect(context.countOf("restore")).toBe(1);
  });

  it("never throws out of the executor on any failure path", () => {
    const controls: FakeControl[] = [
      { throwOn: { method: "save" } },
      { throwOn: { method: "clearRect" } },
      { throwOn: { method: "beginPath" } },
      { throwOn: { method: "rect" } },
      { throwOn: { method: "clip" } },
      { throwOn: { method: "drawImage" } },
      { throwOn: { method: "restore" } },
      { throwOn: { method: "restore", occurrence: 2 } },
      { throwOnProperty: "fillStyle" },
      { throwOnProperty: "strokeStyle" },
      { throwOnProperty: "lineWidth" },
    ];
    for (const control of controls) {
      const context = new RecordingContext(control);
      expect(() => run(context, plan([FILL, IMAGE, STROKE]))).not.toThrow();
    }
  });

  it("does not claim atomic success: a partial draw is still a failure result", () => {
    const context = new RecordingContext({ throwOn: { method: "drawImage" } });
    const result = run(context, plan([FILL, IMAGE]));
    expect(result.ok).toBe(false);
    // the fill already reached the (fake) canvas — pixels are not rolled back by restore.
    expect(context.countOf("fillRect")).toBe(1);
  });
});

// --- hostile getters / Proxy traps / revoked proxies (Codex re-verify [1]) ---

/** A context Proxy whose get/has trap (or one specific key) throws. */
function hostileContext(
  recording: RecordingContext,
  options: {
    readonly getThrows?: string;
    readonly hasThrows?: string;
    readonly allGetsThrow?: boolean;
  },
): PreviewCanvasContext {
  return new Proxy(recording, {
    get(target, key) {
      if (options.allGetsThrow || key === options.getThrows) throw new Error("hostile getter");
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
    has(target, key) {
      if (key === options.hasThrows) throw new Error("hostile has trap");
      return Reflect.has(target, key);
    },
  });
}

/** Copy `source`, then replace one key with a getter that throws. */
function withThrowingKey<T extends object>(source: Record<string, unknown>, key: string): T {
  const clone: Record<string, unknown> = { ...source };
  delete clone[key];
  Object.defineProperty(clone, key, {
    get() {
      throw new Error("hostile getter");
    },
    enumerable: true,
    configurable: true,
  });
  return clone as T;
}

const rawPlanObject = (commands: readonly unknown[]): Record<string, unknown> => ({
  kind: "case",
  logicalCanvas: { width: CANVAS.width, height: CANVAS.height },
  commands,
});

const rawFill = (): Record<string, unknown> => ({
  type: "fill-rect",
  layerId: "case:body",
  rect: { x: 0, y: 0, width: 100, height: 200 },
  color: "#191A1D",
});

const rawImage = (): Record<string, unknown> => ({
  type: "draw-image-cover",
  layerId: "case:user-image:z1",
  imageRef: "imgA",
  clipRect: { x: 5, y: 6, width: 40, height: 50 },
  drawRect: { x: -3, y: 6, width: 60, height: 50 },
});

describe("executePreviewRenderPlan — hostile getters, Proxy traps, revoked proxies", () => {
  const call = (args: unknown) =>
    executePreviewRenderPlan(args as Parameters<typeof executePreviewRenderPlan>[0]);

  it("classifies a throwing context method getter as invalid executor input", () => {
    for (const method of ["save", "restore", "clearRect", "drawImage", "strokeRect"]) {
      const recording = new RecordingContext();
      const context = hostileContext(recording, { getThrows: method });
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call({ context, plan: plan([FILL]), imageBindings: BINDINGS });
      }).not.toThrow();
      expect(result).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
      expect(recording.ops).toEqual([]);
    }
  });

  it("classifies a throwing lineWidth getter and a throwing get/has trap as invalid input", () => {
    const hostiles = [
      { getThrows: "lineWidth" },
      { allGetsThrow: true },
      { hasThrows: "fillStyle" },
      { hasThrows: "strokeStyle" },
    ];
    for (const options of hostiles) {
      const recording = new RecordingContext();
      const context = hostileContext(recording, options);
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call({ context, plan: plan([FILL]), imageBindings: BINDINGS });
      }).not.toThrow();
      expect(result).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
      expect(recording.ops).toEqual([]);
    }
  });

  it("never reads a style VALUE, so a throwing fillStyle/strokeStyle getter is inert", () => {
    // preflight only checks presence via `in`; the executor assigns styles and never reads them.
    for (const key of ["fillStyle", "strokeStyle"]) {
      const recording = new RecordingContext();
      const context = hostileContext(recording, { getThrows: key });
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call({ context, plan: plan([FILL, STROKE]), imageBindings: BINDINGS });
      }).not.toThrow();
      expect(result).toEqual({ ok: true, executedCommands: 2 });
    }
  });

  it("classifies a throwing args-container getter as invalid executor input", () => {
    for (const key of ["context", "plan", "imageBindings"]) {
      const args = withThrowingKey<object>(
        {
          context: new RecordingContext(),
          plan: plan([FILL]),
          imageBindings: BINDINGS,
        },
        key,
      );
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call(args);
      }).not.toThrow();
      expect(result).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    }
  });

  it("classifies a throwing bindings `get` property getter as invalid executor input", () => {
    const recording = new RecordingContext();
    const imageBindings = withThrowingKey<PreviewImageBindings>({}, "get");
    let result: ReturnType<typeof call> | undefined;
    expect(() => {
      result = call({ context: recording, plan: plan([IMAGE]), imageBindings });
    }).not.toThrow();
    expect(result).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    expect(recording.ops).toEqual([]);
  });

  it("classifies a throwing plan getter as an invalid plan", () => {
    for (const key of ["kind", "logicalCanvas", "commands"]) {
      const recording = new RecordingContext();
      const hostilePlan = withThrowingKey<object>(rawPlanObject([rawFill()]), key);
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call({ context: recording, plan: hostilePlan, imageBindings: BINDINGS });
      }).not.toThrow();
      expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
      expect(recording.ops).toEqual([]);
    }
  });

  it("classifies a throwing commands element getter as an invalid plan", () => {
    const recording = new RecordingContext();
    const commands = new Proxy([rawFill(), rawImage()], {
      get(target, key) {
        if (key === "1") throw new Error("hostile element getter");
        return Reflect.get(target, key);
      },
    });
    let result: ReturnType<typeof call> | undefined;
    expect(() => {
      result = call({
        context: recording,
        plan: rawPlanObject(commands),
        imageBindings: BINDINGS,
      });
    }).not.toThrow();
    expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
    expect(recording.ops).toEqual([]);
  });

  it("classifies a throwing command property getter as an invalid plan", () => {
    const hostiles: readonly [Record<string, unknown>, string][] = [
      [rawFill(), "type"],
      [rawFill(), "layerId"],
      [rawFill(), "rect"],
      [rawFill(), "color"],
      [rawImage(), "imageRef"],
      [rawImage(), "clipRect"],
      [rawImage(), "drawRect"],
    ];
    for (const [source, key] of hostiles) {
      const recording = new RecordingContext();
      const command = withThrowingKey<object>(source, key);
      let result: ReturnType<typeof call> | undefined;
      expect(() => {
        result = call({
          context: recording,
          plan: rawPlanObject([rawFill(), command]),
          imageBindings: BINDINGS,
        });
      }).not.toThrow();
      expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
      expect(recording.ops).toEqual([]);
    }
  });

  it("classifies a throwing rect-field getter as an invalid plan", () => {
    const recording = new RecordingContext();
    const command = {
      ...rawFill(),
      rect: withThrowingKey<object>({ x: 0, y: 0, width: 1 }, "height"),
    };
    let result: ReturnType<typeof call> | undefined;
    expect(() => {
      result = call({
        context: recording,
        plan: rawPlanObject([command]),
        imageBindings: BINDINGS,
      });
    }).not.toThrow();
    expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
    expect(recording.ops).toEqual([]);
  });

  it("classifies revoked proxies safely (context/bindings → input, plan → plan)", () => {
    const contextRevocable = Proxy.revocable(new RecordingContext(), {});
    contextRevocable.revoke();
    expect(() =>
      call({ context: contextRevocable.proxy, plan: plan([FILL]), imageBindings: BINDINGS }),
    ).not.toThrow();
    expect(
      call({ context: contextRevocable.proxy, plan: plan([FILL]), imageBindings: BINDINGS }),
    ).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });

    const bindingsRevocable = Proxy.revocable({ get: () => IMAGE_A }, {});
    bindingsRevocable.revoke();
    const recordingForBindings = new RecordingContext();
    expect(
      call({
        context: recordingForBindings,
        plan: plan([IMAGE]),
        imageBindings: bindingsRevocable.proxy,
      }),
    ).toEqual({ ok: false, code: "INVALID_EXECUTOR_INPUT" });
    expect(recordingForBindings.ops).toEqual([]);

    const planRevocable = Proxy.revocable(rawPlanObject([rawFill()]), {});
    planRevocable.revoke();
    const recordingForPlan = new RecordingContext();
    let result: ReturnType<typeof call> | undefined;
    expect(() => {
      result = call({
        context: recordingForPlan,
        plan: planRevocable.proxy,
        imageBindings: BINDINGS,
      });
    }).not.toThrow();
    expect(result).toEqual({ ok: false, code: "INVALID_PLAN" });
    expect(recordingForPlan.ops).toEqual([]);
  });

  it("draws the validated snapshot, not a re-read of a drifting getter", () => {
    let rectReads = 0;
    const drifting: Record<string, unknown> = { type: "fill-rect", layerId: "case:body" };
    Object.defineProperty(drifting, "rect", {
      get() {
        rectReads += 1;
        return rectReads === 1
          ? { x: 1, y: 2, width: 3, height: 4 }
          : { x: 999, y: 999, width: 999, height: 999 };
      },
      enumerable: true,
    });
    let colorReads = 0;
    Object.defineProperty(drifting, "color", {
      get() {
        colorReads += 1;
        return colorReads === 1 ? "#191A1D" : "not-a-color";
      },
      enumerable: true,
    });
    const recording = new RecordingContext();
    expect(
      call({ context: recording, plan: rawPlanObject([drifting]), imageBindings: BINDINGS }),
    ).toEqual({ ok: true, executedCommands: 1 });
    expect(rectReads).toBe(1);
    expect(colorReads).toBe(1);
    expect(recording.trace()).toEqual([
      "call:save",
      "call:clearRect(0,0,100,200)",
      "set:fillStyle=#191A1D",
      "call:fillRect(1,2,3,4)",
      "call:restore",
    ]);
  });

  it("uses the first read of plan.commands and logicalCanvas only", () => {
    let commandReads = 0;
    let canvasReads = 0;
    const hostilePlan: Record<string, unknown> = { kind: "case" };
    Object.defineProperty(hostilePlan, "commands", {
      get() {
        commandReads += 1;
        return commandReads === 1 ? [rawFill()] : [rawFill(), rawFill(), rawFill()];
      },
      enumerable: true,
    });
    Object.defineProperty(hostilePlan, "logicalCanvas", {
      get() {
        canvasReads += 1;
        return canvasReads === 1 ? { width: 100, height: 200 } : { width: 7, height: 9 };
      },
      enumerable: true,
    });
    const recording = new RecordingContext();
    expect(call({ context: recording, plan: hostilePlan, imageBindings: BINDINGS })).toEqual({
      ok: true,
      executedCommands: 1,
    });
    expect(commandReads).toBe(1);
    expect(canvasReads).toBe(1);
    expect(recording.countOf("fillRect")).toBe(1);
    expect(recording.trace()).toContain("call:clearRect(0,0,100,200)");
  });
});

// --- §F forbidden behaviour -------------------------------------------------

describe("executePreviewRenderPlan — forbidden behaviour", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("touches only the declared context surface (no transform/pixel-read/getContext)", () => {
    const recording = new RecordingContext();
    const { context, touched } = observed(recording);
    expect(run(context, realCasePlan()).ok).toBe(true);
    expect([...touched].sort()).toEqual([...CONTEXT_KEYS].sort());
    for (const forbidden of [
      "setTransform",
      "scale",
      "rotate",
      "translate",
      "getImageData",
      "toBlob",
      "toDataURL",
      "getContext",
      "canvas",
      "globalCompositeOperation",
      "imageSmoothingEnabled",
    ]) {
      expect(touched.has(forbidden)).toBe(false);
    }
  });

  it("writes nothing to the console on success or failure", () => {
    const spies = (["log", "warn", "error", "info", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    run(new RecordingContext(), realCasePlan());
    run(new RecordingContext({ throwOn: { method: "drawImage" } }), plan([IMAGE]));
    run(new RecordingContext(), plan([IMAGE]), new Map<string, CanvasImageSource>());
    executePreviewRenderPlan(null as unknown as Parameters<typeof executePreviewRenderPlan>[0]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("executor source references no DOM/network/image/transform API (comments stripped)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sources = ["executePreviewPlan.ts", "types.ts"].map((file) =>
      stripComments(readFileSync(join(here, file), "utf8")),
    );
    const forbidden = [
      /\bfetch\s*\(/,
      /\bnew\s+Image\b/,
      /\bImageBitmap\b/,
      /\bcreateImageBitmap\b/,
      /\bgetContext\b/,
      /\bquerySelector\b/,
      /\bdocument\b/,
      /\bwindow\b/,
      /\bsetTransform\b/,
      /\bgetImageData\b/,
      /\btoBlob\b/,
      /\btoDataURL\b/,
      /\bcrossOrigin\b/,
      /\bgetDownloadURL\b/,
      /\bfirebase\b/,
      /\breact\b/i,
      /\bconsole\s*\./,
      /\bnew\s+URL\b/,
      /\bdevicePixelRatio\b/,
      /\bResizeObserver\b/,
      /:\s*any\b/,
    ];
    for (const source of sources) {
      for (const pattern of forbidden) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});

/** Remove line and block comments so a source scan measures runtime references only. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
