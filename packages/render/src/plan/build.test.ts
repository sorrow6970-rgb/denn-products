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
  frameRect: { x: 0, y: 0, width: 300, height: 400 },
  imageZone: { x: 10, y: 10, width: 280, height: 380 },
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

  it("commands contain no URL/base64/token/storagePath (only the synthetic imageRef)", () => {
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
    expect(img.clipRect).toEqual({ x: 10, y: 10, width: 280, height: 380 });
    // image 200x100 into 280x380 → baseScale=max(280/200,380/100)=3.8 → draw 760x380
    expect(img.drawRect.width).toBeCloseTo(760, 6);
    expect(img.drawRect.height).toBeCloseTo(380, 6);
  });

  it("body fills frameRect, mat fills imageZone", () => {
    const p = plan(buildPreviewRenderPlan(FRAME_BASE));
    expect(cmd(p, "frame:body")).toEqual({
      type: "fill-rect",
      layerId: "frame:body",
      rect: { x: 0, y: 0, width: 300, height: 400 },
      color: "#9F887A",
    });
    expect((cmd(p, "frame:mat") as { rect: unknown }).rect).toEqual({
      x: 10,
      y: 10,
      width: 280,
      height: 380,
    });
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
    ["bad frame color", { ...FRAME_BASE, frameColor: "red" }, "INVALID_COLOR"],
    ["bad transform", { ...FRAME_BASE, transform: { scale: -1, x: 0, y: 0 } }, "INVALID_TRANSFORM"],
  ])("frame %s → %s", (_label, input, code) => {
    expect(buildPreviewRenderPlan(input as FramePlanInput)).toEqual({ ok: false, code });
  });

  it("does not leak an input id/URL/token marker into the serialized error", () => {
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
