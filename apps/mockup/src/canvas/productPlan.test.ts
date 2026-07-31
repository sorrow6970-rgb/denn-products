// Unit contract for the product render-plan adapters (spec 025 §9). Synthetic fixtures only — no
// catalog document, no drawable, no binding map, no network. Real user images, CORS-clean sources
// and the customer Canvas screen are NOT covered here (later specs).

import type { CasePreviewGeometry, FramePreviewGeometry } from "@denn/shared";
import type { PreviewDrawCommand, PreviewRenderPlan } from "@denn/render";
import { describe, expect, it } from "vitest";
import {
  buildCaseProductPlan,
  type CaseProductPlanInput,
  buildFrameProductPlan,
  type FrameProductPlanInput,
  type ProductPlanResult,
  type UserImageState,
} from "./productPlan";

const image = (over: Partial<UserImageState> = {}): UserImageState => ({
  imageRef: "user-image-0",
  intrinsicSize: { width: 1000, height: 1000 },
  transform: { scale: 1, x: 0, y: 0 },
  ...over,
});

const caseGeometry = (
  zones: readonly { id: string; sourceIndex: number; percentRect: Record<string, number> }[] = [
    { id: "case-zone-0", sourceIndex: 0, percentRect: { x: 0, y: 0, width: 100, height: 100 } },
  ],
): CasePreviewGeometry =>
  ({
    modelLogicalSize: { width: 320, height: 620 },
    zones,
  }) as unknown as CasePreviewGeometry;

const frameGeometry = (over: Partial<FramePreviewGeometry> = {}): FramePreviewGeometry =>
  ({
    aspect: 1.4,
    borderPercentOfWidth: 5,
    matColor: "#FFFFFF",
    contentInsetPx: 8,
    ...over,
  }) as unknown as FramePreviewGeometry;

const caseInput = (over: Partial<CaseProductPlanInput> = {}): CaseProductPlanInput => ({
  geometry: caseGeometry(),
  bodyColor: "#1a1a1a",
  zoneImages: new Map([["case-zone-0", image()]]),
  ...over,
});

const frameInput = (over: Partial<FrameProductPlanInput> = {}): FrameProductPlanInput => ({
  geometry: frameGeometry(),
  frameColor: "#663300",
  logicalWidth: 400,
  userImage: image(),
  ...over,
});

const planOf = (result: ProductPlanResult): PreviewRenderPlan => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.plan;
};
const cmd = (plan: PreviewRenderPlan, layerId: string): PreviewDrawCommand => {
  const found = plan.commands.find((c) => c.layerId === layerId);
  if (!found) throw new Error(`no command ${layerId}`);
  return found;
};
const rectOf = (plan: PreviewRenderPlan, layerId: string): unknown =>
  (cmd(plan, layerId) as { rect: unknown }).rect;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

// --- case -------------------------------------------------------------------

describe("buildCaseProductPlan", () => {
  it("returns a validated plan whose canvas is the model logical size", () => {
    const plan = planOf(buildCaseProductPlan(caseInput()));
    expect(plan.kind).toBe("case");
    expect(plan.logicalCanvas).toEqual({ width: 320, height: 620 });
    expect(rectOf(plan, "case:body")).toEqual({ x: 0, y: 0, width: 320, height: 620 });
  });

  it("gives every zone its OWN intrinsic size and transform (different cover draw rects)", () => {
    const plan = planOf(
      buildCaseProductPlan(
        caseInput({
          geometry: caseGeometry([
            {
              id: "case-zone-0",
              sourceIndex: 0,
              percentRect: { x: 0, y: 0, width: 50, height: 50 },
            },
            {
              id: "case-zone-1",
              sourceIndex: 1,
              percentRect: { x: 50, y: 0, width: 50, height: 50 },
            },
          ]),
          zoneImages: new Map([
            // square image, no zoom
            [
              "case-zone-0",
              image({ imageRef: "img-a", intrinsicSize: { width: 100, height: 100 } }),
            ],
            // wide image, zoomed in
            [
              "case-zone-1",
              image({
                imageRef: "img-b",
                intrinsicSize: { width: 400, height: 100 },
                transform: { scale: 2, x: 0, y: 0 },
              }),
            ],
          ]),
        }),
      ),
    );
    const a = cmd(plan, "case:user-image:case-zone-0");
    const b = cmd(plan, "case:user-image:case-zone-1");
    if (a.type !== "draw-image-cover" || b.type !== "draw-image-cover") throw new Error("type");
    // both zones are 160x310 (50% of 320x620)
    expect(a.clipRect).toEqual({ x: 0, y: 0, width: 160, height: 310 });
    expect(b.clipRect).toEqual({ x: 160, y: 0, width: 160, height: 310 });
    // a: 100x100 → baseScale max(1.6, 3.1) = 3.1 → 310x310
    expect(a.drawRect.width).toBeCloseTo(310, 6);
    expect(a.drawRect.height).toBeCloseTo(310, 6);
    // b: 400x100 → baseScale max(0.4, 3.1) = 3.1, ×2 → 2480x620
    expect(b.drawRect.width).toBeCloseTo(2480, 6);
    expect(b.drawRect.height).toBeCloseTo(620, 6);
    expect(a.drawRect).not.toEqual(b.drawRect);
    expect(a.imageRef).toBe("img-a");
    expect(b.imageRef).toBe("img-b");
  });

  it("preserves geometry order and synthetic zone ids in the layer ids", () => {
    const plan = planOf(
      buildCaseProductPlan(
        caseInput({
          geometry: caseGeometry([
            {
              id: "case-zone-0",
              sourceIndex: 0,
              percentRect: { x: 0, y: 0, width: 10, height: 10 },
            },
            {
              id: "case-zone-1",
              sourceIndex: 1,
              percentRect: { x: 20, y: 0, width: 10, height: 10 },
            },
            {
              id: "case-zone-2",
              sourceIndex: 2,
              percentRect: { x: 40, y: 0, width: 10, height: 10 },
            },
          ]),
          zoneImages: new Map([
            ["case-zone-0", image()],
            ["case-zone-1", image()],
            ["case-zone-2", image()],
          ]),
        }),
      ),
    );
    expect(plan.commands.map((c) => c.layerId)).toEqual([
      "case:body",
      "case:user-image:case-zone-0",
      "case:user-image:case-zone-1",
      "case:user-image:case-zone-2",
    ]);
  });

  it("fails the whole plan when a zone image is missing, with its source index", () => {
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          { id: "case-zone-0", sourceIndex: 0, percentRect: { x: 0, y: 0, width: 10, height: 10 } },
          {
            id: "case-zone-1",
            sourceIndex: 1,
            percentRect: { x: 20, y: 0, width: 10, height: 10 },
          },
        ]),
        zoneImages: new Map([["case-zone-0", image()]]),
      }),
    );
    expect(result).toEqual({ ok: false, code: "MISSING_ZONE_IMAGE", zoneSourceIndex: 1 });
  });

  it("ignores extra entries in the zone image map", () => {
    const result = buildCaseProductPlan(
      caseInput({
        zoneImages: new Map([
          ["case-zone-0", image()],
          ["case-zone-7", image({ imageRef: "unused" })],
        ]),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result)).not.toContain("unused");
  });

  it("canonicalises the body colour to uppercase", () => {
    const plan = planOf(buildCaseProductPlan(caseInput({ bodyColor: "#aabbcc" })));
    expect((cmd(plan, "case:body") as { color: string }).color).toBe("#AABBCC");
  });
});

// --- appearance -------------------------------------------------------------

describe("appearance validation", () => {
  it.each([undefined, null, ""])("reports a missing colour (%s)", (color) => {
    expect(buildCaseProductPlan(caseInput({ bodyColor: color as string }))).toEqual({
      ok: false,
      code: "MISSING_APPEARANCE",
    });
    expect(buildFrameProductPlan(frameInput({ frameColor: color as string }))).toEqual({
      ok: false,
      code: "MISSING_APPEARANCE",
    });
  });

  it.each([
    ["whitespace", "   "],
    ["padded hex", " #AABBCC "],
    ["short hex", "#ABC"],
    ["alpha hex", "#AABBCCDD"],
    ["named", "red"],
    ["transparent", "transparent"],
    ["rgba", "rgba(0,0,0,.06)"],
    ["css variable", "var(--accent)"],
    ["non-string", 16777215],
  ])("rejects an invalid colour (%s)", (_label, color) => {
    expect(buildCaseProductPlan(caseInput({ bodyColor: color as string }))).toEqual({
      ok: false,
      code: "INVALID_APPEARANCE",
    });
  });

  it("invents no colour of its own", () => {
    const result = buildCaseProductPlan(caseInput({ bodyColor: undefined as unknown as string }));
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["#1A1A1A", "#9F887A", "#FFFFFF"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// --- frame ------------------------------------------------------------------

describe("buildFrameProductPlan", () => {
  it("computes H, B, matRect and imageZone from the logical width (inset 8)", () => {
    // W=400, aspect 1.4 → H=560; B=max(1,round(400*5/100))=20; P=8
    const plan = planOf(buildFrameProductPlan(frameInput()));
    expect(plan.logicalCanvas).toEqual({ width: 400, height: 560 });
    expect(rectOf(plan, "frame:body")).toEqual({ x: 0, y: 0, width: 400, height: 560 });
    expect(rectOf(plan, "frame:mat")).toEqual({ x: 20, y: 20, width: 360, height: 520 });
    const img = cmd(plan, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 28, y: 28, width: 344, height: 504 });
  });

  it("uses the mat rect itself when the inset is 0", () => {
    const plan = planOf(
      buildFrameProductPlan(frameInput({ geometry: frameGeometry({ contentInsetPx: 0 }) })),
    );
    const img = cmd(plan, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 20, y: 20, width: 360, height: 520 });
    expect(img.clipRect).toEqual(rectOf(plan, "frame:mat"));
  });

  it("keeps frameRect ⊇ matRect ⊇ imageZone", () => {
    const plan = planOf(buildFrameProductPlan(frameInput()));
    const frame = rectOf(plan, "frame:body") as Record<string, number>;
    const mat = rectOf(plan, "frame:mat") as Record<string, number>;
    const img = cmd(plan, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    const zone = img.clipRect;
    expect(mat.x).toBeGreaterThanOrEqual(frame.x);
    expect(mat.x + mat.width).toBeLessThanOrEqual(frame.x + frame.width);
    expect(zone.x).toBeGreaterThanOrEqual(mat.x);
    expect(zone.x + zone.width).toBeLessThanOrEqual(mat.x + mat.width);
    expect(zone.y + zone.height).toBeLessThanOrEqual(mat.y + mat.height);
  });

  it("rounds the height with Math.round and clamps the band to at least 1", () => {
    const tall = planOf(
      buildFrameProductPlan(
        frameInput({ geometry: frameGeometry({ aspect: 1.4113, borderPercentOfWidth: 0.01 }) }),
      ),
    );
    expect(tall.logicalCanvas).toEqual({ width: 400, height: Math.round(400 * 1.4113) });
    // 400 * 0.01 / 100 = 0.04 → round 0 → clamped to 1
    expect(rectOf(tall, "frame:mat")).toEqual({ x: 1, y: 1, width: 398, height: 563 });
  });

  it("emits no inner-border command", () => {
    const plan = planOf(buildFrameProductPlan(frameInput()));
    expect(plan.commands.map((c) => c.layerId)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
    ]);
  });

  it.each([
    ["missing", undefined],
    ["zero", 0],
    ["negative", -400],
    ["fractional", 400.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["numeric string", "400"],
  ])("requires a positive integer logical width (%s)", (_label, width) => {
    expect(buildFrameProductPlan(frameInput({ logicalWidth: width as number }))).toEqual({
      ok: false,
      code: "INVALID_LOGICAL_SIZE",
    });
  });

  it("never substitutes a default width such as 500", () => {
    const result = buildFrameProductPlan(
      frameInput({ logicalWidth: undefined as unknown as number }),
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("500");
  });

  it.each([
    ["mat collapses", { logicalWidth: 4, geometry: frameGeometry({ borderPercentOfWidth: 50 }) }],
    ["image zone collapses", { logicalWidth: 18, geometry: frameGeometry({ contentInsetPx: 8 }) }],
  ])("reports a non-positive rect (%s)", (_label, over) => {
    expect(buildFrameProductPlan(frameInput(over as Partial<FrameProductPlanInput>))).toEqual({
      ok: false,
      code: "NON_POSITIVE_RECT",
    });
  });

  it("reports a missing user image", () => {
    for (const value of [undefined, null]) {
      expect(
        buildFrameProductPlan(frameInput({ userImage: value as unknown as UserImageState })),
      ).toEqual({ ok: false, code: "MISSING_USER_IMAGE" });
    }
  });

  it.each([
    ["not an object", 5],
    [
      "missing imageRef",
      { intrinsicSize: { width: 1, height: 1 }, transform: { scale: 1, x: 0, y: 0 } },
    ],
    ["url-shaped imageRef", { ...image(), imageRef: "https://example.test/a.png" }],
    ["blank imageRef", { ...image(), imageRef: "" }],
    ["zero intrinsic", { ...image(), intrinsicSize: { width: 0, height: 100 } }],
    ["NaN intrinsic", { ...image(), intrinsicSize: { width: Number.NaN, height: 100 } }],
    ["zero scale", { ...image(), transform: { scale: 0, x: 0, y: 0 } }],
    ["NaN pan", { ...image(), transform: { scale: 1, x: Number.NaN, y: 0 } }],
    ["missing transform", { imageRef: "a", intrinsicSize: { width: 1, height: 1 } }],
  ])("rejects a malformed image state (%s)", (_label, state) => {
    expect(
      buildFrameProductPlan(frameInput({ userImage: state as unknown as UserImageState })),
    ).toEqual({ ok: false, code: "INVALID_IMAGE_STATE" });
  });

  it("carries the zone source index on a malformed case zone image", () => {
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          { id: "case-zone-0", sourceIndex: 0, percentRect: { x: 0, y: 0, width: 10, height: 10 } },
          {
            id: "case-zone-1",
            sourceIndex: 1,
            percentRect: { x: 20, y: 0, width: 10, height: 10 },
          },
        ]),
        zoneImages: new Map([
          ["case-zone-0", image()],
          ["case-zone-1", { imageRef: "b" } as unknown as UserImageState],
        ]),
      }),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_IMAGE_STATE", zoneSourceIndex: 1 });
  });

  it("maps a builder rejection to PLAN_BUILD_FAILED without echoing its code", () => {
    // a percent rect outside the canvas is accepted by the adapter but rejected by spec 019 geometry
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          {
            id: "bad id with spaces",
            sourceIndex: 0,
            percentRect: { x: 0, y: 0, width: 10, height: 10 },
          },
        ]),
        zoneImages: new Map([["bad id with spaces", image()]]),
      }),
    );
    expect(result).toEqual({ ok: false, code: "PLAN_BUILD_FAILED" });
    expect(JSON.stringify(result)).not.toContain("INVALID_ID");
  });
});

// --- zone image map access (spec 025 §7 single read) ------------------------

describe("zone image map access", () => {
  const twoZoneGeometry = (): CasePreviewGeometry =>
    caseGeometry([
      { id: "case-zone-0", sourceIndex: 0, percentRect: { x: 0, y: 0, width: 50, height: 50 } },
      { id: "case-zone-1", sourceIndex: 1, percentRect: { x: 50, y: 0, width: 50, height: 50 } },
    ]);

  it("reads the map's `get` property exactly once and calls it once per zone", () => {
    const real = new Map([
      ["case-zone-0", image({ imageRef: "img-a" })],
      ["case-zone-1", image({ imageRef: "img-b" })],
    ]);
    let getReads = 0;
    const calls: string[] = [];
    const map = {
      get get() {
        getReads += 1;
        return (key: string): UserImageState | undefined => {
          calls.push(key);
          return real.get(key);
        };
      },
    };
    const plan = planOf(
      buildCaseProductPlan(caseInput({ geometry: twoZoneGeometry(), zoneImages: map as never })),
    );
    expect(getReads).toBe(1);
    expect(calls).toEqual(["case-zone-0", "case-zone-1"]);
    expect((cmd(plan, "case:user-image:case-zone-0") as { imageRef: string }).imageRef).toBe(
      "img-a",
    );
  });

  it("uses the first `get` snapshot when the property drifts to another function", () => {
    let getReads = 0;
    const map = {
      get get() {
        getReads += 1;
        const ref = getReads === 1 ? "first-fn" : "second-fn";
        return (): UserImageState => image({ imageRef: ref });
      },
    };
    const plan = planOf(buildCaseProductPlan(caseInput({ zoneImages: map as never })));
    expect(getReads).toBe(1);
    expect((cmd(plan, "case:user-image:case-zone-0") as { imageRef: string }).imageRef).toBe(
      "first-fn",
    );
  });

  it("succeeds when a second read of `get` would throw", () => {
    const real = new Map([["case-zone-0", image()]]);
    let getReads = 0;
    const map = {
      get get() {
        getReads += 1;
        if (getReads > 1) throw new Error("second read of get");
        return (key: string): UserImageState | undefined => real.get(key);
      },
    };
    expect(buildCaseProductPlan(caseInput({ zoneImages: map as never })).ok).toBe(true);
    expect(getReads).toBe(1);
  });

  it("reports a throwing lookup function as INVALID_ADAPTER_INPUT without throwing", () => {
    const map = {
      get(): never {
        throw new Error("hostile map get");
      },
    };
    let result: ProductPlanResult | undefined;
    expect(() => {
      result = buildCaseProductPlan(caseInput({ zoneImages: map as never }));
    }).not.toThrow();
    expect(result).toEqual({ ok: false, code: "INVALID_ADAPTER_INPUT" });
    expect(JSON.stringify(result)).not.toContain("hostile");
  });

  it.each([
    ["missing", {}],
    ["not a function", { get: 42 }],
    ["null map", null],
  ])("rejects a zone image map whose `get` is unusable (%s)", (_label, map) => {
    expect(buildCaseProductPlan(caseInput({ zoneImages: map as never }))).toEqual({
      ok: false,
      code: "INVALID_ADAPTER_INPUT",
    });
  });

  it("works with a real Map and a real ReadonlyMap view", () => {
    const real = new Map([["case-zone-0", image()]]);
    const readonlyView: ReadonlyMap<string, UserImageState> = real;
    expect(buildCaseProductPlan(caseInput({ zoneImages: real })).ok).toBe(true);
    expect(buildCaseProductPlan(caseInput({ zoneImages: readonlyView })).ok).toBe(true);
  });

  it("still ignores extra map entries when the lookup is a plain function", () => {
    const store = new Map([
      ["case-zone-0", image()],
      ["case-zone-9", image({ imageRef: "unused" })],
    ]);
    const calls: string[] = [];
    const map = {
      get: (key: string): UserImageState | undefined => {
        calls.push(key);
        return store.get(key);
      },
    };
    const result = buildCaseProductPlan(caseInput({ zoneImages: map as never }));
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["case-zone-0"]);
    expect(JSON.stringify(result)).not.toContain("unused");
  });
});

// --- geometry zone source index --------------------------------------------

describe("geometry zone source index", () => {
  const withIndex = (sourceIndex: number): CasePreviewGeometry =>
    caseGeometry([
      { id: "case-zone-0", sourceIndex, percentRect: { x: 0, y: 0, width: 10, height: 10 } },
    ]);

  it.each([
    ["negative", -1],
    ["fractional", 0.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects a source index that is not a 0-based integer (%s)", (_label, sourceIndex) => {
    expect(buildCaseProductPlan(caseInput({ geometry: withIndex(sourceIndex) }))).toEqual({
      ok: false,
      code: "INVALID_ADAPTER_INPUT",
    });
  });

  it.each([
    ["non-numeric", "0"],
    ["missing", undefined],
  ])("rejects a non-numeric source index (%s)", (_label, sourceIndex) => {
    expect(
      buildCaseProductPlan(caseInput({ geometry: withIndex(sourceIndex as unknown as number) })),
    ).toEqual({ ok: false, code: "INVALID_ADAPTER_INPUT" });
  });

  it("keeps a valid projection source index (including a non-contiguous one)", () => {
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          { id: "case-zone-7", sourceIndex: 7, percentRect: { x: 0, y: 0, width: 10, height: 10 } },
        ]),
        zoneImages: new Map(),
      }),
    );
    expect(result).toEqual({ ok: false, code: "MISSING_ZONE_IMAGE", zoneSourceIndex: 7 });
    // the failure payload carries the safe number and nothing else
    expect(Object.keys(result).sort()).toEqual(["code", "ok", "zoneSourceIndex"]);
    expect(JSON.stringify(result)).not.toContain("case-zone-7");
  });

  it("reads each geometry percentRect field once (a drift cannot change the clip rect)", () => {
    const counts: Record<string, number> = { x: 0, y: 0, width: 0, height: 0 };
    const first: Record<string, number> = { x: 0, y: 0, width: 50, height: 50 };
    const percentRect: Record<string, unknown> = {};
    for (const key of ["x", "y", "width", "height"] as const) {
      Object.defineProperty(percentRect, key, {
        get() {
          counts[key] = (counts[key] ?? 0) + 1;
          // any later read would produce a full-canvas clip rect instead of the 50% one
          return counts[key] === 1 ? first[key] : 100;
        },
        enumerable: true,
      });
    }
    const plan = planOf(
      buildCaseProductPlan(
        caseInput({
          geometry: caseGeometry([
            {
              id: "case-zone-0",
              sourceIndex: 0,
              percentRect: percentRect as Record<string, number>,
            },
          ]),
        }),
      ),
    );
    expect(counts).toEqual({ x: 1, y: 1, width: 1, height: 1 });
    const img = cmd(plan, "case:user-image:case-zone-0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 0, y: 0, width: 160, height: 310 });
  });
});

// --- runtime safety, purity, leak safety ------------------------------------

describe("adapter runtime safety", () => {
  const throwingGetter = (base: Record<string, unknown>, key: string): Record<string, unknown> => {
    const clone: Record<string, unknown> = { ...base };
    delete clone[key];
    Object.defineProperty(clone, key, {
      get() {
        throw new Error("hostile getter");
      },
      enumerable: true,
    });
    return clone;
  };

  it.each([null, undefined, 42, "case", []])(
    "returns INVALID_ADAPTER_INPUT for a malformed argument (%s)",
    (value) => {
      expect(buildCaseProductPlan(value as unknown as CaseProductPlanInput)).toEqual({
        ok: false,
        code: "INVALID_ADAPTER_INPUT",
      });
      expect(buildFrameProductPlan(value as unknown as FrameProductPlanInput)).toEqual({
        ok: false,
        code: "INVALID_ADAPTER_INPUT",
      });
    },
  );

  it("never throws for hostile getters, Proxy traps or a revoked Proxy", () => {
    const hostileGeometry = throwingGetter(
      { modelLogicalSize: { width: 10, height: 10 }, zones: [] },
      "zones",
    );
    const trap = new Proxy(
      { aspect: 1.4, borderPercentOfWidth: 5, matColor: "#FFFFFF", contentInsetPx: 8 },
      {
        get() {
          throw new Error("hostile trap");
        },
      },
    );
    const revocable = Proxy.revocable({ ...frameGeometry() }, {});
    revocable.revoke();
    const throwingMap = {
      get() {
        throw new Error("hostile map get");
      },
    };

    const candidates: (() => ProductPlanResult)[] = [
      () =>
        buildCaseProductPlan(
          caseInput({ geometry: hostileGeometry as unknown as CasePreviewGeometry }),
        ),
      () => buildCaseProductPlan(caseInput({ zoneImages: throwingMap as never })),
      () =>
        buildFrameProductPlan(frameInput({ geometry: trap as unknown as FramePreviewGeometry })),
      () =>
        buildFrameProductPlan(
          frameInput({ geometry: revocable.proxy as unknown as FramePreviewGeometry }),
        ),
      () =>
        buildFrameProductPlan(
          frameInput({
            userImage: throwingGetter({ ...image() }, "transform") as unknown as UserImageState,
          }),
        ),
    ];
    for (const candidate of candidates) {
      let result: ProductPlanResult | undefined;
      expect(() => {
        result = candidate();
      }).not.toThrow();
      expect(result?.ok).toBe(false);
    }
  });

  it("uses the first snapshot when a getter drifts", () => {
    let reads = 0;
    const drifting: Record<string, unknown> = { imageRef: "user-image-0" };
    Object.defineProperty(drifting, "intrinsicSize", {
      get() {
        reads += 1;
        return reads === 1 ? { width: 100, height: 100 } : { width: 4000, height: 10 };
      },
      enumerable: true,
    });
    Object.defineProperty(drifting, "transform", {
      get: () => ({ scale: 1, x: 0, y: 0 }),
      enumerable: true,
    });
    const plan = planOf(
      buildFrameProductPlan(frameInput({ userImage: drifting as unknown as UserImageState })),
    );
    const img = cmd(plan, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    // 100x100 into 344x504 → baseScale 5.04 → 504x504 (a 4000x10 image could never produce this)
    expect(img.drawRect.width).toBeCloseTo(504, 6);
    expect(img.drawRect.height).toBeCloseTo(504, 6);
  });

  it("does not turn a finite-input overflow into a success", () => {
    const result = buildFrameProductPlan(
      frameInput({ userImage: image({ transform: { scale: Number.MAX_VALUE, x: 0, y: 0 } }) }),
    );
    expect(result).toEqual({ ok: false, code: "PLAN_BUILD_FAILED" });
  });

  it("does not mutate deep-frozen inputs and is deterministic", () => {
    const geometry = deepFreeze(caseGeometry());
    const state = deepFreeze(image());
    const map = new Map([["case-zone-0", state]]);
    const before = JSON.stringify(geometry);
    const first = buildCaseProductPlan({ geometry, bodyColor: "#101112", zoneImages: map });
    const second = buildCaseProductPlan({ geometry, bodyColor: "#101112", zoneImages: map });
    expect(first).toEqual(second);
    expect(JSON.stringify(geometry)).toBe(before);
    expect(map.size).toBe(1);
  });

  it("emits only finite numbers and JSON-safe data", () => {
    for (const result of [buildCaseProductPlan(caseInput()), buildFrameProductPlan(frameInput())]) {
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
      for (const command of result.plan.commands) {
        const rects =
          command.type === "draw-image-cover"
            ? [command.clipRect, command.drawRect]
            : command.type === "draw-image-stretch"
              ? [command.destRect]
              : [command.rect];
        for (const rect of rects) {
          for (const value of [rect.x, rect.y, rect.width, rect.height]) {
            expect(Number.isFinite(value)).toBe(true);
          }
        }
      }
    }
  });

  it("keeps names, ids, URLs and exceptions out of failure payloads", () => {
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          {
            id: "case-zone-0",
            sourceIndex: 0,
            percentRect: { x: 0, y: 0, width: 100, height: 100 },
          },
        ]),
        zoneImages: new Map([
          [
            "case-zone-0",
            {
              imageRef: "https://secret.example/tok=SECRETMARKER",
              intrinsicSize: { width: 1, height: 1 },
              transform: { scale: 1, x: 0, y: 0 },
            } as UserImageState,
          ],
        ]),
      }),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_IMAGE_STATE", zoneSourceIndex: 0 });
    const serialized = JSON.stringify(result);
    for (const forbidden of ["SECRETMARKER", "https", "secret.example", "hostile", "Error"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// --- template art pass-through (spec 028) -----------------------------------

describe("product plan template art", () => {
  const artCommand = (plan: PreviewRenderPlan, layerId: string) =>
    cmd(plan, layerId) as unknown as { type: string; imageRef: string; destRect: unknown };

  it("stretches the case art over the whole logical canvas", () => {
    const plan = planOf(
      buildCaseProductPlan(caseInput({ templateArt: { imageRef: "template-art.template-art-1" } })),
    );
    expect(plan.commands.map((c) => c.layerId)).toEqual([
      "case:body",
      "case:user-image:case-zone-0",
      "case:template-art",
    ]);
    const art = artCommand(plan, "case:template-art");
    expect(art.type).toBe("draw-image-stretch");
    expect(art.imageRef).toBe("template-art.template-art-1");
    expect(art.destRect).toEqual({ x: 0, y: 0, width: 320, height: 620 });
  });

  it("stretches the frame art over the mat rect", () => {
    const plan = planOf(
      buildFrameProductPlan(
        frameInput({ templateArt: { imageRef: "template-art.template-art-2" } }),
      ),
    );
    expect(plan.commands.map((c) => c.layerId)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
      "frame:template-art",
    ]);
    // W=400 → B=20, so the mat rect is 20,20,360,520 (identical to the frame:mat command)
    expect(artCommand(plan, "frame:template-art").destRect).toEqual({
      x: 20,
      y: 20,
      width: 360,
      height: 520,
    });
  });

  it("emits no art layer when none is supplied", () => {
    const plan = planOf(buildCaseProductPlan(caseInput()));
    expect(plan.commands.map((c) => c.layerId)).not.toContain("case:template-art");
  });

  it.each([
    ["url-shaped ref", { imageRef: "https://example.test/a.png" }],
    ["blank ref", { imageRef: "" }],
    ["missing ref", {}],
    ["not an object", 42],
  ])("rejects an unusable art reference (%s) with a safe code", (_label, art) => {
    expect(
      buildCaseProductPlan(caseInput({ templateArt: art as unknown as { imageRef: string } })),
    ).toEqual({ ok: false, code: "INVALID_ADAPTER_INPUT" });
  });

  it("keeps the art reference out of a failure payload", () => {
    const result = buildCaseProductPlan(
      caseInput({
        templateArt: { imageRef: "https://secret.example/tok=SECRETMARKER" },
      }),
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SECRETMARKER");
  });
});

// --- spec 030: quarter-turn rotation ----------------------------------------

describe("product plan quarter-turn rotation (spec 030)", () => {
  it("forwards the rotation into the frame command", () => {
    const plan = planOf(
      buildFrameProductPlan(
        frameInput({
          userImage: image({
            transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 1 },
          }),
        }),
      ),
    );
    const drawn = cmd(plan, "frame:user-image");
    if (drawn.type !== "draw-image-cover") throw new Error("type");
    expect(drawn.rotationQuarterTurns).toBe(1);
  });

  it("omits the field entirely for an unrotated photo (pre-030 plans are unchanged)", () => {
    const plan = planOf(buildFrameProductPlan(frameInput()));
    const drawn = cmd(plan, "frame:user-image");
    expect(Object.hasOwn(drawn, "rotationQuarterTurns")).toBe(false);
    // an explicit 0 must produce exactly the same plan as an absent rotation
    const explicit = planOf(
      buildFrameProductPlan(
        frameInput({
          userImage: image({ transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 } }),
        }),
      ),
    );
    expect(explicit).toEqual(plan);
  });

  it("keeps case zone rotations INDEPENDENT (R-4)", () => {
    const plan = planOf(
      buildCaseProductPlan(
        caseInput({
          geometry: caseGeometry([
            {
              id: "case-zone-0",
              sourceIndex: 0,
              percentRect: { x: 0, y: 0, width: 50, height: 100 },
            },
            {
              id: "case-zone-1",
              sourceIndex: 1,
              percentRect: { x: 50, y: 0, width: 50, height: 100 },
            },
          ]),
          zoneImages: new Map([
            [
              "case-zone-0",
              image({
                imageRef: "user-image-0",
                transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 3 },
              }),
            ],
            ["case-zone-1", image({ imageRef: "user-image-1" })],
          ]),
        }),
      ),
    );
    const first = cmd(plan, "case:user-image:case-zone-0");
    const second = cmd(plan, "case:user-image:case-zone-1");
    if (first.type !== "draw-image-cover" || second.type !== "draw-image-cover") {
      throw new Error("type");
    }
    expect(first.rotationQuarterTurns).toBe(3);
    expect(Object.hasOwn(second, "rotationQuarterTurns")).toBe(false);
  });

  it("a 90 turn swaps the cover footprint, so maxPan is the ROTATED one", () => {
    const upright = planOf(
      buildFrameProductPlan(
        frameInput({ userImage: image({ intrinsicSize: { width: 2000, height: 1000 } }) }),
      ),
    );
    const turned = planOf(
      buildFrameProductPlan(
        frameInput({
          userImage: image({
            intrinsicSize: { width: 2000, height: 1000 },
            transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 1 },
          }),
        }),
      ),
    );
    const a = cmd(upright, "frame:user-image");
    const b = cmd(turned, "frame:user-image");
    if (a.type !== "draw-image-cover" || b.type !== "draw-image-cover") throw new Error("type");
    // a landscape photo covers a portrait-ish zone very differently once turned upright
    expect(b.drawRect).not.toEqual(a.drawRect);
    // …but it still covers the clip on BOTH axes: no empty space (D-7 survives the rotation)
    expect(b.drawRect.width).toBeGreaterThanOrEqual(b.clipRect.width - 1e-9);
    expect(b.drawRect.height).toBeGreaterThanOrEqual(b.clipRect.height - 1e-9);
  });

  it("REJECTS a non-quarter-turn rotation as an invalid image state", () => {
    for (const bad of [4, -1, 1.5, 90, "1", null, Number.NaN]) {
      const result = buildFrameProductPlan(
        frameInput({
          userImage: image({
            transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: bad },
          } as unknown as Partial<UserImageState>),
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.code).toBe("INVALID_IMAGE_STATE");
    }
  });

  it("carries the offending zone index when a case rotation is invalid", () => {
    const result = buildCaseProductPlan(
      caseInput({
        geometry: caseGeometry([
          {
            id: "case-zone-0",
            sourceIndex: 0,
            percentRect: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            id: "case-zone-1",
            sourceIndex: 7,
            percentRect: { x: 0, y: 0, width: 100, height: 100 },
          },
        ]),
        zoneImages: new Map([
          ["case-zone-0", image({ imageRef: "user-image-0" })],
          [
            "case-zone-1",
            image({
              imageRef: "user-image-1",
              transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 4 },
            } as unknown as Partial<UserImageState>),
          ],
        ]),
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.code).toBe("INVALID_IMAGE_STATE");
    expect(result.zoneSourceIndex).toBe(7);
  });

  it("a throwing rotation getter fails safe instead of escaping", () => {
    const hostile = {
      imageRef: "user-image-0",
      intrinsicSize: { width: 1000, height: 1000 },
      transform: {
        scale: 1,
        x: 0,
        y: 0,
        get rotationQuarterTurns(): number {
          throw new Error("hostile");
        },
      },
    } as unknown as UserImageState;
    const result = buildFrameProductPlan(frameInput({ userImage: hostile }));
    expect(result.ok).toBe(false);
  });
});
