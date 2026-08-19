import type { CatalogDocumentV1 } from "@denn/shared";
import type { SpaceSceneV1 } from "@denn/spaces";
import { describe, expect, it } from "vitest";
import { resolveSpaceSceneReferences } from "./scene-reference";

const catalog = (overrides: Record<string, unknown> = {}): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameTemplates: [{ id: "tpl", name: "액자", type: "uploaded", targetSizeIds: ["size"] }],
      frameSizes: [{ id: "size", name: "A4", sub: "21×29.7" }],
      frameColors: [{ id: "black", name: "블랙", fill: "#1a1a1a" }],
      ...overrides,
    },
  }) as CatalogDocumentV1;

const scene = (design: Record<string, unknown> = {}): SpaceSceneV1 =>
  ({
    schema: "space-scene-v1",
    design: {
      tplId: "tpl",
      sizeId: "size",
      colorId: "black",
      texts: { main: "비밀", name: "", name2: "", date: "", sub: "" },
      photoUrl: "https://example.invalid/proofs%2Fsecret.png?token=SECRET_TOKEN",
      imgT: { scale: 0.5, x: 400, y: -200, rot: 37 },
      ...design,
    },
    room: {
      bgId: "private-room",
      guideIndex: 1,
      pos: { x: 2, y: 3 },
      sunPos: null,
      controls: { secret: "opaque" },
      settings: null,
      common: null,
      gallery: [],
    },
  }) as SpaceSceneV1;

describe("resolveSpaceSceneReferences", () => {
  it("returns a detached, incomplete frame support snapshot without raw private values", () => {
    const result = resolveSpaceSceneReferences(catalog(), scene());
    expect(result).toEqual({
      ok: true,
      value: {
        kind: "frame",
        templateSourceIndex: 0,
        sizeSourceIndex: 0,
        color: { fill: "#1A1A1A" },
        photo: { status: "requires-proof-resolution" },
        transform: { status: "validated-unapplied" },
        room: { status: "unsupported" },
        replayComplete: false,
      },
    });
    const serialized = JSON.stringify(result);
    for (const secret of [
      '"tpl"',
      '"size"',
      '"black"',
      "SECRET_TOKEN",
      "비밀",
      "private-room",
      "opaque",
      '"x":400',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("accepts an exact legacy fill and canonicalizes only the selected solid color", () => {
    expect(resolveSpaceSceneReferences(catalog(), scene({ colorId: "#1a1a1a" }))).toMatchObject({
      ok: true,
      value: { color: { fill: "#1A1A1A" } },
    });
  });

  it.each([
    ["template", { tplId: null }],
    ["size", { sizeId: null }],
    ["color", { colorId: null }],
    ["photo", { photoUrl: undefined }],
  ])("rejects a missing %s without fallback", (_label, design) => {
    expect(resolveSpaceSceneReferences(catalog(), scene(design))).toEqual({
      ok: false,
      code: "SCENE_REFERENCE_MISSING",
    });
  });

  it.each([
    ["unknown template", catalog(), scene({ tplId: "absent" }), "SCENE_REFERENCE_UNKNOWN_TEMPLATE"],
    [
      "hidden size",
      catalog({ frameSizes: [{ id: "size", name: "A4", hideInMockup: true }] }),
      scene(),
      "SCENE_REFERENCE_UNKNOWN_SIZE",
    ],
    ["unknown size", catalog(), scene({ sizeId: "absent" }), "SCENE_REFERENCE_UNKNOWN_SIZE"],
    ["unknown color", catalog(), scene({ colorId: "absent" }), "SCENE_REFERENCE_UNKNOWN_COLOR"],
  ])("fails closed for %s", (_label, doc, value, code) => {
    expect(resolveSpaceSceneReferences(doc, value)).toEqual({ ok: false, code });
  });

  it("rejects unsupported and incompatible templates", () => {
    expect(
      resolveSpaceSceneReferences(
        catalog({ frameTemplates: [{ id: "tpl", name: "액자", type: "future" }] }),
        scene(),
      ),
    ).toEqual({ ok: false, code: "SCENE_REFERENCE_UNSUPPORTED_TEMPLATE" });
    expect(
      resolveSpaceSceneReferences(
        catalog({
          frameTemplates: [{ id: "tpl", name: "액자", type: "uploaded", targetSizeIds: ["other"] }],
        }),
        scene(),
      ),
    ).toEqual({ ok: false, code: "SCENE_REFERENCE_INCOMPATIBLE_SIZE" });
  });

  it("uses current normalized size compatibility without auto-selecting another size", () => {
    const doc = catalog({
      frameTemplates: [{ id: "tpl", name: "액자", type: "uploaded", frameSize: "  A4  " }],
      frameSizes: [{ id: "size", name: "a4", sub: "21×29.7" }],
    });
    expect(resolveSpaceSceneReferences(doc, scene()).ok).toBe(true);
  });

  it("rejects grain, malformed fill, and ambiguous ID/fill matches", () => {
    for (const frameColors of [
      [{ id: "black", name: "원목", fill: "#1A1A1A", grain: true }],
      [{ id: "black", name: "이상", fill: "black" }],
      [
        { id: "black", name: "첫째", fill: "#1A1A1A" },
        { id: "other", name: "둘째", fill: "black" },
      ],
    ]) {
      const result = resolveSpaceSceneReferences(catalog({ frameColors }), scene());
      expect(result.ok).toBe(false);
    }
    expect(
      resolveSpaceSceneReferences(
        catalog({
          frameColors: [
            { id: "a", name: "A", fill: "#1A1A1A" },
            { id: "b", name: "B", fill: "#1A1A1A" },
          ],
        }),
        scene({ colorId: "#1A1A1A" }),
      ),
    ).toEqual({ ok: false, code: "SCENE_REFERENCE_AMBIGUOUS_COLOR" });
  });

  it.each([
    "",
    " https://example.invalid/a.png",
    "http://example.invalid/a.png",
    "https://user:pass@example.invalid/a.png",
    "not-a-url",
  ])("rejects an invalid photo candidate without returning it: %s", (photoUrl) => {
    const result = resolveSpaceSceneReferences(catalog(), scene({ photoUrl }));
    expect(result).toEqual({ ok: false, code: "SCENE_REFERENCE_INVALID_PHOTO" });
    if (photoUrl !== "") expect(JSON.stringify(result)).not.toContain(photoUrl);
  });

  it("runtime-validates both inputs and catches hostile access without mutation", () => {
    const sourceCatalog = catalog();
    const sourceScene = scene();
    const before = JSON.stringify({ sourceCatalog, sourceScene });
    expect(resolveSpaceSceneReferences({ schemaVersion: 2 } as never, sourceScene)).toEqual({
      ok: false,
      code: "SCENE_REFERENCE_INVALID_INPUT",
    });
    const hostile = new Proxy(sourceScene, {
      get: () => {
        throw new Error("PRIVATE_ERROR");
      },
    });
    const result = resolveSpaceSceneReferences(sourceCatalog, hostile);
    expect(result).toEqual({ ok: false, code: "SCENE_REFERENCE_INVALID_INPUT" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_ERROR");
    expect(JSON.stringify({ sourceCatalog, sourceScene })).toBe(before);
  });
});
