// Synthetic catalog fixtures for spec 012 tests. NOT real operational data.
// Short made-up strings only — no real names / phone numbers / tokens / base64 photos.
// Function-value and circular fixtures are built by factories (can't be static literals).

/** DEF-grounded minimal legacy-v0 catalog (no schemaVersion). */
export const minimalLegacy: unknown = {
  brand: {
    name: "DENN PRODUCTS",
    sub: "시안 확인 시스템",
    kakaoUrl: "",
    acc: "#111",
    acc2: "#222",
  },
  models: [{ id: "m1", name: "Model One", w: 320, h: 620 }],
  caseCategories: [{ id: "all", name: "전체" }],
  caseTemplates: [],
  frameTemplates: [{ id: "full", name: "Full Photo", type: "builtin", dataUrl: null }],
  frameCategories: [{ id: "wedding", name: "웨딩" }],
  frameSizes: [{ id: "a4", name: "A4", sub: "21×29.7", aspect: 1.5, clock: null }],
  frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A", grain: false }],
  frameThickness: 5.5,
  clockSettings: { x: 88, y: 88, size: 12, customImg: null },
  customFonts: [],
  caseMockup: null,
  frameMockup: null,
  guideBackgrounds: [],
  watermark: { enabled: false, dataUrl: null, opacity: 30, position: "br" },
};

/** Legacy catalog missing several top-level collections (defaults expected). */
export const legacyMissingCollections: unknown = {
  brand: { name: "DENN PRODUCTS" },
  frameThickness: 5.5,
};

/** Image references: data-url, storage-path, dual, and none. */
export const legacyWithImages: unknown = {
  frameTemplates: [
    { id: "t-data", name: "d", type: "uploaded", dataUrl: "data:image/png;base64,QUJD" },
    { id: "t-path", name: "p", type: "uploaded", storagePath: "templates/t-path.png" },
    {
      id: "t-dual",
      name: "b",
      type: "uploaded",
      dataUrl: "data:image/png;base64,QUJD",
      storagePath: "templates/t-dual.png",
    },
    { id: "t-none", name: "n", type: "builtin", dataUrl: null },
  ],
  guideBackgrounds: [{ id: "g1", storagePath: "guides/g1.jpg" }],
};

/**
 * Post-migration form: dataUrl holds an HTTPS Firebase download URL (spec 018 §3). This must be a
 * valid dataUrl-family reference — NOT an INVALID_DATA_URL — and counted as a dataUrl reference.
 * A second template pairs the https dataUrl with a storagePath (dual). A third holds a non-URL,
 * non-data string that stays INVALID_DATA_URL.
 */
export const legacyHttpsDataUrl: unknown = {
  frameTemplates: [
    {
      id: "t-https",
      name: "h",
      type: "uploaded",
      dataUrl:
        "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/templates%2Fa.png?alt=media&token=x",
    },
    {
      id: "t-https-dual",
      name: "hd",
      type: "uploaded",
      dataUrl:
        "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/templates%2Fb.png?alt=media&token=y",
      storagePath: "templates/b.png",
    },
    { id: "t-bad", name: "b", type: "uploaded", dataUrl: "not-a-url-or-data" },
  ],
};

/** Flat roomBackgroundSettings + revision markers preserved. */
export const legacyWithRoomAndRevisions: unknown = {
  roomBackgroundSettings: {
    __denn_room_common_default__: { frameCenterX: 0.5, guideScale: 1 },
    "default-room": { frameCenterX: 0.4 },
  },
  __opRev: 12,
  __opRevAt: "rev-stamp",
  __cloudRev: 3,
  __publishedAt: "pub-stamp",
};

/** Unknown top-level keys, one flat and one holding a nested structure. */
export const legacyWithUnknown: unknown = {
  models: [{ id: "m1", name: "One" }],
  experimentalFlag: true,
  labConfig: { nested: { list: [1, 2, 3], note: "keep" } },
};

/** Unknown frameTemplate.type is preserved with a warning (not rejected). */
export const legacyUnknownTemplateType: unknown = {
  frameTemplates: [{ id: "t1", name: "weird", type: "hologram" }],
};

/** Nested unknown fields inside known objects/items (preserved + reported via extensions). */
export const legacyNestedUnknown: unknown = {
  brand: { name: "B", mystery: "keep" },
  frameSizes: [{ id: "s", name: "S", aspect: 1.2, weird: { a: 1 } }],
};

/** dataUrl/storagePath spread across the whole catalog (top-level object + nested array). */
export const legacyImagesEverywhere: unknown = {
  watermark: { enabled: true, dataUrl: "data:image/png;base64,QQ", opacity: 30, position: "br" },
  frameTemplates: [
    {
      id: "t",
      name: "t",
      type: "uploaded",
      editorOverlayImages: [{ storagePath: "editor-overlays/t/1.png" }],
    },
  ],
};

// ---- error fixtures -------------------------------------------------------

export const errUnsupportedVersion: unknown = { schemaVersion: 2, data: {} };
export const errMalformedV1: unknown = { schemaVersion: 1, migratedFrom: "legacy-v0", data: 5 };
export const errRootNotObject: unknown = 42;

export const errDuplicateId: unknown = {
  frameSizes: [
    { id: "dup", name: "A" },
    { id: "dup", name: "B" },
  ],
};

export const errCollectionNotArray: unknown = { models: { id: "x", name: "y" } };
export const errItemNotObject: unknown = { models: ["not-an-object"] };
export const errMissingId: unknown = { frameColors: [{ name: "no id" }] };
export const errEmptyId: unknown = { frameColors: [{ id: "", name: "empty id" }] };
export const errMissingName: unknown = { models: [{ id: "m1" }] };
export const errBadNumber: unknown = { frameThickness: -2 };
export const errBadAspect: unknown = { frameSizes: [{ id: "s", name: "s", aspect: 0 }] };
export const errUnsafeStoragePath: unknown = {
  frameTemplates: [{ id: "x", name: "x", type: "uploaded", storagePath: "javascript:alert(1)" }],
};
/** A storagePath that is a URL (any scheme) is rejected — not only dangerous schemes. */
export const errHttpStoragePath: unknown = {
  frameTemplates: [
    { id: "x", name: "x", type: "uploaded", storagePath: "https://example.com/x.png" },
  ],
};
/** Leading-whitespace must not smuggle a URL scheme past the storagePath guard. */
export const errWhitespaceHttpStoragePath: unknown = {
  frameTemplates: [
    { id: "x", name: "x", type: "uploaded", storagePath: " https://example.com/x.png" },
  ],
};
export const errTabJavascriptStoragePath: unknown = {
  frameTemplates: [{ id: "x", name: "x", type: "uploaded", storagePath: "\tjavascript:alert(1)" }],
};
/** storagePath directly on the ROOT object → error path must be "storagePath" (no leading dot). */
export const errRootStoragePath: unknown = { storagePath: "javascript:alert(1)" };
/** Non-finite number nested inside an unknown/extensions subtree. */
export const errNonFiniteUnknown: unknown = { labConfig: { bad: Number.NaN } };
/** Non-finite number in a known field. */
export const errInfinityField: unknown = { frameThickness: Number.POSITIVE_INFINITY };

/** Non-JSON value (a function) nested in an otherwise valid catalog. */
export function makeCatalogWithFunction(): unknown {
  return { brand: { name: "ok", handler: () => 1 } };
}

/** Circular reference (cannot be a static literal). */
export function makeCircularCatalog(): unknown {
  const node: Record<string, unknown> = { id: "c1", name: "cycle" };
  node.self = node;
  return { models: [node] };
}
