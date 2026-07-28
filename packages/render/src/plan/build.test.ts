import { describe, expect, it } from "vitest";
import { buildPreviewRenderPlan } from "./build";
import type {
  CasePlanInput,
  FramePlanInput,
  PreviewDrawCommand,
  PreviewRenderPlan,
  RenderPlanResult,
} from "./types";

function deepFreeze<X>(o: X): X {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}
function plan(r: RenderPlanResult): PreviewRenderPlan {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.code);
  return r.plan;
}
const layerIds = (p: PreviewRenderPlan): string[] => p.commands.map((c) => c.layerId);
const cmd = (p: PreviewRenderPlan, layerId: string): PreviewDrawCommand => {
  const c = p.commands.find((x) => x.layerId === layerId);
  if (!c) throw new Error(`no command ${layerId}`);
  return c;
};

const CASE_BASE: CasePlanInput = {
  kind: "case",
  logicalCanvas: { width: 200, height: 200 },
  bodyColor: "#101112",
  image: { width: 100, height: 100 },
  defaultTransform: { scale: 1, x: 0, y: 0 },
  zones: [
    {
      id: "z0",
      imageRef: "img-0",
      rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
    },
  ],
};
const FRAME_BASE: FramePlanInput = {
  kind: "frame",
  logicalCanvas: { width: 300, height: 400 },
  // canvas ⊇ frameRect ⊇ matRect ⊇ imageZone, all distinct (spec 024)
  frameRect: { x: 0, y: 0, width: 300, height: 400 },
  matRect: { x: 10, y: 10, width: 280, height: 380 },
  imageZone: { x: 18, y: 18, width: 264, height: 364 },
  frameColor: "#9F887A",
  matColor: "#FFFFFF",
  image: { width: 200, height: 100 },
  transform: { scale: 1, x: 0, y: 0 },
  imageRef: "frame-img",
};

// ---- B. determinism & safety --------------------------------------------------
describe("buildPreviewRenderPlan — determinism & safety", () => {
  it("same deep-frozen input twice → deep-equal plan", () => {
    const input = deepFreeze({ ...CASE_BASE });
    const a = plan(buildPreviewRenderPlan(input));
    const b = plan(buildPreviewRenderPlan(input));
    expect(a).toEqual(b);
  });

  it("does not mutate input / zones / transform", () => {
    const input = deepFreeze({
      ...CASE_BASE,
      defaultTransform: { scale: 1.5, x: 3, y: 4 },
      zones: [
        {
          id: "z0",
          imageRef: "img-0",
          rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 } as const,
          transform: { scale: 2, x: 5, y: 6 },
        },
      ],
    });
    expect(() => buildPreviewRenderPlan(input)).not.toThrow();
    expect(input.defaultTransform.x).toBe(3);
    expect(input.zones[0].transform?.scale).toBe(2);
  });

  it("success plan is JSON round-trippable and all numbers finite", () => {
    const p = plan(buildPreviewRenderPlan(CASE_BASE));
    const round = JSON.parse(JSON.stringify(p));
    expect(round).toEqual(p);
    for (const c of p.commands) {
      const rects = c.type === "draw-image-cover" ? [c.clipRect, c.drawRect] : [c.rect];
      for (const r of rects) {
        for (const n of [r.x, r.y, r.width, r.height]) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it("the builder does not synthesize or copy a source URL/token marker (this fixture)", () => {
    // Scope: proves the BUILDER injects no source URL/token/storagePath and copies no raw catalog
    // value — the plan carries only the caller's own synthetic imageRef. It is NOT a general
    // guarantee that a plan can never contain a token (a caller could pass a token-shaped imageRef;
    // the identifier grammar is not a secret detector — see the safe-identifier tests).
    const p = plan(buildPreviewRenderPlan(CASE_BASE));
    const json = JSON.stringify(p);
    for (const bad of ["http", "data:", "blob:", "token", "storagePath", "/o/", "base64"]) {
      expect(json).not.toContain(bad);
    }
    expect((cmd(p, "case:user-image:z0") as { imageRef: string }).imageRef).toBe("img-0");
  });

  it("rejects empty/whitespace id and duplicate zone id", () => {
    const empty = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [
        { id: "  ", imageRef: "i", rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 } },
      ],
    });
    expect(empty).toEqual({ ok: false, code: "INVALID_ID" });
    const dup = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [
        { id: "z", imageRef: "i0", rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 } },
        { id: "z", imageRef: "i1", rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 } },
      ],
    });
    expect(dup).toEqual({ ok: false, code: "INVALID_ID" });
  });

  it("does not turn a geometry overflow into a success/empty plan", () => {
    const r = buildPreviewRenderPlan({
      ...CASE_BASE,
      defaultTransform: { scale: Number.MAX_VALUE, x: 0, y: 0 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("GEOMETRY_ERROR");
      expect(r.causeCode).toBe("NON_FINITE_RESULT");
    }
  });

  it("rejects non-hex colors", () => {
    for (const c of ["red", "#fff", "#GGGGGG", "#12345678", "rgb(0,0,0)"]) {
      expect(buildPreviewRenderPlan({ ...CASE_BASE, bodyColor: c })).toEqual({
        ok: false,
        code: "INVALID_COLOR",
      });
    }
  });
});

// ---- C. case ------------------------------------------------------------------
describe("buildPreviewRenderPlan — case", () => {
  it("single full-canvas zone: body → image order + full-cover draw rect", () => {
    const p = plan(buildPreviewRenderPlan(CASE_BASE));
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:z0"]);
    const img = cmd(p, "case:user-image:z0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    // zone 200x200, image 100x100, scale1 → cover draw 200x200 at (0,0)
    expect(img.clipRect).toEqual({ x: 0, y: 0, width: 200, height: 200 });
    expect(img.drawRect.width).toBeCloseTo(200, 9);
    expect(img.drawRect.x).toBeCloseTo(0, 9);
  });

  it("percent zone resolves against a non-zero canvas via spec-019 geometry", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        logicalCanvas: { width: 400, height: 300 },
        zones: [
          {
            id: "z0",
            imageRef: "i",
            rect: { units: "percent", x: 25, y: 10, width: 50, height: 40 },
          },
        ],
      }),
    );
    const img = cmd(p, "case:user-image:z0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    // 25/10/50/40 of 400x300 → {100,30,200,120}
    expect(img.clipRect).toEqual({ x: 100, y: 30, width: 200, height: 120 });
  });

  it("wide image cover draw rect matches spec 019 (height cover, left/right crop)", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        logicalCanvas: { width: 100, height: 100 },
        image: { width: 200, height: 100 },
        zones: [
          {
            id: "z0",
            imageRef: "i",
            rect: { units: "logical", x: 0, y: 0, width: 100, height: 100 },
          },
        ],
      }),
    );
    const img = cmd(p, "case:user-image:z0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.drawRect.width).toBeCloseTo(200, 9);
    expect(img.drawRect.height).toBeCloseTo(100, 9);
    expect(img.drawRect.x).toBeCloseTo(-50, 9);
  });

  it("pan clamp is reflected in the draw command", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        defaultTransform: { scale: 1.5, x: 100, y: 0 }, // maxPan 50 → clamp; drawX=-50+50=0
      }),
    );
    const img = cmd(p, "case:user-image:z0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.drawRect.x).toBeCloseTo(0, 9);
  });

  it("zone transform overrides default; a zone without transform uses default", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        defaultTransform: { scale: 1.5, x: 0, y: 0 },
        zones: [
          {
            id: "a",
            imageRef: "ia",
            rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
            transform: { scale: 2, x: 0, y: 0 },
          },
          {
            id: "b",
            imageRef: "ib",
            rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
          },
        ],
      }),
    );
    const a = cmd(p, "case:user-image:a");
    const b = cmd(p, "case:user-image:b");
    if (a.type !== "draw-image-cover" || b.type !== "draw-image-cover") throw new Error("type");
    expect(a.drawRect.width).toBeCloseTo(400, 9); // baseScale2 * 2
    expect(b.drawRect.width).toBeCloseTo(300, 9); // baseScale2 * 1.5 default
  });

  it("orders by explicit order ascending, ties by original source index", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          {
            id: "late",
            imageRef: "i0",
            rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 },
            order: 2,
          },
          {
            id: "tieA",
            imageRef: "i1",
            rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 },
            order: 1,
          },
          {
            id: "tieB",
            imageRef: "i2",
            rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 },
            order: 1,
          },
        ],
      }),
    );
    expect(layerIds(p)).toEqual([
      "case:body",
      "case:user-image:tieA", // order 1, source index 1
      "case:user-image:tieB", // order 1, source index 2
      "case:user-image:late", // order 2
    ]);
  });

  it("emits a guide stroke after images only when specified; none otherwise", () => {
    const withGuide = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          {
            id: "z0",
            imageRef: "i",
            rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
            guide: { color: "#000000", width: 2 },
          },
        ],
      }),
    );
    expect(layerIds(withGuide)).toEqual(["case:body", "case:user-image:z0", "case:guide:z0"]);
    const stroke = cmd(withGuide, "case:guide:z0");
    expect(stroke.type).toBe("stroke-rect");

    const noGuide = plan(buildPreviewRenderPlan(CASE_BASE));
    expect(layerIds(noGuide).some((id) => id.startsWith("case:guide"))).toBe(false);
  });

  it("emits no fake camera/magsafe/template-art/clock commands", () => {
    const p = plan(buildPreviewRenderPlan(CASE_BASE));
    for (const c of p.commands) {
      expect(["fill-rect", "draw-image-cover", "stroke-rect"]).toContain(c.type);
      expect(c.layerId).not.toMatch(/template|camera|magsafe|clock|dieline|watermark/);
    }
  });
});

// ---- D. frame -----------------------------------------------------------------
describe("buildPreviewRenderPlan — frame", () => {
  it("body → mat → image order; inner-border only when specified", () => {
    const noBorder = plan(buildPreviewRenderPlan(FRAME_BASE));
    expect(layerIds(noBorder)).toEqual(["frame:body", "frame:mat", "frame:user-image"]);
    const withBorder = plan(
      buildPreviewRenderPlan({ ...FRAME_BASE, innerBorder: { color: "#000000", width: 3 } }),
    );
    expect(layerIds(withBorder)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
      "frame:inner-border",
    ]);
  });

  it("image-zone cover + clip are correct", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    const img = cmd(p, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 18, y: 18, width: 264, height: 364 });
    // image 200x100 into 264x364 → baseScale=max(264/200,364/100)=3.64 → draw 728x364
    expect(img.drawRect.width).toBeCloseTo(728, 6);
    expect(img.drawRect.height).toBeCloseTo(364, 6);
  });

  it("body fills frameRect, mat fills matRect, image clips imageZone (three distinct rects)", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    expect(cmd(p, "frame:body")).toEqual({
      type: "fill-rect",
      layerId: "frame:body",
      rect: { x: 0, y: 0, width: 300, height: 400 },
      color: "#9F887A",
    });
    expect(cmd(p, "frame:mat")).toEqual({
      type: "fill-rect",
      layerId: "frame:mat",
      rect: { x: 10, y: 10, width: 280, height: 380 },
      color: "#FFFFFF",
    });
    const img = cmd(p, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 18, y: 18, width: 264, height: 364 });
    // the mat ring really exists: mat rect is strictly larger than the photo rect
    expect(img.clipRect).not.toEqual((cmd(p, "frame:mat") as { rect: unknown }).rect);
  });

  it("has no rotation / shadow / grain / gloss commands", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    expect(p.commands).toHaveLength(3);
    const json = JSON.stringify(p);
    for (const bad of ["rot", "shadow", "grain", "gloss"]) expect(json).not.toContain(bad);
  });

  it("does not mutate the input transform", () => {
    const input = deepFreeze({ ...FRAME_BASE, transform: { scale: 1.5, x: 7, y: 8 } });
    expect(() => buildPreviewRenderPlan(input)).not.toThrow();
    expect(input.transform.x).toBe(7);
  });
});

// ---- E. errors & leak ---------------------------------------------------------
describe("buildPreviewRenderPlan — errors & leak", () => {
  it("rejects an invalid kind (and null) without throwing", () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentionally malformed input
    expect(buildPreviewRenderPlan({ kind: "nope" } as any)).toEqual({
      ok: false,
      code: "INVALID_KIND",
    });
    // biome-ignore lint/suspicious/noExplicitAny: intentionally malformed input
    expect(buildPreviewRenderPlan(null as any)).toEqual({ ok: false, code: "INVALID_KIND" });
  });

  it.each([
    ["zero canvas", { ...CASE_BASE, logicalCanvas: { width: 0, height: 200 } }, "INVALID_ZONE"],
    ["zero image", { ...CASE_BASE, image: { width: 0, height: 100 } }, "INVALID_ZONE"],
    [
      "nan canvas",
      { ...CASE_BASE, logicalCanvas: { width: Number.NaN, height: 200 } },
      "INVALID_ZONE",
    ],
    [
      "zero scale",
      { ...CASE_BASE, defaultTransform: { scale: 0, x: 0, y: 0 } },
      "INVALID_TRANSFORM",
    ],
    [
      "nan pan",
      { ...CASE_BASE, defaultTransform: { scale: 1, x: Number.NaN, y: 0 } },
      "INVALID_TRANSFORM",
    ],
  ])("case %s → %s", (_label, input, code) => {
    expect(buildPreviewRenderPlan(input as CasePlanInput)).toEqual({ ok: false, code });
  });

  it.each([
    [
      "zero image zone",
      { ...FRAME_BASE, imageZone: { x: 0, y: 0, width: 0, height: 10 } },
      "INVALID_ZONE",
    ],
    ["bad mat color", { ...FRAME_BASE, matColor: "#12345" }, "INVALID_COLOR"],
    ["bad frame color", { ...FRAME_BASE, frameColor: "red" }, "INVALID_COLOR"],
    ["bad transform", { ...FRAME_BASE, transform: { scale: -1, x: 0, y: 0 } }, "INVALID_TRANSFORM"],
  ])("frame %s → %s", (_label, input, code) => {
    expect(buildPreviewRenderPlan(input as FramePlanInput)).toEqual({ ok: false, code });
  });

  it("does not echo the input zone id into the serialized error (error carries only a code)", () => {
    const r = buildPreviewRenderPlan({
      ...CASE_BASE,
      bodyColor: "not-a-hex", // fatal
      zones: [
        {
          id: "SECRET_ID_MARKER",
          imageRef: "img",
          rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 },
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("SECRET_ID_MARKER");
  });

  it.each([
    ["data", "data:image/png;base64,QQ"],
    ["blob", "blob:https://x/y"],
    ["http", "http://x/y.png"],
    ["https", "https://x/y.png"],
    ["javascript", "javascript:alert(1)"],
  ])("rejects a %s: imageRef as INVALID_ID", (_label, imageRef) => {
    const c = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [{ id: "z", imageRef, rect: { units: "logical", x: 0, y: 0, width: 10, height: 10 } }],
    });
    expect(c).toEqual({ ok: false, code: "INVALID_ID" });
    const f = buildPreviewRenderPlan({ ...FRAME_BASE, imageRef });
    expect(f).toEqual({ ok: false, code: "INVALID_ID" });
  });
});

// ---- F. runtime-malformed input never throws (spec 020 hardening) --------------
// biome-ignore lint/suspicious/noExplicitAny: intentionally malformed runtime input bypassing types
const omit = (o: any, k: string): unknown => {
  const c = { ...o };
  delete c[k];
  return c;
};
const LZONE = { units: "logical", x: 0, y: 0, width: 10, height: 10 } as const;

describe("buildPreviewRenderPlan — runtime-malformed input returns errors (no throw)", () => {
  it.each<[string, unknown, string]>([
    ["null input", null, "INVALID_KIND"],
    ["primitive input", 5, "INVALID_KIND"],
    ["case zones item null", { ...CASE_BASE, zones: [null] }, "INVALID_ZONE"],
    ["case zones item primitive", { ...CASE_BASE, zones: [42] }, "INVALID_ZONE"],
    ["case zones not array", { ...CASE_BASE, zones: {} }, "INVALID_ZONE"],
    ["case logicalCanvas null", { ...CASE_BASE, logicalCanvas: null }, "INVALID_ZONE"],
    ["case logicalCanvas missing", omit(CASE_BASE, "logicalCanvas"), "INVALID_ZONE"],
    ["case image null", { ...CASE_BASE, image: null }, "INVALID_ZONE"],
    ["case defaultTransform null", { ...CASE_BASE, defaultTransform: null }, "INVALID_TRANSFORM"],
    ["case defaultTransform missing", omit(CASE_BASE, "defaultTransform"), "INVALID_TRANSFORM"],
    [
      "case zone.rect null",
      { ...CASE_BASE, zones: [{ id: "z", imageRef: "i", rect: null }] },
      "INVALID_ZONE",
    ],
    [
      "case zone.rect no units",
      {
        ...CASE_BASE,
        zones: [{ id: "z", imageRef: "i", rect: { x: 0, y: 0, width: 10, height: 10 } }],
      },
      "INVALID_ZONE",
    ],
    [
      "case zone.transform null",
      { ...CASE_BASE, zones: [{ id: "z", imageRef: "i", rect: LZONE, transform: null }] },
      "INVALID_TRANSFORM",
    ],
    [
      "case zone.transform partial",
      { ...CASE_BASE, zones: [{ id: "z", imageRef: "i", rect: LZONE, transform: { scale: 1 } }] },
      "INVALID_TRANSFORM",
    ],
    [
      "case zone.guide null",
      { ...CASE_BASE, zones: [{ id: "z", imageRef: "i", rect: LZONE, guide: null }] },
      "INVALID_ZONE",
    ],
    ["frame frameRect null", { ...FRAME_BASE, frameRect: null }, "INVALID_ZONE"],
    ["frame frameRect missing", omit(FRAME_BASE, "frameRect"), "INVALID_ZONE"],
    ["frame imageZone primitive", { ...FRAME_BASE, imageZone: 5 }, "INVALID_ZONE"],
    ["frame matRect null", { ...FRAME_BASE, matRect: null }, "INVALID_ZONE"],
    ["frame matRect missing", omit(FRAME_BASE, "matRect"), "INVALID_ZONE"],
    ["frame matRect primitive", { ...FRAME_BASE, matRect: "10" }, "INVALID_ZONE"],
    [
      "frame matRect partial",
      { ...FRAME_BASE, matRect: { x: 10, y: 10, width: 280 } },
      "INVALID_ZONE",
    ],
    ["frame transform null", { ...FRAME_BASE, transform: null }, "INVALID_TRANSFORM"],
    ["frame transform missing", omit(FRAME_BASE, "transform"), "INVALID_TRANSFORM"],
    ["frame innerBorder null", { ...FRAME_BASE, innerBorder: null }, "INVALID_ZONE"],
    [
      "frame innerBorder no width",
      { ...FRAME_BASE, innerBorder: { color: "#000000" } },
      "NON_FINITE_RESULT",
    ],
  ])("%s → %s (no throw)", (_label, input, code) => {
    let r: RenderPlanResult;
    expect(() => {
      r = buildPreviewRenderPlan(input as never);
    }).not.toThrow();
    // biome-ignore lint/style/noNonNullAssertion: assigned above in the non-throwing callback
    expect(r!).toEqual(expect.objectContaining({ ok: false, code }));
  });
});

// ---- G. restricted identifier grammar (zone.id + imageRef) --------------------
// Scope: the grammar rejects URL-shaped/whitespace/control/padded-base64 DELIMITER forms. It is NOT
// a secret detector — an all-allowed-char token/secret/unpadded base64 would still be accepted; that
// is the caller's responsibility. These tests assert the delimiter/scheme rejection, not "no token".
describe("buildPreviewRenderPlan — restricted identifier grammar (delimiter/scheme rejection)", () => {
  it.each<[string, string]>([
    ["leading space + https", " https://example.invalid/image"],
    ["leading tab + data", "\tdata:image/png;base64,QQ"],
    ["leading newline + javascript", "\njavascript:alert(1)"],
    ["trailing space", "img-1 "],
    ["internal newline", "im\nage"],
    ["tab", "im\tage"],
    ["control char", "img"],
    ["colon (scheme-like)", "case:body"],
    ["slash", "a/b"],
    ["base64 plus/equals", "AA+/=="],
  ])("rejects a URL-shaped / delimiter imageRef (%s) as INVALID_ID", (_label, imageRef) => {
    expect(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [{ id: "z", imageRef, rect: LZONE }] }),
    ).toEqual({ ok: false, code: "INVALID_ID" });
    expect(buildPreviewRenderPlan({ ...FRAME_BASE, imageRef })).toEqual({
      ok: false,
      code: "INVALID_ID",
    });
  });

  it("a URL-form zone.id is rejected and never reaches a layerId", () => {
    const r = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [{ id: "https://evil.example/x", imageRef: "i", rect: LZONE }],
    });
    expect(r).toEqual({ ok: false, code: "INVALID_ID" });
    expect(JSON.stringify(r)).not.toContain("evil.example");
  });

  it("accepts normal synthetic ids (alnum + . _ - up to 128 chars)", () => {
    const id = `${"a".repeat(120)}.b_c-3`;
    expect(id.length).toBeGreaterThan(120);
    const p = plan(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [{ id, imageRef: "img.0_a-1", rect: LZONE }] }),
    );
    expect(layerIds(p)).toEqual(["case:body", `case:user-image:${id}`]);
  });

  it("rejects an over-length id (>128)", () => {
    const id = "a".repeat(129);
    expect(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [{ id, imageRef: "i", rect: LZONE }] }),
    ).toEqual({ ok: false, code: "INVALID_ID" });
  });
});

// ---- H. zone.order finiteness -------------------------------------------------
describe("buildPreviewRenderPlan — zone.order validation", () => {
  it.each<[string, number]>([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects a %s order as INVALID_ZONE", (_label, order) => {
    expect(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [{ id: "z", imageRef: "i", rect: LZONE, order }],
      }),
    ).toEqual({ ok: false, code: "INVALID_ZONE" });
  });

  it("allows finite negative/decimal order and keeps ascending semantics", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          { id: "b", imageRef: "i0", rect: LZONE, order: 0.5 },
          { id: "a", imageRef: "i1", rect: LZONE, order: -1.5 },
        ],
      }),
    );
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:a", "case:user-image:b"]);
  });

  it("without order, falls back to source index order", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          { id: "first", imageRef: "i0", rect: LZONE },
          { id: "second", imageRef: "i1", rect: LZONE },
        ],
      }),
    );
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:first", "case:user-image:second"]);
  });
});

// ---- D2. frame mat / image zone separation (spec 024) --------------------------
describe("buildPreviewRenderPlan ??frame containment (spec 024)", () => {
  const frame = (over: Partial<FramePlanInput>): unknown => ({ ...FRAME_BASE, ...over });
  const code = (input: unknown): string => {
    const r = buildPreviewRenderPlan(input as FramePlanInput);
    return r.ok ? "ok" : r.code;
  };

  it("allows shared edges at every level", () => {
    expect(
      code(
        frame({
          frameRect: { x: 0, y: 0, width: 300, height: 400 },
          matRect: { x: 0, y: 0, width: 300, height: 400 },
          imageZone: { x: 0, y: 0, width: 300, height: 400 },
        }),
      ),
    ).toBe("ok");
  });

  it("allows a frameRect smaller than the logical canvas", () => {
    expect(
      code(
        frame({
          frameRect: { x: 20, y: 30, width: 200, height: 300 },
          matRect: { x: 30, y: 40, width: 180, height: 280 },
          imageZone: { x: 40, y: 50, width: 160, height: 260 },
        }),
      ),
    ).toBe("ok");
  });

  it.each([
    ["frameRect off the left", { frameRect: { x: -1, y: 0, width: 300, height: 400 } }],
    ["frameRect off the top", { frameRect: { x: 0, y: -1, width: 300, height: 400 } }],
    ["frameRect off the right", { frameRect: { x: 1, y: 0, width: 300, height: 400 } }],
    ["frameRect off the bottom", { frameRect: { x: 0, y: 1, width: 300, height: 400 } }],
  ])("rejects a frameRect outside the logical canvas (%s)", (_label, over) => {
    expect(code(frame(over))).toBe("INVALID_ZONE");
  });

  it.each([
    ["matRect off the left", { matRect: { x: -1, y: 10, width: 100, height: 100 } }],
    ["matRect off the top", { matRect: { x: 10, y: -1, width: 100, height: 100 } }],
    ["matRect off the right", { matRect: { x: 10, y: 10, width: 295, height: 100 } }],
    ["matRect off the bottom", { matRect: { x: 10, y: 10, width: 100, height: 395 } }],
  ])("rejects a matRect outside the frameRect (%s)", (_label, over) => {
    expect(code(frame(over))).toBe("INVALID_ZONE");
  });

  it.each([
    ["imageZone off the left", { imageZone: { x: 9, y: 20, width: 100, height: 100 } }],
    ["imageZone off the top", { imageZone: { x: 20, y: 9, width: 100, height: 100 } }],
    ["imageZone off the right", { imageZone: { x: 20, y: 20, width: 275, height: 100 } }],
    ["imageZone off the bottom", { imageZone: { x: 20, y: 20, width: 100, height: 375 } }],
  ])("rejects an imageZone outside the matRect (%s)", (_label, over) => {
    expect(code(frame(over))).toBe("INVALID_ZONE");
  });

  it("uses no tolerance: a hair outside still fails", () => {
    const outside = { x: 10 - Number.EPSILON * 10, y: 20, width: 10, height: 10 };
    expect(code(frame({ imageZone: outside }))).toBe("INVALID_ZONE");
  });

  it.each([
    [
      "frameRect edge overflow",
      {
        logicalCanvas: { width: Number.MAX_VALUE, height: Number.MAX_VALUE },
        frameRect: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
      },
    ],
    [
      "matRect edge overflow",
      {
        logicalCanvas: { width: Number.MAX_VALUE, height: Number.MAX_VALUE },
        frameRect: { x: 0, y: 0, width: Number.MAX_VALUE, height: Number.MAX_VALUE },
        matRect: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
      },
    ],
    [
      "imageZone edge overflow",
      {
        logicalCanvas: { width: Number.MAX_VALUE, height: Number.MAX_VALUE },
        frameRect: { x: 0, y: 0, width: 10, height: 10 },
        matRect: { x: 0, y: 0, width: 10, height: 10 },
        imageZone: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
      },
    ],
  ])("maps a finite-input edge overflow to NON_FINITE_RESULT (%s)", (_label, over) => {
    expect(code(frame(over))).toBe("NON_FINITE_RESULT");
  });

  it("does not produce a partial plan when containment fails", () => {
    const result = buildPreviewRenderPlan(
      // one px wider than the frame band it must sit inside
      frame({ matRect: { x: 0, y: 0, width: 301, height: 400 } }) as FramePlanInput,
    );
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
  });

  it("keeps the inner border on the imageZone", () => {
    const p = plan(
      buildPreviewRenderPlan({ ...FRAME_BASE, innerBorder: { color: "#191A1D", width: 2 } }),
    );
    expect((cmd(p, "frame:inner-border") as { rect: unknown }).rect).toEqual({
      x: 18,
      y: 18,
      width: 264,
      height: 364,
    });
  });
});

describe("buildPreviewRenderPlan ??frame hostile runtime input (spec 024)", () => {
  const throwingRect = (key: string): Record<string, unknown> => {
    const rect: Record<string, unknown> = { x: 20, y: 20, width: 100, height: 100 };
    Object.defineProperty(rect, key, {
      get() {
        throw new Error("hostile rect getter");
      },
      enumerable: true,
    });
    return rect;
  };

  it.each(["frameRect", "matRect", "imageZone"])(
    "never throws for a throwing getter on %s",
    (field) => {
      for (const key of ["x", "y", "width", "height"]) {
        const input = { ...FRAME_BASE, [field]: throwingRect(key) } as unknown as FramePlanInput;
        expect(() => buildPreviewRenderPlan(input)).not.toThrow();
        expect(buildPreviewRenderPlan(input).ok).toBe(false);
      }
    },
  );

  it.each(["frameRect", "matRect", "imageZone"])(
    "never throws for a Proxy trap or a revoked Proxy on %s",
    (field) => {
      const trap = new Proxy(
        { x: 20, y: 20, width: 100, height: 100 },
        {
          get() {
            throw new Error("hostile trap");
          },
          has() {
            throw new Error("hostile has trap");
          },
        },
      );
      const revocable = Proxy.revocable({ x: 20, y: 20, width: 100, height: 100 }, {});
      revocable.revoke();
      for (const hostile of [trap, revocable.proxy]) {
        const input = { ...FRAME_BASE, [field]: hostile } as unknown as FramePlanInput;
        expect(() => buildPreviewRenderPlan(input)).not.toThrow();
        expect(buildPreviewRenderPlan(input).ok).toBe(false);
      }
    },
  );

  it("uses a single snapshot: a drifting rect cannot change the emitted command", () => {
    let reads = 0;
    const first = { x: 18, y: 18, width: 264, height: 364 };
    // any read after the validated one would break containment and change the clip rect
    const later = { x: 0, y: 0, width: 300, height: 400 };
    const drifting: Record<string, unknown> = {};
    for (const key of ["x", "y", "width", "height"] as const) {
      Object.defineProperty(drifting, key, {
        get() {
          const source = reads < 4 ? first : later;
          reads += 1;
          return source[key];
        },
        enumerable: true,
      });
    }
    const p = plan(
      buildPreviewRenderPlan({ ...FRAME_BASE, imageZone: drifting } as unknown as FramePlanInput),
    );
    const img = cmd(p, "frame:user-image");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.clipRect).toEqual({ x: 18, y: 18, width: 264, height: 364 });
    expect((cmd(p, "frame:mat") as { rect: unknown }).rect).toEqual({
      x: 10,
      y: 10,
      width: 280,
      height: 380,
    });
  });

  it("keeps rect values, imageRef and identifiers out of a failure payload", () => {
    const result = buildPreviewRenderPlan({
      ...FRAME_BASE,
      imageRef: "frame-img",
      matRect: { x: 0, y: 0, width: 999, height: 999 }, // outside the frameRect
    } as FramePlanInput);
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["999", "frame-img", "http", "data:", "token"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("does not mutate a deep-frozen frame input and stays deterministic", () => {
    const input = deepFreeze({ ...FRAME_BASE });
    const before = JSON.stringify(input);
    const a = buildPreviewRenderPlan(input);
    const b = buildPreviewRenderPlan(input);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("emits only finite numbers for the frame plan", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    for (const command of p.commands) {
      const rects =
        command.type === "draw-image-cover" ? [command.clipRect, command.drawRect] : [command.rect];
      for (const rect of rects) {
        for (const value of [rect.x, rect.y, rect.width, rect.height]) {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });
});

// The E2E harness writes its frame plan as a literal (it must not contain spec 020 INPUT field
// names ??see apps/mockup/src/e2e/canvas-fixture.tsx). This pins that literal to the builder, so the
// Chromium pixel test really exercises the command shape the builder produces.
describe("buildPreviewRenderPlan ??frame E2E fixture equivalence (spec 024)", () => {
  it("produces exactly the harness frame commands", () => {
    const p = plan(
      buildPreviewRenderPlan({
        kind: "frame",
        logicalCanvas: { width: 300, height: 200 },
        frameRect: { x: 0, y: 0, width: 300, height: 200 },
        matRect: { x: 20, y: 20, width: 260, height: 160 },
        imageZone: { x: 60, y: 50, width: 180, height: 100 },
        frameColor: "#663300",
        matColor: "#FFFF00",
        image: { width: 10, height: 10 },
        transform: { scale: 1, x: 0, y: 0 },
        imageRef: "fixtureDrawable",
      }),
    );
    expect(p).toEqual({
      kind: "frame",
      logicalCanvas: { width: 300, height: 200 },
      commands: [
        {
          type: "fill-rect",
          layerId: "frame:body",
          rect: { x: 0, y: 0, width: 300, height: 200 },
          color: "#663300",
        },
        {
          type: "fill-rect",
          layerId: "frame:mat",
          rect: { x: 20, y: 20, width: 260, height: 160 },
          color: "#FFFF00",
        },
        {
          type: "draw-image-cover",
          layerId: "frame:user-image",
          imageRef: "fixtureDrawable",
          clipRect: { x: 60, y: 50, width: 180, height: 100 },
          drawRect: { x: 60, y: 10, width: 180, height: 180 },
        },
      ],
    });
  });
});
