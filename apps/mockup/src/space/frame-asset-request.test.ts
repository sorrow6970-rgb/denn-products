import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it, vi } from "vitest";
import { resolveSpaceFrameAssetRequests } from "./frame-asset-request";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ffixture.png?alt=media";
const ART =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/templates%2Ffixture.png?alt=media";

const catalog = (template: Record<string, unknown> = {}): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
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

describe("resolveSpaceFrameAssetRequests", () => {
  it("projects an exact proof and no template art without performing browser work", () => {
    const globals = {
      fetch: vi.spyOn(globalThis, "fetch"),
      timeout: vi.spyOn(globalThis, "setTimeout"),
    };
    const result = resolveSpaceFrameAssetRequests(catalog(), scene());
    expect(result).toEqual({
      ok: true,
      value: {
        proof: { kind: "firebase-proof-image", src: PROOF },
        templateArt: { status: "none" },
        replayComplete: false,
      },
    });
    expect(globals.fetch).not.toHaveBeenCalled();
    expect(globals.timeout).not.toHaveBeenCalled();
    globals.fetch.mockRestore();
    globals.timeout.mockRestore();
  });

  it("projects stretch art only after exact projection and public-image trust", () => {
    const result = resolveSpaceFrameAssetRequests(
      catalog({ dataUrl: ART, overlayScope: "inner", frameBaked: false }),
      scene(),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        proof: { kind: "firebase-proof-image", src: PROOF },
        templateArt: {
          status: "load",
          source: { kind: "firebase-download-image", src: ART },
        },
        replayComplete: false,
      },
    });
  });

  it.each([
    ["invalid catalog", { schemaVersion: 2 }, scene(), "SPACE_VIEW_INVALID_INPUT"],
    ["invalid scene", catalog(), { schema: "space-scene-v2" }, "SPACE_VIEW_INVALID_INPUT"],
    ["unknown template", catalog(), scene({ tplId: "missing" }), "SPACE_VIEW_REFERENCE_INVALID"],
    [
      "untrusted proof",
      catalog(),
      scene({ photoUrl: "https://example.invalid/proofs/fixture.png" }),
      "SPACE_VIEW_PROOF_INVALID",
    ],
  ])("fails closed for %s", (_label, document, value, code) => {
    const result = resolveSpaceFrameAssetRequests(document, value);
    expect(result).toEqual({ ok: false, code });
    expect(JSON.stringify(result)).not.toContain("example.invalid");
  });

  it("rejects unsupported builder art with no partial source output", () => {
    const result = resolveSpaceFrameAssetRequests(
      catalog({ dataUrl: ART, builtBy: "builder" }),
      scene(),
    );
    expect(result).toEqual({
      ok: false,
      code: "SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED",
    });
    expect(JSON.stringify(result)).not.toContain(PROOF);
    expect(JSON.stringify(result)).not.toContain(ART);
  });

  it.each([
    [
      "untrusted",
      { dataUrl: "https://example.invalid/art.png", overlayScope: "inner", frameBaked: false },
    ],
    ["malformed", { dataUrl: "not-an-image", overlayScope: "inner", frameBaked: false }],
  ])("rejects %s stretch art as a whole request", (_label, template) => {
    const result = resolveSpaceFrameAssetRequests(catalog(template), scene());
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(PROOF);
    expect(JSON.stringify(result)).not.toContain("example.invalid");
  });

  it("contains hostile input, emits safe codes only, and does not mutate inputs", () => {
    const document = catalog();
    const value = scene();
    const before = JSON.stringify({ document, value });
    const hostile = new Proxy(value, {
      get: () => {
        throw new Error("PRIVATE_HOSTILE_ERROR");
      },
    });
    const result = resolveSpaceFrameAssetRequests(document, hostile);
    expect(result).toEqual({ ok: false, code: "SPACE_VIEW_INVALID_INPUT" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_HOSTILE_ERROR");
    expect(JSON.stringify({ document, value })).toBe(before);
  });

  it("snapshots catalog fields once so a drifting getter cannot change the loaded source", () => {
    let reads = 0;
    const template = {
      id: "tpl",
      name: "합성 템플릿",
      type: "uploaded",
      targetSizeIds: ["size"],
      clockEnabled: false,
      overlayScope: "inner",
      frameBaked: false,
      get dataUrl() {
        reads += 1;
        if (reads > 1) throw new Error("SECOND_READ_PRIVATE_VALUE");
        return ART;
      },
    };
    const document = catalog();
    document.data.frameTemplates = [template];

    const result = resolveSpaceFrameAssetRequests(document, scene());
    expect(result).toMatchObject({
      ok: true,
      value: {
        templateArt: {
          status: "load",
          source: { kind: "firebase-download-image", src: ART },
        },
      },
    });
    expect(reads).toBe(1);
    expect(JSON.stringify(result)).not.toContain("SECOND_READ_PRIVATE_VALUE");
  });
});
