import { describe, expect, it } from "vitest";
import { buildPreviewRenderPlan } from "./build";
import type {
  CaseImageZone,
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

/** Zone helper: spec 025 makes `image` and `transform` per-zone required fields. */
const caseZone = (over: Partial<CaseImageZone> = {}): CaseImageZone => ({
  id: "z0",
  imageRef: "img-0",
  image: { width: 100, height: 100 },
  rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
  transform: { scale: 1, x: 0, y: 0 },
  ...over,
});
/** Deliberately malformed zone for the runtime-safety tables (types bypassed on purpose). */
const badZone = (over: Record<string, unknown>): unknown => ({ ...caseZone(), ...over });
const CASE_BASE: CasePlanInput = {
  kind: "case",
  logicalCanvas: { width: 200, height: 200 },
  bodyColor: "#101112",
  zones: [caseZone()],
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
      zones: [caseZone({ transform: { scale: 2, x: 5, y: 6 } })],
    });
    expect(() => buildPreviewRenderPlan(input)).not.toThrow();
    expect(input.zones[0].transform.scale).toBe(2);
    expect(input.zones[0].transform.x).toBe(5);
  });

  it("success plan is JSON round-trippable and all numbers finite", () => {
    const p = plan(buildPreviewRenderPlan(CASE_BASE));
    const round = JSON.parse(JSON.stringify(p));
    expect(round).toEqual(p);
    for (const c of p.commands) {
      const rects =
        c.type === "draw-image-cover"
          ? [c.clipRect, c.drawRect]
          : c.type === "draw-image-stretch"
            ? [c.destRect]
            : c.type === "draw-text"
              ? [] // spec 031: text carries an origin and measured widths, not a rect
              : [c.rect];
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
      zones: [caseZone({ id: "  ", imageRef: "i" })],
    });
    expect(empty).toEqual({ ok: false, code: "INVALID_ID" });
    const dup = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [caseZone({ id: "z", imageRef: "i0" }), caseZone({ id: "z", imageRef: "i1" })],
    });
    expect(dup).toEqual({ ok: false, code: "INVALID_ID" });
  });

  it("does not turn a geometry overflow into a success/empty plan", () => {
    const r = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [caseZone({ transform: { scale: Number.MAX_VALUE, x: 0, y: 0 } })],
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
          caseZone({
            imageRef: "i",
            rect: { units: "percent", x: 25, y: 10, width: 50, height: 40 },
          }),
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
        zones: [
          caseZone({
            imageRef: "i",
            image: { width: 200, height: 100 },
            rect: { units: "logical", x: 0, y: 0, width: 100, height: 100 },
          }),
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
        // maxPan 50 → clamp; drawX = -50 + 50 = 0
        zones: [caseZone({ transform: { scale: 1.5, x: 100, y: 0 } })],
      }),
    );
    const img = cmd(p, "case:user-image:z0");
    if (img.type !== "draw-image-cover") throw new Error("type");
    expect(img.drawRect.x).toBeCloseTo(0, 9);
  });

  it("each zone uses ITS OWN intrinsic image size and transform (spec 025)", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          caseZone({
            id: "a",
            imageRef: "ia",
            image: { width: 100, height: 100 },
            transform: { scale: 2, x: 0, y: 0 },
          }),
          caseZone({
            id: "b",
            imageRef: "ib",
            image: { width: 200, height: 100 },
            transform: { scale: 1.5, x: 0, y: 0 },
          }),
        ],
      }),
    );
    const a = cmd(p, "case:user-image:a");
    const b = cmd(p, "case:user-image:b");
    if (a.type !== "draw-image-cover" || b.type !== "draw-image-cover") throw new Error("type");
    // a: 100x100 -> baseScale max(200/100,200/100)=2, x2 -> 400x400
    expect(a.drawRect.width).toBeCloseTo(400, 9);
    expect(a.drawRect.height).toBeCloseTo(400, 9);
    // b: 200x100 -> baseScale max(200/200,200/100)=2, x1.5 -> 600x300
    expect(b.drawRect.width).toBeCloseTo(600, 9);
    expect(b.drawRect.height).toBeCloseTo(300, 9);
    // same clip rect, but the draw rects must differ because the intrinsic sizes differ
    expect(a.clipRect).toEqual(b.clipRect);
    expect(a.drawRect).not.toEqual(b.drawRect);
  });

  it("a zone with no transform or no image is rejected (no plan-level fallback)", () => {
    const noTransform = { ...caseZone() } as Record<string, unknown>;
    delete noTransform.transform;
    expect(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [noTransform] } as unknown as CasePlanInput),
    ).toEqual({ ok: false, code: "INVALID_TRANSFORM" });
    const noImage = { ...caseZone() } as Record<string, unknown>;
    delete noImage.image;
    expect(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [noImage] } as unknown as CasePlanInput),
    ).toEqual({ ok: false, code: "INVALID_ZONE" });
  });

  it("orders by explicit order ascending, ties by original source index", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          caseZone({ id: "late", imageRef: "i0", order: 2 }),
          caseZone({ id: "tieA", imageRef: "i1", order: 1 }),
          caseZone({ id: "tieB", imageRef: "i2", order: 1 }),
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
        zones: [caseZone({ imageRef: "i", guide: { color: "#000000", width: 2 } })],
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
    [
      "zero zone image",
      { ...CASE_BASE, zones: [caseZone({ image: { width: 0, height: 100 } })] },
      "INVALID_ZONE",
    ],
    [
      "nan canvas",
      { ...CASE_BASE, logicalCanvas: { width: Number.NaN, height: 200 } },
      "INVALID_ZONE",
    ],
    [
      "zero zone scale",
      { ...CASE_BASE, zones: [caseZone({ transform: { scale: 0, x: 0, y: 0 } })] },
      "INVALID_TRANSFORM",
    ],
    [
      "nan zone pan",
      { ...CASE_BASE, zones: [caseZone({ transform: { scale: 1, x: Number.NaN, y: 0 } })] },
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
      zones: [caseZone({ id: "SECRET_ID_MARKER", imageRef: "img" })],
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
      zones: [caseZone({ id: "z", imageRef })],
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

describe("buildPreviewRenderPlan — runtime-malformed input returns errors (no throw)", () => {
  it.each<[string, unknown, string]>([
    ["null input", null, "INVALID_KIND"],
    ["primitive input", 5, "INVALID_KIND"],
    ["case zones item null", { ...CASE_BASE, zones: [null] }, "INVALID_ZONE"],
    ["case zones item primitive", { ...CASE_BASE, zones: [42] }, "INVALID_ZONE"],
    ["case zones not array", { ...CASE_BASE, zones: {} }, "INVALID_ZONE"],
    ["case logicalCanvas null", { ...CASE_BASE, logicalCanvas: null }, "INVALID_ZONE"],
    ["case logicalCanvas missing", omit(CASE_BASE, "logicalCanvas"), "INVALID_ZONE"],
    ["case zone image null", { ...CASE_BASE, zones: [badZone({ image: null })] }, "INVALID_ZONE"],
    [
      "case zone image missing",
      { ...CASE_BASE, zones: [omit(caseZone(), "image")] },
      "INVALID_ZONE",
    ],
    [
      "case zone transform missing",
      { ...CASE_BASE, zones: [omit(caseZone(), "transform")] },
      "INVALID_TRANSFORM",
    ],
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
      { ...CASE_BASE, zones: [badZone({ id: "z", imageRef: "i", transform: null })] },
      "INVALID_TRANSFORM",
    ],
    [
      "case zone.transform partial",
      { ...CASE_BASE, zones: [badZone({ id: "z", imageRef: "i", transform: { scale: 1 } })] },
      "INVALID_TRANSFORM",
    ],
    [
      "case zone.guide null",
      { ...CASE_BASE, zones: [badZone({ id: "z", imageRef: "i", guide: null })] },
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
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [caseZone({ id: "z", imageRef })] }),
    ).toEqual({ ok: false, code: "INVALID_ID" });
    expect(buildPreviewRenderPlan({ ...FRAME_BASE, imageRef })).toEqual({
      ok: false,
      code: "INVALID_ID",
    });
  });

  it("a URL-form zone.id is rejected and never reaches a layerId", () => {
    const r = buildPreviewRenderPlan({
      ...CASE_BASE,
      zones: [caseZone({ id: "https://evil.example/x", imageRef: "i" })],
    });
    expect(r).toEqual({ ok: false, code: "INVALID_ID" });
    expect(JSON.stringify(r)).not.toContain("evil.example");
  });

  it("accepts normal synthetic ids (alnum + . _ - up to 128 chars)", () => {
    const id = `${"a".repeat(120)}.b_c-3`;
    expect(id.length).toBeGreaterThan(120);
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [caseZone({ id, imageRef: "img.0_a-1" })],
      }),
    );
    expect(layerIds(p)).toEqual(["case:body", `case:user-image:${id}`]);
  });

  it("rejects an over-length id (>128)", () => {
    const id = "a".repeat(129);
    expect(
      buildPreviewRenderPlan({ ...CASE_BASE, zones: [caseZone({ id, imageRef: "i" })] }),
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
        zones: [caseZone({ id: "z", imageRef: "i", order })],
      }),
    ).toEqual({ ok: false, code: "INVALID_ZONE" });
  });

  it("allows finite negative/decimal order and keeps ascending semantics", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          caseZone({ id: "b", imageRef: "i0", order: 0.5 }),
          caseZone({ id: "a", imageRef: "i1", order: -1.5 }),
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
          caseZone({ id: "first", imageRef: "i0" }),
          caseZone({ id: "second", imageRef: "i1" }),
        ],
      }),
    );
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:first", "case:user-image:second"]);
  });
});

// ---- I. case input single-read snapshot (spec 025 §7) -------------------------
// Every used case field must be read EXACTLY once into a plain normalized snapshot. A getter that
// returns a valid value to the validation and a different (or throwing) one afterwards must not be
// able to influence the emitted plan.
describe("buildPreviewRenderPlan — case single-read snapshot", () => {
  const THROW = Symbol("throw-on-second-read");

  /** Replace `key` with a counting getter: first read = the original value, later = `later`. */
  const drift = (
    base: Record<string, unknown>,
    key: string,
    later: unknown,
  ): { object: Record<string, unknown>; reads: () => number } => {
    const object: Record<string, unknown> = { ...base };
    const first = object[key];
    let reads = 0;
    Object.defineProperty(object, key, {
      get() {
        reads += 1;
        if (reads === 1) return first;
        if (later === THROW) throw new Error("second read");
        return later;
      },
      enumerable: true,
      configurable: true,
    });
    return { object, reads: () => reads };
  };

  /** Object whose every field is a counting getter (used for nested rect/image/transform). */
  const counting = (
    values: Record<string, unknown>,
  ): { object: Record<string, unknown>; counts: Record<string, number> } => {
    const counts: Record<string, number> = {};
    const object: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      counts[key] = 0;
      Object.defineProperty(object, key, {
        get() {
          counts[key] = (counts[key] ?? 0) + 1;
          return value;
        },
        enumerable: true,
      });
    }
    return { object, counts };
  };

  const guidedZone = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...caseZone(),
    order: 0,
    guide: { color: "#000000", width: 2 },
    ...over,
  });
  const caseWith = (zone: Record<string, unknown>): unknown => ({ ...CASE_BASE, zones: [zone] });

  it("reads bodyColor once and ignores a later invalid colour", () => {
    const { object, reads } = drift({ ...CASE_BASE }, "bodyColor", "not-a-hex");
    const p = plan(buildPreviewRenderPlan(object as unknown as CasePlanInput));
    expect(reads()).toBe(1);
    expect((cmd(p, "case:body") as { color: string }).color).toBe("#101112");
  });

  it("reads the zones array once (a later array cannot add zones)", () => {
    const { object, reads } = drift({ ...CASE_BASE }, "zones", [
      caseZone({ id: "injected", imageRef: "injected" }),
    ]);
    const p = plan(buildPreviewRenderPlan(object as unknown as CasePlanInput));
    expect(reads()).toBe(1);
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:z0"]);
  });

  it("reads zone.id once (a later id cannot reach a layerId)", () => {
    const { object, reads } = drift(guidedZone(), "id", "INJECTED_ID_MARKER");
    const p = plan(buildPreviewRenderPlan(caseWith(object) as CasePlanInput));
    expect(reads()).toBe(1);
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:z0", "case:guide:z0"]);
    expect(JSON.stringify(p)).not.toContain("INJECTED_ID_MARKER");
  });

  it("reads zone.imageRef once (a later imageRef cannot reach the command)", () => {
    const { object, reads } = drift(guidedZone(), "imageRef", "https://evil.example/x");
    const p = plan(buildPreviewRenderPlan(caseWith(object) as CasePlanInput));
    expect(reads()).toBe(1);
    expect((cmd(p, "case:user-image:z0") as { imageRef: string }).imageRef).toBe("img-0");
    expect(JSON.stringify(p)).not.toContain("evil.example");
  });

  it("reads zone.order once (a later order cannot re-sort the layers)", () => {
    const drifting = drift(guidedZone({ id: "a", imageRef: "ia", order: 2 }), "order", -5);
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [drifting.object, guidedZone({ id: "b", imageRef: "ib", order: 1 })],
      } as unknown as CasePlanInput),
    );
    expect(drifting.reads()).toBe(1);
    expect(layerIds(p)).toEqual([
      "case:body",
      "case:user-image:b", // order 1
      "case:user-image:a", // order 2 (the later -5 is never read)
      "case:guide:b",
      "case:guide:a",
    ]);
  });

  it("reads zone.guide once (a later guide cannot change the stroke)", () => {
    const { object, reads } = drift(guidedZone(), "guide", { color: "#FFFFFF", width: 9 });
    const p = plan(buildPreviewRenderPlan(caseWith(object) as CasePlanInput));
    expect(reads()).toBe(1);
    expect(cmd(p, "case:guide:z0")).toEqual({
      type: "stroke-rect",
      layerId: "case:guide:z0",
      rect: { x: 0, y: 0, width: 200, height: 200 },
      color: "#000000",
      width: 2,
    });
  });

  it("reads each nested rect / image / transform field exactly once", () => {
    const rect = counting({ units: "logical", x: 0, y: 0, width: 200, height: 200 });
    const image = counting({ width: 100, height: 100 });
    const transform = counting({ scale: 1, x: 0, y: 0 });
    const guide = counting({ color: "#000000", width: 2 });
    plan(
      buildPreviewRenderPlan(
        caseWith(
          guidedZone({
            rect: rect.object,
            image: image.object,
            transform: transform.object,
            guide: guide.object,
          }),
        ) as CasePlanInput,
      ),
    );
    for (const counts of [rect.counts, image.counts, transform.counts, guide.counts]) {
      for (const [key, value] of Object.entries(counts)) {
        expect([key, value]).toEqual([key, 1]);
      }
    }
  });

  it("reads the plan-level canvas fields exactly once", () => {
    const canvas = counting({ width: 200, height: 200 });
    plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        logicalCanvas: canvas.object,
      } as unknown as CasePlanInput),
    );
    expect(canvas.counts).toEqual({ width: 1, height: 1 });
  });

  it.each(["bodyColor", "zones"])("still succeeds when %s throws on a second read", (key) => {
    const { object, reads } = drift({ ...CASE_BASE }, key, THROW);
    const p = plan(buildPreviewRenderPlan(object as unknown as CasePlanInput));
    expect(reads()).toBe(1);
    expect(layerIds(p)).toEqual(["case:body", "case:user-image:z0"]);
  });

  it.each(["id", "imageRef", "rect", "order", "image", "transform", "guide"])(
    "still succeeds when zone.%s throws on a second read",
    (key) => {
      const { object, reads } = drift(guidedZone(), key, THROW);
      const p = plan(buildPreviewRenderPlan(caseWith(object) as CasePlanInput));
      expect(reads()).toBe(1);
      expect(layerIds(p)).toEqual(["case:body", "case:user-image:z0", "case:guide:z0"]);
    },
  );

  it.each(["id", "imageRef", "rect", "order", "image", "transform", "guide"])(
    "never throws for a hostile getter on zone.%s",
    (key) => {
      const hostile: Record<string, unknown> = { ...guidedZone() };
      delete hostile[key];
      Object.defineProperty(hostile, key, {
        get() {
          throw new Error("hostile zone getter");
        },
        enumerable: true,
      });
      let result: RenderPlanResult | undefined;
      expect(() => {
        result = buildPreviewRenderPlan(caseWith(hostile) as CasePlanInput);
      }).not.toThrow();
      expect(result?.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain("hostile");
    },
  );

  it("never throws for a Proxy trap or a revoked Proxy in the zones array", () => {
    const trap = new Proxy(
      { ...caseZone() },
      {
        get() {
          throw new Error("hostile trap");
        },
        has() {
          throw new Error("hostile has trap");
        },
      },
    );
    const revocable = Proxy.revocable({ ...caseZone() }, {});
    revocable.revoke();
    for (const hostile of [trap, revocable.proxy]) {
      let result: RenderPlanResult | undefined;
      expect(() => {
        result = buildPreviewRenderPlan(caseWith(hostile as Record<string, unknown>) as never);
      }).not.toThrow();
      expect(result?.ok).toBe(false);
    }
  });

  it("reads input.kind once (a later kind cannot re-route the builder)", () => {
    const { object, reads } = drift({ ...CASE_BASE }, "kind", "frame");
    const p = plan(buildPreviewRenderPlan(object as unknown as CasePlanInput));
    expect(reads()).toBe(1);
    expect(p.kind).toBe("case");
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
        command.type === "draw-image-cover"
          ? [command.clipRect, command.drawRect]
          : command.type === "draw-image-stretch"
            ? [command.destRect]
            : command.type === "draw-text"
              ? [] // spec 031: text carries an origin and measured widths, not a rect
              : [command.rect];
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

// ---- J. template art stretch command (spec 028) --------------------------------
describe("buildPreviewRenderPlan — template art", () => {
  const art = {
    imageRef: "template-art.template-art-1",
    destRect: { x: 0, y: 0, width: 200, height: 200 },
  };
  const caseWithArt = (over: Record<string, unknown> = {}): unknown => ({
    ...CASE_BASE,
    templateArt: { ...art, ...over },
  });

  it("draws the case art over the photos and under the guides", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [caseZone({ guide: { color: "#000000", width: 2 } })],
        templateArt: art,
      } as unknown as CasePlanInput),
    );
    expect(layerIds(p)).toEqual([
      "case:body",
      "case:user-image:z0",
      "case:template-art",
      "case:guide:z0",
    ]);
    expect(cmd(p, "case:template-art")).toEqual({
      type: "draw-image-stretch",
      layerId: "case:template-art",
      imageRef: art.imageRef,
      destRect: { x: 0, y: 0, width: 200, height: 200 },
    });
  });

  it("draws the frame art over the photo and under the inner border", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...FRAME_BASE,
        innerBorder: { color: "#191A1D", width: 2 },
        templateArt: { imageRef: "art1", destRect: { x: 10, y: 10, width: 280, height: 380 } },
      } as unknown as FramePlanInput),
    );
    expect(layerIds(p)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
      "frame:template-art",
      "frame:inner-border",
    ]);
  });

  it("emits no art command when none is supplied (no fallback)", () => {
    expect(layerIds(plan(buildPreviewRenderPlan(CASE_BASE)))).not.toContain("case:template-art");
    expect(layerIds(plan(buildPreviewRenderPlan(FRAME_BASE)))).not.toContain("frame:template-art");
  });

  it("keeps the plan JSON-safe and deterministic with art", () => {
    const input = deepFreeze(caseWithArt()) as CasePlanInput;
    const a = plan(buildPreviewRenderPlan(input));
    const b = plan(buildPreviewRenderPlan(input));
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["url-shaped ref", { imageRef: "https://x/y.png" }, "INVALID_ID"],
    ["blank ref", { imageRef: "" }, "INVALID_ID"],
    ["missing rect", { destRect: null }, "INVALID_ZONE"],
    ["zero width", { destRect: { x: 0, y: 0, width: 0, height: 10 } }, "INVALID_ZONE"],
    ["NaN origin", { destRect: { x: Number.NaN, y: 0, width: 10, height: 10 } }, "INVALID_ZONE"],
    ["outside the canvas", { destRect: { x: 1, y: 0, width: 200, height: 200 } }, "INVALID_ZONE"],
    ["off the left", { destRect: { x: -1, y: 0, width: 10, height: 10 } }, "INVALID_ZONE"],
  ])("rejects unusable art (%s) as %s", (_label, over, code) => {
    expect(buildPreviewRenderPlan(caseWithArt(over) as CasePlanInput)).toEqual({ ok: false, code });
  });

  it("rejects an art rect whose far edge overflows to Infinity", () => {
    const result = buildPreviewRenderPlan({
      ...CASE_BASE,
      logicalCanvas: { width: Number.MAX_VALUE, height: Number.MAX_VALUE },
      templateArt: {
        imageRef: "art1",
        destRect: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
      },
    } as unknown as CasePlanInput);
    expect(result).toEqual({ ok: false, code: "NON_FINITE_RESULT" });
  });

  it("never throws for a hostile art getter and never echoes the ref", () => {
    const hostile: Record<string, unknown> = { destRect: { x: 0, y: 0, width: 10, height: 10 } };
    Object.defineProperty(hostile, "imageRef", {
      get() {
        throw new Error("hostile art getter");
      },
      enumerable: true,
    });
    let result: RenderPlanResult | undefined;
    expect(() => {
      result = buildPreviewRenderPlan({ ...CASE_BASE, templateArt: hostile } as never);
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("hostile");
  });

  it("reads the art fields exactly once (a drifting rect cannot change the command)", () => {
    let reads = 0;
    const first = { x: 0, y: 0, width: 200, height: 200 };
    const later = { x: 0, y: 0, width: 999, height: 999 };
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
      buildPreviewRenderPlan({
        ...CASE_BASE,
        templateArt: { imageRef: "art1", destRect: drifting },
      } as unknown as CasePlanInput),
    );
    expect((cmd(p, "case:template-art") as { destRect: unknown }).destRect).toEqual(first);
  });
});

// ---- spec 030: optional quarter-turn rotation ---------------------------------
describe("buildPreviewRenderPlan — quarter-turn rotation (spec 030)", () => {
  it("an absent rotation emits a command byte-identical to the pre-030 shape", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    const img = cmd(p, "frame:user-image");
    // the KEY must be absent, not present-and-zero: a pre-030 consumer sees no new field at all
    expect(Object.hasOwn(img, "rotationQuarterTurns")).toBe(false);
    expect(JSON.parse(JSON.stringify(img))).toEqual({
      type: "draw-image-cover",
      layerId: "frame:user-image",
      imageRef: "frame-img",
      clipRect: { x: 18, y: 18, width: 264, height: 364 },
      drawRect: img.type === "draw-image-cover" ? img.drawRect : null,
    });
  });

  it("an explicit 0 is also omitted, so it cannot change the plan bytes", () => {
    const rotated = plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns: 0 }));
    expect(rotated).toEqual(plan(buildPreviewRenderPlan(FRAME_BASE)));
  });

  it("180° keeps the footprint; 90°/270° SWAP the cover footprint", () => {
    // imageZone 264x364, image 200x100
    const unrotated = cmd(plan(buildPreviewRenderPlan(FRAME_BASE)), "frame:user-image");
    const half = cmd(
      plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns: 2 })),
      "frame:user-image",
    );
    const quarter = cmd(
      plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns: 1 })),
      "frame:user-image",
    );
    if (unrotated.type !== "draw-image-cover") throw new Error("type");
    if (half.type !== "draw-image-cover") throw new Error("type");
    if (quarter.type !== "draw-image-cover") throw new Error("type");

    // 180° is a pure flip: identical silhouette, only the rotation field is added
    expect(half.drawRect).toEqual(unrotated.drawRect);
    expect(half.rotationQuarterTurns).toBe(2);

    // 90°: cover now fits a 100x200 source → baseScale = max(264/100, 364/200) = 2.64
    expect(quarter.rotationQuarterTurns).toBe(1);
    expect(quarter.drawRect.width).toBeCloseTo(264, 6);
    expect(quarter.drawRect.height).toBeCloseTo(528, 6);
    // the clip is untouched by rotation
    expect(quarter.clipRect).toEqual(unrotated.clipRect);
  });

  it("270° and 90° produce the same on-screen footprint (only the direction differs)", () => {
    const one = cmd(
      plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns: 1 })),
      "frame:user-image",
    );
    const three = cmd(
      plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns: 3 })),
      "frame:user-image",
    );
    if (one.type !== "draw-image-cover" || three.type !== "draw-image-cover") throw new Error("t");
    expect(three.drawRect).toEqual(one.drawRect);
    expect(three.rotationQuarterTurns).toBe(3);
  });

  it("a rotated cover still fills the clip completely (no empty space, D-7 survives)", () => {
    for (const rotationQuarterTurns of [0, 1, 2, 3] as const) {
      const c = cmd(
        plan(buildPreviewRenderPlan({ ...FRAME_BASE, rotationQuarterTurns })),
        "frame:user-image",
      );
      if (c.type !== "draw-image-cover") throw new Error("type");
      expect(c.drawRect.width).toBeGreaterThanOrEqual(c.clipRect.width - 1e-9);
      expect(c.drawRect.height).toBeGreaterThanOrEqual(c.clipRect.height - 1e-9);
    }
  });

  it("REJECTS every non-quarter-turn value instead of wrapping or defaulting it", () => {
    for (const bad of [4, -1, 1.5, 90, "1", null, Number.NaN, true, {}]) {
      const r = buildPreviewRenderPlan({
        ...FRAME_BASE,
        rotationQuarterTurns: bad,
      } as unknown as FramePlanInput);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected failure");
      expect(r.code).toBe("INVALID_TRANSFORM");
    }
  });

  it("rotation is validated in the SAME step as the transform (error priority unchanged)", () => {
    // a bad transform AND a bad rotation still report the transform's own code
    const r = buildPreviewRenderPlan({
      ...FRAME_BASE,
      transform: { scale: 0, x: 0, y: 0 },
      rotationQuarterTurns: 9,
    } as unknown as FramePlanInput);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.code).toBe("INVALID_TRANSFORM");
  });

  it("case zones rotate INDEPENDENTLY — one zone's turn never reaches another", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...CASE_BASE,
        zones: [
          caseZone({ id: "z0", imageRef: "img-0", rotationQuarterTurns: 1 }),
          caseZone({
            id: "z1",
            imageRef: "img-1",
            rect: { units: "logical", x: 0, y: 0, width: 200, height: 200 },
          }),
        ],
      }),
    );
    const first = cmd(p, "case:user-image:z0");
    const second = cmd(p, "case:user-image:z1");
    if (first.type !== "draw-image-cover" || second.type !== "draw-image-cover") {
      throw new Error("type");
    }
    expect(first.rotationQuarterTurns).toBe(1);
    expect(Object.hasOwn(second, "rotationQuarterTurns")).toBe(false);
  });

  it("reads the rotation exactly once (a drifting getter cannot change the emitted plan)", () => {
    let reads = 0;
    const zone = {
      ...caseZone(),
      get rotationQuarterTurns() {
        reads += 1;
        return reads === 1 ? 1 : 3; // drift AFTER validation
      },
    };
    const p = plan(buildPreviewRenderPlan({ ...CASE_BASE, zones: [zone as CaseImageZone] }));
    const c = cmd(p, "case:user-image:z0");
    if (c.type !== "draw-image-cover") throw new Error("type");
    expect(reads).toBe(1);
    expect(c.rotationQuarterTurns).toBe(1);
  });

  it("a throwing rotation getter fails safe instead of escaping", () => {
    const zone = {
      ...caseZone(),
      get rotationQuarterTurns(): number {
        throw new Error("hostile");
      },
    };
    const r = buildPreviewRenderPlan({ ...CASE_BASE, zones: [zone as CaseImageZone] });
    expect(r.ok).toBe(false);
  });

  it("template art never gains a rotation field (R-5: the art stays fixed)", () => {
    const p = plan(
      buildPreviewRenderPlan({
        ...FRAME_BASE,
        rotationQuarterTurns: 1,
        templateArt: { imageRef: "art-1", destRect: { x: 10, y: 10, width: 280, height: 380 } },
      }),
    );
    const art = cmd(p, "frame:template-art");
    expect(art.type).toBe("draw-image-stretch");
    expect(Object.hasOwn(art, "rotationQuarterTurns")).toBe(false);
  });
});

// ---- spec 031: deterministic text ---------------------------------------------
//
// The measurement port is a FAKE, so wrapping is exercised without a browser and without depending
// on any real font metric. Real glyph widths are only ever seen in the Chromium E2E.

/** 10 logical px per code point, so an expected width is just `codePoints * 10`. */
const fixedWidth = (perGlyph = 10) => {
  const calls: string[] = [];
  const port = ({ text }: { text: string }): number => {
    calls.push(text);
    return Array.from(text).length * perGlyph;
  };
  return { port, calls };
};

const textZoneInput = (over: Record<string, unknown> = {}) => ({
  value: "AB",
  xPercent: 50,
  yPercent: 20,
  boxWidthPercent: 100,
  fontSizePercent: 10,
  align: "center" as const,
  fontFamily: "DM Sans",
  bold: false,
  italic: false,
  color: "#111111",
  lineHeight: 1.25,
  letterSpacingPercent: 0,
  rotationDegrees: 0,
  maxChars: 80,
  maxLines: 2,
  ...over,
});

const frameWithText = (zones: unknown[]): FramePlanInput =>
  ({ ...FRAME_BASE, textZones: zones }) as FramePlanInput;

const textOf = (p: PreviewRenderPlan) => {
  const found = p.commands.find((c) => c.type === "draw-text");
  if (found?.type !== "draw-text") throw new Error("no text command");
  return found;
};

describe("buildPreviewRenderPlan — deterministic text (spec 031)", () => {
  it('emits nothing for an absent or empty value, but DOES emit for "0"', () => {
    const { port } = fixedWidth();
    for (const value of [undefined, ""]) {
      const p = plan(
        buildPreviewRenderPlan(frameWithText([textZoneInput({ value })]), {
          measureText: port,
        }),
      );
      expect(p.commands.some((c) => c.type === "draw-text")).toBe(false);
    }
    const zero = plan(
      buildPreviewRenderPlan(frameWithText([textZoneInput({ value: "0" })]), { measureText: port }),
    );
    expect(textOf(zero).lines).toEqual([{ text: "0", width: 10 }]);
  });

  it("places text AFTER the art and before the inner border", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(
        {
          ...frameWithText([textZoneInput()]),
          templateArt: { imageRef: "art-1", destRect: { x: 10, y: 10, width: 280, height: 380 } },
          innerBorder: { color: "#000000", width: 2 },
        } as FramePlanInput,
        { measureText: port },
      ),
    );
    expect(layerIds(p)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
      "frame:template-art",
      "frame:text:0",
      "frame:inner-border",
    ]);
  });

  it("resolves the font, origin, line height and spacing from percentages", () => {
    const { port } = fixedWidth();
    // canvas is 300x400; fontSize 10% of width = 30px, lineHeight 1.25 -> 37.5px
    const p = plan(
      buildPreviewRenderPlan(frameWithText([textZoneInput({ letterSpacingPercent: 10 })]), {
        measureText: port,
      }),
    );
    const command = textOf(p);
    expect(command.font).toEqual({
      family: "DM Sans",
      sizePx: 30,
      weight: "normal",
      italic: false,
      fallback: "sans-serif",
    });
    expect(command.origin).toEqual({ x: 150, y: 80 });
    expect(command.lineHeightPx).toBeCloseTo(37.5, 9);
    expect(command.letterSpacingPx).toBeCloseTo(3, 9);
    expect(command.align).toBe("center");
    expect(command.color).toBe("#111111");
    expect(command.rotationDegrees).toBe(0);
  });

  it("includes letter spacing in the measured width, between ADJACENT glyphs only", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(
        frameWithText([textZoneInput({ value: "ABC", letterSpacingPercent: 10 })]),
        { measureText: port },
      ),
    );
    // 3 glyphs * 10px + 2 gaps * 3px
    expect(textOf(p).lines).toEqual([{ text: "ABC", width: 36 }]);
  });

  it("splits on explicit newlines first", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(
        frameWithText([textZoneInput({ value: `A${String.fromCharCode(10)}B` })]),
        {
          measureText: port,
        },
      ),
    );
    expect(textOf(p).lines).toEqual([
      { text: "A", width: 10 },
      { text: "B", width: 10 },
    ]);
  });

  it("wraps on word boundaries when a line does not fit", () => {
    const { port } = fixedWidth();
    // box = 100% of 300px = 300px; "AAAAAAAAAAAAAAAAAAAA BB" is 20 glyphs (200px) + space + 2
    const p = plan(
      buildPreviewRenderPlan(
        frameWithText([textZoneInput({ value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA BB" })]),
        { measureText: port },
      ),
    );
    const lines = textOf(p).lines;
    expect(lines).toHaveLength(2);
    expect(lines[0]?.text).toBe("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(lines[1]?.text).toBe("BB");
  });

  it("breaks a single oversized word by code point rather than overflowing", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(
        frameWithText([textZoneInput({ value: "A".repeat(45), maxLines: 3, boxWidthPercent: 50 })]),
        { measureText: port },
      ),
    );
    const lines = textOf(p).lines;
    // box = 150px = 15 glyphs per line
    expect(lines.map((line) => line.text.length)).toEqual([15, 15, 15]);
  });

  it("REJECTS the whole plan when wrapping needs more lines than the zone allows", () => {
    const { port } = fixedWidth();
    const result = buildPreviewRenderPlan(
      frameWithText([textZoneInput({ value: "A".repeat(100), maxLines: 2, boxWidthPercent: 50 })]),
      { measureText: port },
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    // never truncated, never ellipsised, never a partial plan
    expect(result.code).toBe("INVALID_TEXT");
  });

  it("REJECTS a value longer than maxChars", () => {
    const { port } = fixedWidth();
    const result = buildPreviewRenderPlan(
      frameWithText([textZoneInput({ value: "AB", maxChars: 1 })]),
      { measureText: port },
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.code).toBe("INVALID_TEXT");
  });

  it("REJECTS control characters but allows a newline", () => {
    const { port } = fixedWidth();
    const control = (code: number) => `A${String.fromCharCode(code)}B`;
    for (const value of [control(0), control(7), control(0x1f), control(0x7f)]) {
      const result = buildPreviewRenderPlan(frameWithText([textZoneInput({ value })]), {
        measureText: port,
      });
      expect(result.ok, JSON.stringify(value)).toBe(false);
    }
    expect(
      buildPreviewRenderPlan(frameWithText([textZoneInput({ value: "A\\nB" })]), {
        measureText: port,
      }).ok,
    ).toBe(true);
  });

  it("fails CLOSED when the measurement port throws or returns an unusable width", () => {
    const ports = [
      () => {
        throw new Error("hostile");
      },
      () => Number.NaN,
      () => Number.POSITIVE_INFINITY,
      () => -1,
    ];
    for (const measureText of ports) {
      const result = buildPreviewRenderPlan(frameWithText([textZoneInput()]), { measureText });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.code).toBe("TEXT_MEASUREMENT_FAILED");
    }
  });

  it("fails CLOSED when no measurement port is supplied at all", () => {
    const result = buildPreviewRenderPlan(frameWithText([textZoneInput()]));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.code).toBe("TEXT_MEASUREMENT_FAILED");
  });

  it("needs no port when every zone is empty", () => {
    const result = buildPreviewRenderPlan(frameWithText([textZoneInput({ value: "" })]));
    expect(result.ok).toBe(true);
  });

  it("REJECTS an out-of-range zone style", () => {
    const { port } = fixedWidth();
    const bad: Record<string, unknown>[] = [
      { xPercent: -1 },
      { yPercent: 101 },
      { boxWidthPercent: 0 },
      { fontSizePercent: 0 },
      { align: "justify" },
      { fontFamily: "" },
      { fontFamily: 'a"b' },
      { bold: "no" },
      { color: "#fff" },
      { lineHeight: 0 },
      { letterSpacingPercent: 101 },
      { rotationDegrees: 361 },
      { maxChars: 0 },
      { maxLines: 6 },
      { value: 5 },
    ];
    for (const over of bad) {
      const result = buildPreviewRenderPlan(frameWithText([textZoneInput(over)]), {
        measureText: port,
      });
      expect(result.ok, JSON.stringify(over)).toBe(false);
    }
  });

  it("keeps arbitrary rotation for text (unrelated to the photo quarter turns)", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(frameWithText([textZoneInput({ rotationDegrees: -12.5 })]), {
        measureText: port,
      }),
    );
    expect(textOf(p).rotationDegrees).toBe(-12.5);
    // and the photo command keeps ITS own contract untouched
    const image = cmd(p, "frame:user-image");
    expect(Object.hasOwn(image, "rotationQuarterTurns")).toBe(false);
  });

  it("emits one command per non-empty zone, positionally identified", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(
        frameWithText([
          textZoneInput({ value: "A" }),
          textZoneInput({ value: "" }),
          textZoneInput({ value: "B" }),
        ]),
        { measureText: port },
      ),
    );
    const ids = p.commands.filter((c) => c.type === "draw-text").map((c) => c.layerId);
    // the empty zone emits nothing, and the id is positional — the zone KEY never reaches a command
    expect(ids).toEqual(["frame:text:0", "frame:text:2"]);
    for (const id of ids) {
      expect(id).not.toContain("main");
    }
  });

  it("carries no raw customer string beyond the wrapped lines", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan(frameWithText([textZoneInput({ value: "SECRETMARKER" })]), {
        measureText: port,
      }),
    );
    const command = textOf(p);
    // the lines ARE the text, but nothing else in the command echoes the input
    expect(JSON.stringify({ ...command, lines: [] })).not.toContain("SECRETMARKER");
    expect(Object.hasOwn(command, "maxChars")).toBe(false);
    expect(Object.hasOwn(command, "value")).toBe(false);
  });

  it("a text-free frame plan is unchanged", () => {
    const withoutField = plan(buildPreviewRenderPlan(FRAME_BASE));
    const withEmptyList = plan(buildPreviewRenderPlan({ ...FRAME_BASE, textZones: [] }));
    expect(withEmptyList).toEqual(withoutField);
    expect(withoutField.commands.some((c) => c.type === "draw-text")).toBe(false);
  });

  it("reads each zone field exactly once", () => {
    const { port } = fixedWidth();
    let reads = 0;
    const drifting = {
      ...textZoneInput(),
      get color() {
        reads += 1;
        return reads === 1 ? "#123456" : "#ABCDEF";
      },
    };
    const p = plan(buildPreviewRenderPlan(frameWithText([drifting]), { measureText: port }));
    expect(reads).toBe(1);
    expect(textOf(p).color).toBe("#123456");
  });

  it("a case plan never carries text (case text is out of scope, Founder F-1)", () => {
    const { port } = fixedWidth();
    const p = plan(
      buildPreviewRenderPlan({ ...CASE_BASE, textZones: [textZoneInput()] } as never, {
        measureText: port,
      }),
    );
    expect(p.commands.some((c) => c.type === "draw-text")).toBe(false);
  });
});
