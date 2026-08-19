import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it, vi } from "vitest";
import type { TextMeasurePort } from "../canvas/productPlan";
import {
  composeSpaceFramePlan,
  type SourceBoundProofResolver,
  type SourceBoundTemplateArtResolver,
} from "./frame-plan";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ffixture.png?alt=media";

const zone = {
  key: "main",
  x: 50,
  y: 50,
  boxW: 80,
  fontSize: 8,
  align: "center",
  font: "Arial",
  bold: false,
  italic: false,
  color: "#112233",
  lineH: 1.2,
  letterSpacing: 0,
  rotation: 0,
};

const catalog = (template: Record<string, unknown> = {}): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameThickness: 5,
      frameTemplates: [
        {
          id: "tpl",
          name: "합성 템플릿",
          type: "uploaded",
          targetSizeIds: ["size"],
          clockEnabled: false,
          ...template,
        },
      ],
      frameSizes: [{ id: "size", name: "합성 크기", aspect: 1.4 }],
      frameColors: [{ id: "black", name: "검정", fill: "#1a1a1a" }],
    },
  }) as CatalogDocumentV1;

const scene = (design: Record<string, unknown> = {}) => ({
  schema: "space-scene-v1",
  design: {
    tplId: "tpl",
    sizeId: "size",
    colorId: "black",
    texts: { main: "", name: "", name2: "", date: "", sub: "" },
    photoUrl: PROOF,
    imgT: { scale: 1, x: 0, y: 0, rot: 0 },
    clockOn: false,
    ...design,
  },
  room: {
    bgId: null,
    guideIndex: null,
    pos: null,
    sunPos: null,
    controls: {},
    settings: null,
    common: null,
    gallery: [],
  },
});

const proof = (expected = PROOF): SourceBoundProofResolver => ({
  resolve: vi.fn((source: unknown) =>
    source === expected
      ? ({
          ok: true,
          imageRef: "space-proof-1",
          intrinsicSize: { width: 1200, height: 800 },
        } as const)
      : ({ ok: false } as const),
  ),
});

const compose = (overrides: Record<string, unknown> = {}) =>
  composeSpaceFramePlan({
    document: catalog(),
    scene: scene(),
    logicalWidth: 400,
    proof: proof(),
    ...overrides,
  });

describe("composeSpaceFramePlan", () => {
  it("composes a detached frame plan from exact validated inputs", () => {
    const result = compose();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framePlanReady).toBe(true);
    expect(result.replayComplete).toBe(false);
    expect(result.plan.logicalCanvas).toEqual({ width: 400, height: 560 });
    expect(result.plan.commands.map((command) => command.layerId)).toEqual([
      "frame:body",
      "frame:mat",
      "frame:user-image",
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("space-proof-1");
    for (const forbidden of [PROOF, '"tpl"', '"size"', '"black"']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("passes the exact scene source to the source-bound proof resolver", () => {
    const resolver = proof();
    expect(compose({ proof: resolver }).ok).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledOnce();
    expect(resolver.resolve).toHaveBeenCalledWith(PROOF);

    const stale = proof("https://example.invalid/other");
    expect(compose({ proof: stale })).toEqual({
      ok: false,
      code: "SPACE_VIEW_PROOF_NOT_READY",
    });
  });

  it("revalidates proof trust before the readiness resolver and makes zero resolver calls on failure", () => {
    const resolver = proof();
    expect(
      compose({
        scene: scene({ photoUrl: "https://example.invalid/proofs/fixture.png" }),
        proof: resolver,
      }),
    ).toEqual({ ok: false, code: "SPACE_VIEW_PROOF_NOT_READY" });
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid scene", { scene: { schema: "space-scene-v2" } }, "SPACE_VIEW_INVALID_INPUT"],
    ["unknown reference", { scene: scene({ tplId: "missing" }) }, "SPACE_VIEW_REFERENCE_INVALID"],
    [
      "non-neutral transform",
      { scene: scene({ imgT: { scale: 2, x: 0, y: 0 } }) },
      "SPACE_VIEW_TRANSFORM_UNSUPPORTED",
    ],
    ["clock on", { scene: scene({ clockOn: true }) }, "SPACE_VIEW_CLOCK_UNSUPPORTED"],
    ["clock omitted", { scene: scene({ clockOn: undefined }) }, "SPACE_VIEW_CLOCK_UNSUPPORTED"],
  ])("fails closed for %s", (_label, overrides, code) => {
    expect(compose(overrides)).toEqual({ ok: false, code });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "400"])(
    "rejects an invalid logical width without a default: %s",
    (logicalWidth) => {
      expect(compose({ logicalWidth })).toEqual({
        ok: false,
        code: "SPACE_VIEW_LAYOUT_INVALID",
      });
    },
  );

  it("requires and forwards measurement only when an authored zone has nonempty scene text", () => {
    const document = catalog({ textZones: [zone] });
    const withText = scene({
      texts: { main: "고객 문구", name: "", name2: "", date: "", sub: "" },
    });
    expect(compose({ document, scene: withText })).toEqual({
      ok: false,
      code: "SPACE_VIEW_TEXT_MEASURE_REQUIRED",
    });

    const measure = vi.fn(() => 20) as TextMeasurePort;
    const result = compose({ document, scene: withText, measureText: measure });
    expect(result.ok).toBe(true);
    expect(measure).toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain("고객 문구");

    const throwing = (() => {
      throw new Error("PRIVATE_MEASURE_ERROR");
    }) as TextMeasurePort;
    const failed = compose({ document, scene: withText, measureText: throwing });
    expect(failed).toEqual({ ok: false, code: "SPACE_VIEW_PLAN_FAILED" });
    expect(JSON.stringify(failed)).not.toContain("PRIVATE_MEASURE_ERROR");
  });

  it("allows no art, requires an exact source-bound ready art for stretch, and rejects stale art", () => {
    expect(compose().ok).toBe(true);
    const dataUrl = "data:image/png;base64,AA==";
    const document = catalog({ dataUrl, overlayScope: "inner", frameBaked: false });
    const art: SourceBoundTemplateArtResolver = {
      resolve: vi.fn((source) =>
        source.kind === "data-image" && source.src === dataUrl
          ? ({ ok: true, imageRef: "template-art-1" } as const)
          : ({ ok: false } as const),
      ),
    };
    const ready = compose({ document, templateArt: art });
    expect(ready.ok).toBe(true);
    expect(art.resolve).toHaveBeenCalledWith({ kind: "data-image", src: dataUrl });
    if (ready.ok) {
      expect(ready.plan.commands.map((command) => command.layerId)).toContain("frame:template-art");
      expect(JSON.stringify(ready)).not.toContain(dataUrl);
    }

    expect(compose({ document })).toEqual({
      ok: false,
      code: "SPACE_VIEW_TEMPLATE_ART_NOT_READY",
    });
    expect(compose({ document, templateArt: { resolve: () => ({ ok: false }) } })).toEqual({
      ok: false,
      code: "SPACE_VIEW_TEMPLATE_ART_NOT_READY",
    });
  });

  it("rejects unsupported legacy-builder art instead of drawing a partial frame", () => {
    const document = catalog({ dataUrl: "data:image/png;base64,AA==", builtBy: "builder" });
    expect(compose({ document })).toEqual({
      ok: false,
      code: "SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED",
    });
  });

  it("contains hostile resolvers and unusable ready snapshots without leaking details", () => {
    for (const resolver of [
      {
        resolve: () => ({
          ok: true,
          imageRef: "https://private",
          intrinsicSize: { width: 1, height: 1 },
        }),
      },
      {
        resolve: () => ({
          ok: true,
          imageRef: "space-proof-1",
          intrinsicSize: { width: 0, height: 1 },
        }),
      },
      {
        resolve: () => {
          throw new Error("PRIVATE_RESOLVER_ERROR");
        },
      },
    ]) {
      const result = compose({ proof: resolver });
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain("PRIVATE");
    }
  });
});
