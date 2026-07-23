import { describe, expect, it } from "vitest";
import { type CatalogReadResult, isCatalogDocumentV1, readLegacyCatalog } from "../index";
import * as fx from "./fixtures";

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}
function ok(res: CatalogReadResult): Extract<CatalogReadResult, { ok: true }> {
  if (!res.ok) throw new Error(`expected ok, got: ${JSON.stringify(res.errors)}`);
  return res;
}
function fail(res: CatalogReadResult): Extract<CatalogReadResult, { ok: false }> {
  if (res.ok) throw new Error("expected failure, got ok");
  return res;
}
const codes = (res: Extract<CatalogReadResult, { ok: false }>): string[] =>
  res.errors.map((e) => e.code);

describe("readLegacyCatalog — success", () => {
  it("reads a minimal legacy-v0 catalog into a V1 document", () => {
    const res = ok(readLegacyCatalog(fx.minimalLegacy));
    expect(res.document.schemaVersion).toBe(1);
    expect(res.document.migratedFrom).toBe("legacy-v0");
    expect(res.report.sourceVersion).toBe("legacy-v0");
    expect(res.report.warnings).toEqual([]);
    expect(res.report.defaultsApplied).toEqual([]);
    expect(res.report.unknownPaths).toEqual([]);
    expect(res.report.counts.frameTemplates).toBe(1);
    expect(res.report.counts.models).toBe(1);
    expect(isCatalogDocumentV1(res.document)).toBe(true);
  });

  it("is deterministic: same input twice → identical document and report", () => {
    const a = readLegacyCatalog(fx.minimalLegacy);
    const b = readLegacyCatalog(fx.minimalLegacy);
    expect(a).toEqual(b);
  });

  it("does not mutate a deep-frozen input", () => {
    const snapshot = structuredClone(fx.minimalLegacy);
    deepFreeze(fx.minimalLegacy);
    ok(readLegacyCatalog(fx.minimalLegacy));
    expect(fx.minimalLegacy).toEqual(snapshot);
  });

  it("re-reading the produced V1 document is equivalent (no nested wrapper)", () => {
    const first = ok(readLegacyCatalog(fx.minimalLegacy));
    const again = ok(readLegacyCatalog(first.document));
    expect(again.report.sourceVersion).toBe("catalog-v1");
    expect(again.document).toEqual(first.document);
    // biome-ignore lint/suspicious/noExplicitAny: probing runtime absence of a nested wrapper
    expect((again.document.data as any).schemaVersion).toBeUndefined();
  });

  it("fills missing top-level collections with explicit empty defaults", () => {
    const res = ok(readLegacyCatalog(fx.legacyMissingCollections));
    for (const key of [
      "models",
      "caseCategories",
      "caseTemplates",
      "frameCategories",
      "frameTemplates",
      "frameSizes",
      "frameColors",
      "guideBackgrounds",
      "customFonts",
    ]) {
      expect(res.report.defaultsApplied).toContain(key);
      expect(res.report.counts[key]).toBe(0);
    }
    expect(res.document.data.models).toEqual([]);
  });

  it("preserves unknown top-level keys (flat and nested) and reports them", () => {
    const res = ok(readLegacyCatalog(fx.legacyWithUnknown));
    expect(res.report.unknownPaths).toEqual(["experimentalFlag", "labConfig"]);
    expect(res.report.warnings.map((w) => w.code)).toEqual(["UNKNOWN_FIELD", "UNKNOWN_FIELD"]);
    // biome-ignore lint/suspicious/noExplicitAny: reading preserved unknown data
    const data = res.document.data as any;
    expect(data.experimentalFlag).toBe(true);
    expect(data.labConfig).toEqual({ nested: { list: [1, 2, 3], note: "keep" } });
    expect(data.models[0].id).toBe("m1"); // array order kept
  });

  it("classifies dataUrl / storagePath / dual image references with counts", () => {
    const res = ok(readLegacyCatalog(fx.legacyWithImages));
    expect(res.report.imageReferences).toEqual({ dataUrl: 1, storagePath: 2, dual: 1 });
    // biome-ignore lint/suspicious/noExplicitAny: reading preserved raw refs
    const tpls = res.document.data.frameTemplates as any[];
    expect(tpls[2].dataUrl).toBe("data:image/png;base64,QUJD");
    expect(tpls[2].storagePath).toBe("templates/t-dual.png");
  });

  it("preserves flat roomBackgroundSettings and revision markers", () => {
    const res = ok(readLegacyCatalog(fx.legacyWithRoomAndRevisions));
    expect(res.document.data.roomBackgroundSettings).toEqual({
      __denn_room_common_default__: { frameCenterX: 0.5, guideScale: 1 },
      "default-room": { frameCenterX: 0.4 },
    });
    expect(res.document.data.__opRev).toBe(12);
    expect(res.document.data.__cloudRev).toBe(3);
    expect(res.document.data.__publishedAt).toBe("pub-stamp");
  });

  it("keeps an unknown frameTemplate.type with a warning (not rejected)", () => {
    const res = ok(readLegacyCatalog(fx.legacyUnknownTemplateType));
    expect(res.report.warnings).toEqual([
      { code: "UNKNOWN_FRAME_TEMPLATE_TYPE", path: "frameTemplates[0].type" },
    ]);
    // biome-ignore lint/suspicious/noExplicitAny: reading preserved value
    expect((res.document.data.frameTemplates as any)[0].type).toBe("hologram");
  });
});

describe("readLegacyCatalog — failures (no default-catalog success)", () => {
  const cases: Array<[string, unknown, string, string | undefined]> = [
    [
      "unsupported version",
      fx.errUnsupportedVersion,
      "UNSUPPORTED_SCHEMA_VERSION",
      "schemaVersion",
    ],
    ["malformed v1", fx.errMalformedV1, "MALFORMED_V1_DOCUMENT", ""],
    ["root not object", fx.errRootNotObject, "ROOT_NOT_OBJECT", ""],
    ["duplicate id", fx.errDuplicateId, "DUPLICATE_ID", "frameSizes[1].id"],
    ["collection not array", fx.errCollectionNotArray, "COLLECTION_NOT_ARRAY", "models"],
    ["item not object", fx.errItemNotObject, "ITEM_NOT_OBJECT", "models[0]"],
    ["missing id", fx.errMissingId, "MISSING_ID", "frameColors[0].id"],
    ["empty id", fx.errEmptyId, "INVALID_ID", "frameColors[0].id"],
    ["missing name", fx.errMissingName, "MISSING_NAME", "models[0].name"],
    ["bad thickness", fx.errBadNumber, "INVALID_NUMBER", "frameThickness"],
    ["bad aspect", fx.errBadAspect, "INVALID_NUMBER", "frameSizes[0].aspect"],
    [
      "unsafe storage path",
      fx.errUnsafeStoragePath,
      "UNSAFE_STORAGE_PATH",
      "frameTemplates[0].storagePath",
    ],
  ];

  for (const [label, input, code, path] of cases) {
    it(`rejects ${label} with ${code}`, () => {
      const res = fail(readLegacyCatalog(input));
      expect(codes(res)).toContain(code);
      if (path !== undefined) {
        expect(res.errors.some((e) => e.code === code && e.path === path)).toBe(true);
      }
    });
  }

  it("rejects a non-JSON function value with a path", () => {
    const res = fail(readLegacyCatalog(fx.makeCatalogWithFunction()));
    expect(codes(res)).toContain("NON_JSON_VALUE");
    expect(res.errors.some((e) => e.path === "brand.handler")).toBe(true);
  });

  it("rejects a circular reference", () => {
    const res = fail(readLegacyCatalog(fx.makeCircularCatalog()));
    expect(codes(res)).toContain("CIRCULAR_REFERENCE");
  });

  it("failure issues carry only code + path (no raw data / base64 / tokens)", () => {
    const res = fail(readLegacyCatalog(fx.errUnsafeStoragePath));
    for (const e of res.errors) {
      expect(Object.keys(e).sort()).toEqual(["code", "path"]);
      expect(e.path).not.toContain("alert(1)");
    }
  });
});
