// Fake measurement verifies exact builder/lifetime protocol, not native glyphs or UI integration.
import { describe, expect, it, vi } from "vitest";
import type { FramePreviewGeometry } from "@denn/shared";
import type { FrameProductPlanInput, TextMeasurePort } from "../canvas/productPlan";
import { buildFrameProductPlan } from "../canvas/productPlan";
import type { ManagedFontMeasurementSession } from "./composer-font-proof";
import { buildManagedFrameProductPlan } from "./composer-room-source";

function harness() {
  const zone: FramePreviewGeometry["textZones"][number] = {
    key: "main",
    xPercent: 50,
    yPercent: 50,
    boxWidthPercent: 60,
    fontSizePercent: 5,
    align: "center",
    fontFamily: "Synthetic",
    bold: false,
    italic: false,
    color: "#112233",
    lineHeight: 1.2,
    letterSpacingPercent: 0,
    rotationDegrees: 0,
    maxChars: 100,
    maxLines: 4,
    placeholder: "not customer text",
  };
  const input: FrameProductPlanInput = {
    geometry: {
      aspect: 1.4,
      borderPercentOfWidth: 5,
      matColor: "#FFFFFF",
      contentInsetPx: 8,
      textZones: [zone],
      clockPreview: null,
    },
    frameColor: "#663300",
    logicalWidth: 400,
    userImage: {
      imageRef: "photo",
      intrinsicSize: { width: 500, height: 400 },
      transform: { scale: 1, x: 0, y: 0 },
    },
    textValues: new Map([["main", "AV To ffi DENN"]]),
  };
  const measure = vi.fn<TextMeasurePort>(({ text }) => text.length * 10);
  const session: ManagedFontMeasurementSession = {
    bindings: Object.freeze([
      Object.freeze({
        revision: "fp5-static-v1/dm-normal-400",
        family: "Synthetic",
        weight: "normal",
        italic: false,
        identity: {},
        alias: "denn_00000000-0000-4000-8000-000000000001",
        language: "en",
      }),
    ]),
    isCurrent: vi.fn(() => true),
    measureText: measure,
    borrowExecution: vi.fn(() => null),
    release: vi.fn(),
  };
  const start = () => buildManagedFrameProductPlan(input, session);
  return { input, zone, session, measure, start };
}

describe("spec132 managed final plan", () => {
  it("hands the real builder plan to bound shared text execution with its measured alias", () => {
    const h = harness();
    let alive = true;
    const borrowed = {
      language: "en" as const,
      isCurrent: () => alive,
      prepare: vi.fn(() => alive),
      release: vi.fn(() => {
        alive = false;
      }),
    };
    Reflect.set(
      h.session,
      "borrowExecution",
      vi.fn(() => borrowed),
    );
    const result = h.start();
    if (!result.ok) throw new Error("fixture");
    const context = {
      fillStyle: "#000000",
      strokeStyle: "#000000",
      lineWidth: 1,
      font: "1px serif",
      textAlign: "left" as CanvasTextAlign,
      textBaseline: "top" as CanvasTextBaseline,
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 }) as TextMetrics),
      fillText: vi.fn((_text: string, _x: number, _y: number) => {
        expect(context.font).toContain(h.session.bindings[0].alias);
      }),
    };
    const execution = result.execution.acquire();
    if (!execution) throw new Error("fixture");
    expect(execution.prepare(context as unknown as CanvasRenderingContext2D)).toBe(true);
    const outcome = execution.execute({
      context,
      plan: result.plan,
      imageBindings: new Map([["photo", {} as CanvasImageSource]]),
    });
    expect(outcome.ok).toBe(true);
    expect(context.fillText.mock.calls.map(([text]) => text)).toEqual(
      result.plan.commands.flatMap((cmd) =>
        cmd.type === "draw-text" ? cmd.lines.map((line) => line.text) : [],
      ),
    );
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    execution.release();
    expect(borrowed.release).toHaveBeenCalledTimes(1);
  });

  it("uses the same builder with alias geometry and exact measured wrapping, leaving inputs unchanged", () => {
    const h = harness();
    const before = structuredClone(h.input);
    const result = h.start();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("fixture");
    const expected = buildFrameProductPlan({
      ...h.input,
      geometry: {
        ...h.input.geometry,
        textZones: [{ ...h.zone, fontFamily: h.session.bindings[0].alias }],
      },
      measureText: h.measure,
    });
    expect(expected.ok).toBe(true);
    if (!expected.ok) throw new Error("fixture");
    expect(result.plan).toEqual(expected.plan);
    expect(h.input).toEqual(before);
    const command = result.plan.commands.find((item) => item.type === "draw-text");
    expect(command?.type).toBe("draw-text");
    if (command?.type === "draw-text") {
      expect(command.font.family).toBe(h.session.bindings[0].alias);
      expect(command.lines.flatMap((line) => line.text).join(" ")).toBe("AV To ffi DENN");
      expect(Object.isFrozen(command.font)).toBe(true);
      expect(Object.isFrozen(command.lines[0])).toBe(true);
    }
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan.commands)).toBe(true);
    expect(Object.isFrozen(result.plan.logicalCanvas)).toBe(true);
    expect(Object.isFrozen(h.input.geometry)).toBe(false);
    expect(h.session.borrowExecution).not.toHaveBeenCalled();
    expect(h.session.release).not.toHaveBeenCalled();
  });

  it("rejects nested plan mutation at runtime", () => {
    const result = harness().start();
    if (!result.ok) throw new Error("fixture");
    expect(() => Reflect.set(result.plan.logicalCanvas, "width", 1)).not.toThrow();
    expect(Reflect.set(result.plan.logicalCanvas, "width", 1)).toBe(false);
    expect(() => (result.plan.commands as unknown[]).push({})).toThrow();
  });

  it.each([undefined, ""])("inactive customer text %s does not require the zone font", (text) => {
    const h = harness();
    const map = new Map<string, string>();
    if (text !== undefined) map.set("main", text);
    Reflect.set(h.input, "textValues", map);
    Reflect.set(h.zone, "fontFamily", "Not supplied");
    Object.defineProperty(h.zone, "placeholder", {
      get() {
        throw new Error("private placeholder");
      },
    });
    const result = h.start();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.commands.some((c) => c.type === "draw-text")).toBe(false);
    expect(h.measure).not.toHaveBeenCalled();
  });

  it.each(["family", "bold", "italic"])("requires exact active %s", (key) => {
    const h = harness();
    Reflect.set(h.zone, key === "family" ? "fontFamily" : key, key === "family" ? "Other" : true);
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_FONT_UNAVAILABLE" });
    expect(h.measure).not.toHaveBeenCalled();
  });

  it("handles all active styles rather than only the first text command", () => {
    const h = harness();
    const bold = {
      ...h.session.bindings[0],
      weight: "bold" as const,
      alias: "denn_00000000-0000-4000-8000-000000000002",
      identity: {},
    };
    Reflect.set(h.session, "bindings", [...h.session.bindings, bold]);
    Reflect.set(h.input.geometry, "textZones", [h.zone, { ...h.zone, key: "name", bold: true }]);
    Reflect.set(
      h.input,
      "textValues",
      new Map([
        ["main", "AV"],
        ["name", "To"],
      ]),
    );
    const result = h.start();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("fixture");
    const fonts = result.plan.commands.filter((c) => c.type === "draw-text").map((c) => c.font);
    expect(fonts.map((f) => f.family)).toEqual(h.session.bindings.map((b) => b.alias));
    expect(fonts.map((f) => f.weight)).toEqual(["normal", "bold"]);
  });

  it("snapshots input geometry, fields and lookup once without caller iteration", () => {
    const h = harness();
    const geometry = h.input.geometry;
    const readGeometry = vi.fn(() => geometry);
    const family = vi.fn(() => "Synthetic");
    Object.defineProperty(h.input, "geometry", { get: readGeometry });
    Object.defineProperty(h.zone, "fontFamily", { get: family });
    const zones = [h.zone];
    zones[Symbol.iterator] = vi.fn(() => [][Symbol.iterator]());
    Reflect.set(geometry, "textZones", zones);
    const lookup = vi.fn(() => "AV");
    const getProperty = vi.fn(() => lookup);
    Reflect.set(h.input, "textValues", Object.defineProperty({}, "get", { get: getProperty }));
    expect(h.start().ok).toBe(true);
    expect(readGeometry).toHaveBeenCalledTimes(1);
    expect(family).toHaveBeenCalledTimes(1);
    expect(getProperty).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(zones[Symbol.iterator]).not.toHaveBeenCalled();
  });

  it.each([null, 42, {}, false])("rejects non-string text %s without measurement", (value) => {
    const h = harness();
    Reflect.set(h.input, "textValues", new Map([["main", value]]));
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_INVALID_INPUT" });
    expect(h.measure).not.toHaveBeenCalled();
  });

  it("rejects duplicate keys", () => {
    const h = harness();
    Reflect.set(h.input.geometry, "textZones", [h.zone, h.zone]);
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_INVALID_INPUT" });
  });

  it.each(["geometry", "value", "session"])("contains hostile %s without raw error", (port) => {
    const h = harness();
    const throws = () => {
      throw new Error("secret");
    };
    if (port === "geometry") Object.defineProperty(h.input, "geometry", { get: throws });
    else if (port === "value") Reflect.set(h.input, "textValues", { get: throws });
    else Reflect.set(h.session, "isCurrent", throws);
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_INVALID_INPUT" });
  });

  it("fails before measurement if the session is stale", () => {
    const h = harness();
    Reflect.set(h.session, "isCurrent", () => false);
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_FONT_UNAVAILABLE" });
    expect(h.measure).not.toHaveBeenCalled();
  });

  it("rejects retirement during measurement rather than handing off the plan", () => {
    const h = harness();
    h.measure.mockImplementation(() => {
      Reflect.set(h.session, "isCurrent", () => false);
      return 10;
    });
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_FONT_UNAVAILABLE" });
  });

  it.each([NaN, -1, Infinity])("contains failed width %s", (width) => {
    const h = harness();
    h.measure.mockReturnValue(width);
    expect(h.start()).toEqual({ ok: false, code: "MANAGED_PLAN_BUILD_FAILED" });
  });

  it("ordinary text edits preserve the old immutable plan and never retire/release supply", () => {
    const h = harness();
    const old = h.start();
    if (!old.ok) throw new Error("fixture");
    const snapshot = JSON.stringify(old.plan);
    Reflect.set(h.input, "textValues", new Map([["main", "Changed"]]));
    const next = h.start();
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.plan).not.toBe(old.plan);
    expect(JSON.stringify(old.plan)).toBe(snapshot);
    expect(old.execution.isCurrent()).toBe(true);
    expect(h.session.release).not.toHaveBeenCalled();
  });
});
