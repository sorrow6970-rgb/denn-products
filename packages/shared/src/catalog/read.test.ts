import { describe, expect, it } from "vitest";
import { type CatalogReadResult, isCatalogDocumentV1, readLegacyCatalog } from "../index";
import * as fx from "./fixtures";

describe("isCatalogDocumentV1 (strengthened shallow guard)", () => {
  it("accepts exactly the three-key V1 wrapper", () => {
    expect(isCatalogDocumentV1({ schemaVersion: 1, migratedFrom: "legacy-v0", data: {} })).toBe(
      true,
    );
  });

  it("rejects extra keys, wrong fields, non-object data, other versions, and non-objects", () => {
    expect(
      isCatalogDocumentV1({ schemaVersion: 1, migratedFrom: "legacy-v0", data: {}, extra: 1 }),
    ).toBe(false);
    expect(isCatalogDocumentV1({ schemaVersion: 1, migratedFrom: "other", data: {} })).toBe(false);
    expect(isCatalogDocumentV1({ schemaVersion: 1, migratedFrom: "legacy-v0", data: 5 })).toBe(
      false,
    );
    expect(isCatalogDocumentV1({ schemaVersion: 2, migratedFrom: "legacy-v0", data: {} })).toBe(
      false,
    );
    expect(isCatalogDocumentV1(null)).toBe(false);
    expect(isCatalogDocumentV1({ schemaVersion: 1, data: {} })).toBe(false);
  });

  it("rejects a V1 whose data fails the deep contract (shared with readLegacyCatalog)", () => {
    const shape = (data: unknown) => ({ schemaVersion: 1, migratedFrom: "legacy-v0", data });
    // malformed collection
    expect(isCatalogDocumentV1(shape({ models: "invalid" }))).toBe(false);
    // non-finite nested value
    expect(isCatalogDocumentV1(shape({ labConfig: { bad: Number.NaN } }))).toBe(false);
    // unsafe storagePath
    expect(
      isCatalogDocumentV1(
        shape({ frameTemplates: [{ id: "x", name: "x", storagePath: "javascript:x" }] }),
      ),
    ).toBe(false);
    // a valid V1 still passes
    expect(isCatalogDocumentV1(shape({ models: [{ id: "m", name: "M" }] }))).toBe(true);
  });
});

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

  it("reports and preserves NESTED unknown fields via the explicit extensions contract", () => {
    const res = ok(readLegacyCatalog(fx.legacyNestedUnknown));
    expect(res.report.unknownPaths).toContain("brand.mystery");
    expect(res.report.unknownPaths).toContain("frameSizes[0].weird");
    expect(res.report.extensions["brand.mystery"]).toBe("keep");
    expect(res.report.extensions["frameSizes[0].weird"]).toEqual({ a: 1 });
    expect(res.report.warnings.every((w) => w.code === "UNKNOWN_FIELD")).toBe(true);
    // biome-ignore lint/suspicious/noExplicitAny: reading preserved nested data
    const data = res.document.data as any;
    expect(data.brand.mystery).toBe("keep");
    expect(data.frameSizes[0].weird).toEqual({ a: 1 });
  });

  it("aggregates dataUrl/storagePath across the whole catalog (watermark + nested overlays)", () => {
    const res = ok(readLegacyCatalog(fx.legacyImagesEverywhere));
    expect(res.report.imageReferences).toEqual({ dataUrl: 1, storagePath: 1, dual: 0 });
  });

  it("accepts an HTTPS download URL in dataUrl as a dataUrl reference (no INVALID_DATA_URL)", () => {
    const res = ok(readLegacyCatalog(fx.legacyHttpsDataUrl));
    // t-https = dataUrl(https), t-https-dual = dataUrl(https)+storagePath, t-bad = invalid string.
    expect(res.report.imageReferences).toEqual({ dataUrl: 1, storagePath: 0, dual: 1 });
    const invalid = res.report.warnings.filter((w) => w.code === "INVALID_DATA_URL");
    expect(invalid).toEqual([{ code: "INVALID_DATA_URL", path: "frameTemplates[2].dataUrl" }]);
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
    ["half print size", fx.errHalfPrintSize, "INVALID_NUMBER", "frameSizes[0].printHeightCm"],
    [
      "print size above the cm ceiling",
      fx.errPrintSizeTooLarge,
      "INVALID_NUMBER",
      "frameSizes[0].printHeightCm",
    ],
    [
      "unsafe storage path (javascript:)",
      fx.errUnsafeStoragePath,
      "UNSAFE_STORAGE_PATH",
      "frameTemplates[0].storagePath",
    ],
    [
      "storage path with any URL scheme (https:)",
      fx.errHttpStoragePath,
      "UNSAFE_STORAGE_PATH",
      "frameTemplates[0].storagePath",
    ],
    [
      "non-finite inside unknown/extensions",
      fx.errNonFiniteUnknown,
      "NON_FINITE_NUMBER",
      "labConfig.bad",
    ],
    ["non-finite in a known field", fx.errInfinityField, "NON_FINITE_NUMBER", "frameThickness"],
    [
      "leading-space URL storage path",
      fx.errWhitespaceHttpStoragePath,
      "UNSAFE_STORAGE_PATH",
      "frameTemplates[0].storagePath",
    ],
    [
      "leading-tab javascript storage path",
      fx.errTabJavascriptStoragePath,
      "UNSAFE_STORAGE_PATH",
      "frameTemplates[0].storagePath",
    ],
    [
      "root storage path (no leading dot)",
      fx.errRootStoragePath,
      "UNSAFE_STORAGE_PATH",
      "storagePath",
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

// --- spec 032: physical print size (cm) -------------------------------------

describe("frameSizes physical print size (spec 032)", () => {
  const size = (over: Record<string, unknown>) => ({
    frameSizes: [{ id: "s", name: "s", aspect: 1.41, ...over }],
  });

  it("accepts a fully declared in-range pair with no warning", () => {
    const res = readLegacyCatalog(fx.okPrintSize);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // the two cm fields are KNOWN keys, so they must not be reported as unknown
    expect(res.report.warnings.filter((w) => w.path?.includes("printWidthCm"))).toEqual([]);
    expect(res.report.warnings.filter((w) => w.path?.includes("printHeightCm"))).toEqual([]);
  });

  it("still accepts an existing catalog that declares neither field", () => {
    expect(readLegacyCatalog(size({})).ok).toBe(true);
  });

  it("accepts the range boundaries", () => {
    expect(readLegacyCatalog(size({ printWidthCm: 500, printHeightCm: 500 })).ok).toBe(true);
    expect(readLegacyCatalog(size({ printWidthCm: 0.01, printHeightCm: 0.01 })).ok).toBe(true);
  });

  it("REJECTS an unusable value instead of clamping it", () => {
    for (const value of [0, -1, 500.5, 1000, "21", null, true, {}]) {
      const res = readLegacyCatalog(size({ printWidthCm: value, printHeightCm: 29.7 }));
      expect(res.ok, JSON.stringify(String(value))).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.path === "frameSizes[0].printWidthCm")).toBe(true);
      }
    }
  });

  it("REJECTS whichever side is missing, and reports THAT side", () => {
    const noHeight = readLegacyCatalog(size({ printWidthCm: 21 }));
    expect(noHeight.ok).toBe(false);
    if (!noHeight.ok) {
      expect(noHeight.errors.some((e) => e.path === "frameSizes[0].printHeightCm")).toBe(true);
    }
    const noWidth = readLegacyCatalog(size({ printHeightCm: 29.7 }));
    expect(noWidth.ok).toBe(false);
    if (!noWidth.ok) {
      expect(noWidth.errors.some((e) => e.path === "frameSizes[0].printWidthCm")).toBe(true);
    }
  });

  it("never lets a name, sub or aspect stand in for the declared centimetres", () => {
    // a size that only ADVERTISES centimetres in its text stays valid and simply has no cm fields
    const res = readLegacyCatalog({
      frameSizes: [
        { id: "s", name: "A4 21x29.7cm", sub: "21x29.7cm", aspect: 1.41, w: 21, h: 29.7 },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("failure issues carry only code + path (no raw centimetres)", () => {
    const res = readLegacyCatalog(size({ printWidthCm: 9999, printHeightCm: 29.7 }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    for (const e of res.errors) {
      expect(Object.keys(e).sort()).toEqual(["code", "path"]);
      expect(e.path).not.toContain("9999");
    }
  });
});
