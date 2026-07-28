// Unit contract for the catalog preview geometry projection (spec 023 §8). Synthetic fixtures only —
// no real product names/ids/images, no URL/base64/token/storagePath, no network. Real published
// catalog variants and real Canvas previews are NOT covered here (NOT VERIFIED / later specs).

import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import {
  type CasePreviewSelection,
  type FramePreviewSelection,
  projectCasePreviewGeometry,
  projectFramePreviewGeometry,
} from "./index";

const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

const caseSel = (over: Partial<CasePreviewSelection> = {}): CasePreviewSelection => ({
  modelId: "m1",
  templateId: "t1",
  ...over,
});
const frameSel = (over: Partial<FramePreviewSelection> = {}): FramePreviewSelection => ({
  frameSizeId: "s1",
  templateId: "ft1",
  ...over,
});

const MODEL = { id: "m1", name: "모델", w: 320, h: 620 };
const RECT_ZONE = { x: 5, y: 10, w: 40, h: 30 };
const RECT_ZONE_2 = { x: 50, y: 10, w: 40, h: 30, type: "rect" };

const caseDoc = (template: Record<string, unknown>, model: unknown = MODEL) =>
  doc({ models: [model], caseTemplates: [template] });

const frameDoc = (
  size: Record<string, unknown>,
  template: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) => doc({ frameSizes: [size], frameTemplates: [template], ...extra });

const SIZE = { id: "s1", name: "사이즈", aspect: 1.4 };
const UPLOADED_FULL = { id: "ft1", name: "템플릿", type: "uploaded" };

/** Deep-freeze so any mutation of the input would throw in a module (strict mode). */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

// --- case: happy paths -----------------------------------------------------

describe("projectCasePreviewGeometry — supported geometry", () => {
  it("projects the model logical size and rectangular photoZones in source order", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE, RECT_ZONE_2] }),
      caseSel(),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        modelLogicalSize: { width: 320, height: 620 },
        zones: [
          {
            id: "case-zone-0",
            sourceIndex: 0,
            percentRect: { x: 5, y: 10, width: 40, height: 30 },
          },
          {
            id: "case-zone-1",
            sourceIndex: 1,
            percentRect: { x: 50, y: 10, width: 40, height: 30 },
          },
        ],
      },
      diagnostics: [],
    });
  });

  it("uses the legacy `zones` alias with a diagnostic", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", zones: [RECT_ZONE] }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.zones.map((z) => z.id)).toEqual(["case-zone-0"]);
    expect(result.diagnostics).toEqual([
      { code: "LEGACY_ZONES_ALIAS", collection: "caseTemplates" },
    ]);
  });

  it("falls back to a single photoSlot with a diagnostic", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoSlot: { x: 5, y: 5, w: 90, h: 90 } }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.zones).toEqual([
      { id: "case-zone-0", sourceIndex: 0, percentRect: { x: 5, y: 5, width: 90, height: 90 } },
    ]);
    expect(result.diagnostics).toEqual([
      { code: "PHOTO_SLOT_FALLBACK", collection: "caseTemplates" },
    ]);
  });

  it("prefers photoZones over the alias and the slot", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({
        id: "t1",
        name: "케이스",
        photoZones: [RECT_ZONE],
        zones: [RECT_ZONE_2],
        photoSlot: { x: 0, y: 0, w: 100, h: 100 },
      }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.zones[0].percentRect).toEqual({ x: 5, y: 10, width: 40, height: 30 });
    expect(result.diagnostics).toEqual([]);
  });

  it("accepts the exact 0..100 boundary and non-integer percents", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [{ x: 0, y: 0, w: 100, h: 100 }] }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
    const fractional = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [{ x: 0.5, y: 12.25, w: 33.5, h: 10.125 }] }),
      caseSel(),
    );
    expect(fractional.ok).toBe(true);
    if (!fractional.ok) return;
    expect(fractional.value.zones[0].percentRect).toEqual({
      x: 0.5,
      y: 12.25,
      width: 33.5,
      height: 10.125,
    });
  });
});

// --- case: rejections ------------------------------------------------------

describe("projectCasePreviewGeometry — explicit failures", () => {
  it.each([
    ["missing w/h", { id: "m1", name: "모델" }],
    ["zero", { id: "m1", name: "모델", w: 0, h: 620 }],
    ["negative", { id: "m1", name: "모델", w: 320, h: -1 }],
    ["NaN", { id: "m1", name: "모델", w: Number.NaN, h: 620 }],
    ["Infinity", { id: "m1", name: "모델", w: Number.POSITIVE_INFINITY, h: 620 }],
    ["numeric string", { id: "m1", name: "모델", w: "320", h: "620" }],
  ])("rejects a model size that is not a finite positive number (%s)", (_label, model) => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }, model),
      caseSel(),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_GEOMETRY", diagnostics: [] });
  });

  it.each([
    ["circle type", { ...RECT_ZONE, type: "circle" }],
    ["positive cornerR", { ...RECT_ZONE, cornerR: 12 }],
    ["unknown type", { ...RECT_ZONE, type: "hexagon" }],
  ])("refuses to approximate an unsupported zone shape (%s)", (_label, zone) => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [zone] }),
      caseSel(),
    );
    expect(result).toEqual({ ok: false, code: "UNSUPPORTED_ZONE_SHAPE", diagnostics: [] });
  });

  it("treats cornerR 0 / absent shape fields as rectangular", () => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [{ ...RECT_ZONE, cornerR: 0 }] }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    ["NaN x", { ...RECT_ZONE, x: Number.NaN }],
    ["Infinity y", { ...RECT_ZONE, y: Number.POSITIVE_INFINITY }],
    ["zero width", { ...RECT_ZONE, w: 0 }],
    ["negative height", { ...RECT_ZONE, h: -5 }],
    ["negative origin", { ...RECT_ZONE, x: -1 }],
    ["overflows right", { x: 80, y: 0, w: 30, h: 10 }],
    ["overflows bottom", { x: 0, y: 80, w: 10, h: 30 }],
    ["string percent", { x: "5", y: 10, w: 40, h: 30 }],
    ["not an object", 42],
  ])("rejects invalid zone geometry (%s)", (_label, zone) => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [zone] }),
      caseSel(),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_GEOMETRY", diagnostics: [] });
  });

  it.each([
    ["empty photoZones", { id: "t1", name: "케이스", photoZones: [] }],
    ["empty zones alias", { id: "t1", name: "케이스", zones: [] }],
    ["no zone source at all", { id: "t1", name: "케이스" }],
    ["photoSlot without fields", { id: "t1", name: "케이스", photoSlot: {} }],
  ])("fails instead of inventing a default zone (%s)", (_label, template) => {
    const result = projectCasePreviewGeometry(caseDoc(template), caseSel());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_GEOMETRY");
  });
});

// --- lookup ---------------------------------------------------------------

describe("preview projection — lookup", () => {
  it("fails when the id is not found", () => {
    expect(
      projectCasePreviewGeometry(
        caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }),
        caseSel({ templateId: "missing" }),
      ),
    ).toEqual({ ok: false, code: "ITEM_NOT_FOUND", diagnostics: [] });
  });

  it("fails on duplicate ids instead of picking the first", () => {
    const result = projectCasePreviewGeometry(
      doc({
        models: [MODEL],
        caseTemplates: [
          { id: "t1", name: "A", photoZones: [RECT_ZONE] },
          { id: "t1", name: "B", photoZones: [RECT_ZONE] },
        ],
      }),
      caseSel(),
    );
    expect(result).toEqual({ ok: false, code: "AMBIGUOUS_ITEM", diagnostics: [] });
  });

  it("fails when the collection is not an array", () => {
    expect(
      projectCasePreviewGeometry(doc({ models: MODEL, caseTemplates: [] }), caseSel()),
    ).toEqual({ ok: false, code: "INVALID_COLLECTION", diagnostics: [] });
  });

  it("fails when the matched item is not a plain object", () => {
    const result = projectCasePreviewGeometry(
      doc({ models: [MODEL], caseTemplates: [Object.assign([], { id: "t1" })] }),
      caseSel(),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_ITEM", diagnostics: [] });
  });

  it("matches ids exactly and never trims into a different item", () => {
    const document = doc({
      models: [MODEL],
      caseTemplates: [{ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }],
    });
    expect(projectCasePreviewGeometry(document, caseSel({ templateId: " t1 " })).ok).toBe(false);
    expect(projectCasePreviewGeometry(document, caseSel({ templateId: "t1" })).ok).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["tab/newline", "\t\n"],
  ])("rejects a blank selection id (%s)", (_label, id) => {
    expect(
      projectCasePreviewGeometry(
        caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }),
        caseSel({ templateId: id }),
      ),
    ).toEqual({ ok: false, code: "INVALID_INPUT", diagnostics: [] });
  });

  it("skips primitive/nullish collection entries without throwing", () => {
    const result = projectCasePreviewGeometry(
      doc({
        models: [null, 7, "x", MODEL],
        caseTemplates: [undefined, { id: "t1", name: "케이스", photoZones: [RECT_ZONE] }],
      }),
      caseSel(),
    );
    expect(result.ok).toBe(true);
  });
});

// --- frame ---------------------------------------------------------------

describe("projectFramePreviewGeometry — supported geometry", () => {
  it("projects aspect, size-level thickness and the white mat default", () => {
    const result = projectFramePreviewGeometry(
      frameDoc({ ...SIZE, frameThickness: 4 }, UPLOADED_FULL, { frameThickness: 5.5 }),
      frameSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      aspect: 1.4,
      borderPercentOfWidth: 4,
      matColor: "#FFFFFF",
      // uploaded template with no design source -> the legacy id-dispatch inset (spec 025)
      contentInsetPx: 8,
    });
    expect(result.diagnostics).toEqual([
      { code: "ALPHA_OUTLINE_OMITTED", collection: "frameTemplates", sourceIndex: 0 },
    ]);
  });

  it("falls back to the top-level thickness when the size has none", () => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, UPLOADED_FULL, { frameThickness: 5.5 }),
      frameSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.borderPercentOfWidth).toBe(5.5);
  });

  it("supports the builtin single-rectangle template", () => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, { id: "full", name: "Full", type: "builtin" }, { frameThickness: 5 }),
      frameSel({ templateId: "full" }),
    );
    expect(result.ok).toBe(true);
  });

  it("supports an uploaded template whose single zone covers the whole mat", () => {
    for (const template of [
      { id: "ft1", name: "T", type: "uploaded", photoZones: [{ x: 0, y: 0, w: 100, h: 100 }] },
      { id: "ft1", name: "T", type: "uploaded", photoSlot: { x: 0, y: 0, w: 100, h: 100 } },
    ]) {
      const result = projectFramePreviewGeometry(
        frameDoc(SIZE, template, { frameThickness: 5 }),
        frameSel(),
      );
      expect(result.ok).toBe(true);
    }
  });

  it.each([
    ["templateBackgroundColor", "templateBackgroundColor"],
    ["canvasBgColor", "canvasBgColor"],
    ["backgroundColor", "backgroundColor"],
    ["paperColor", "paperColor"],
  ])("reads the mat colour alias %s and canonicalises to uppercase", (_label, key) => {
    for (const flag of ["backgroundEnabled", "templateBackgroundEnabled", "canvasBgEnabled"]) {
      const result = projectFramePreviewGeometry(
        frameDoc(SIZE, { ...UPLOADED_FULL, [flag]: true, [key]: "#aabbcc" }, { frameThickness: 5 }),
        frameSel(),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.matColor).toBe("#AABBCC");
    }
  });

  it.each([[true], [1], ["1"], ["true"], ["on"], ["ON"]])(
    "accepts the legacy truthy flag spelling %s",
    (flag) => {
      const result = projectFramePreviewGeometry(
        frameDoc(
          SIZE,
          { ...UPLOADED_FULL, backgroundEnabled: flag, paperColor: "#123456" },
          { frameThickness: 5 },
        ),
        frameSel(),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.matColor).toBe("#123456");
    },
  );

  it("uses white when the mat is disabled, even with a colour present", () => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, { ...UPLOADED_FULL, paperColor: "#123456" }, { frameThickness: 5 }),
      frameSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.matColor).toBe("#FFFFFF");
    expect(result.diagnostics.map((d) => d.code)).toEqual(["ALPHA_OUTLINE_OMITTED"]);
  });

  it.each([["#12345"], ["red"], ["rgba(0,0,0,.06)"], ["#12345678"], [123]])(
    "falls back to white with a diagnostic for an invalid mat colour (%s)",
    (color) => {
      const result = projectFramePreviewGeometry(
        frameDoc(
          SIZE,
          { ...UPLOADED_FULL, canvasBgEnabled: "on", canvasBgColor: color },
          { frameThickness: 5 },
        ),
        frameSel(),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.matColor).toBe("#FFFFFF");
      expect(result.diagnostics.map((d) => d.code)).toContain("INVALID_MAT_COLOR");
      expect(JSON.stringify(result)).not.toContain(String(color));
    },
  );

  it("reports the omitted inner border when the template carries that data", () => {
    const result = projectFramePreviewGeometry(
      frameDoc(
        SIZE,
        { ...UPLOADED_FULL, whiteInnerBorder: true, whiteInnerBorderThickness: 2 },
        { frameThickness: 5 },
      ),
      frameSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      "INNER_BORDER_OMITTED",
      "ALPHA_OUTLINE_OMITTED",
    ]);
    // the omitted layers never leak values into the output
    expect(Object.keys(result.value).sort()).toEqual([
      "aspect",
      "borderPercentOfWidth",
      "contentInsetPx",
      "matColor",
    ]);
  });
});

describe("projectFramePreviewGeometry — explicit failures", () => {
  it.each([
    ["missing", { id: "s1", name: "사이즈" }],
    ["zero", { id: "s1", name: "사이즈", aspect: 0 }],
    ["negative", { id: "s1", name: "사이즈", aspect: -1.4 }],
    ["NaN", { id: "s1", name: "사이즈", aspect: Number.NaN }],
    ["numeric string", { id: "s1", name: "사이즈", aspect: "1.4" }],
  ])("rejects an aspect that is not a finite positive number (%s)", (_label, size) => {
    const result = projectFramePreviewGeometry(
      frameDoc(size, UPLOADED_FULL, { frameThickness: 5 }),
      frameSel(),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_GEOMETRY", diagnostics: [] });
  });

  it("never substitutes the legacy UI aspect fallback of 1", () => {
    const result = projectFramePreviewGeometry(
      frameDoc({ id: "s1", name: "사이즈" }, UPLOADED_FULL, { frameThickness: 5 }),
      frameSel(),
    );
    expect(result.ok).toBe(false);
  });

  it("does not hide an invalid size-level thickness behind the top-level value", () => {
    const result = projectFramePreviewGeometry(
      frameDoc({ ...SIZE, frameThickness: 0 }, UPLOADED_FULL, { frameThickness: 5.5 }),
      frameSel(),
    );
    expect(result).toEqual({ ok: false, code: "INVALID_GEOMETRY", diagnostics: [] });
  });

  it.each([
    ["both missing", {}],
    ["top-level NaN", { frameThickness: Number.NaN }],
    ["top-level string", { frameThickness: "5.5" }],
    ["top-level negative", { frameThickness: -5 }],
  ])("fails when no valid thickness exists (%s) and never hardcodes 5.5", (_label, extra) => {
    const result = projectFramePreviewGeometry(frameDoc(SIZE, UPLOADED_FULL, extra), frameSel());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_GEOMETRY");
    expect(JSON.stringify(result)).not.toContain("5.5");
  });

  it.each([
    ["duo", { id: "duo", name: "duo", type: "builtin" }, "UNSUPPORTED_FRAME_TEMPLATE"],
    ["trio", { id: "trio", name: "trio", type: "builtin" }, "UNSUPPORTED_FRAME_TEMPLATE"],
    ["text_only", { id: "text_only", name: "t", type: "builtin" }, "UNSUPPORTED_FRAME_TEMPLATE"],
    ["top_text", { id: "top_text", name: "t", type: "builtin" }, "UNSUPPORTED_FRAME_TEMPLATE"],
    [
      "unknown builtin",
      { id: "mystery", name: "m", type: "builtin" },
      "UNSUPPORTED_FRAME_TEMPLATE",
    ],
    ["circle builtin", { id: "circle", name: "c", type: "builtin" }, "UNSUPPORTED_ZONE_SHAPE"],
    ["unknown type", { id: "ft1", name: "x", type: "other" }, "UNSUPPORTED_FRAME_TEMPLATE"],
    ["missing type", { id: "ft1", name: "x" }, "UNSUPPORTED_FRAME_TEMPLATE"],
  ])("refuses a frame template that is not one full-mat rectangle (%s)", (_l, template, code) => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, template, { frameThickness: 5 }),
      frameSel({ templateId: String((template as { id: string }).id) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(code);
  });

  it.each([
    [
      "two zones",
      { id: "ft1", name: "T", type: "uploaded", photoZones: [RECT_ZONE, RECT_ZONE_2] },
      "UNSUPPORTED_FRAME_TEMPLATE",
    ],
    [
      "single sub-rect zone",
      { id: "ft1", name: "T", type: "uploaded", photoZones: [RECT_ZONE] },
      "UNSUPPORTED_FRAME_TEMPLATE",
    ],
    [
      "circle zone",
      {
        id: "ft1",
        name: "T",
        type: "uploaded",
        photoZones: [{ x: 0, y: 0, w: 100, h: 100, type: "circle" }],
      },
      "UNSUPPORTED_ZONE_SHAPE",
    ],
    [
      "empty explicit array",
      { id: "ft1", name: "T", type: "uploaded", photoZones: [] },
      "INVALID_GEOMETRY",
    ],
  ])("refuses an uploaded frame layout that is not full-mat (%s)", (_l, template, code) => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, template, { frameThickness: 5 }),
      frameSel(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(code);
  });
});

// --- runtime hostility, purity, leak safety --------------------------------

describe("preview projection — hostile runtime input", () => {
  const hostile = (): Record<string, unknown> => {
    const object: Record<string, unknown> = {};
    Object.defineProperty(object, "boom", {
      get() {
        throw new Error("hostile getter");
      },
      enumerable: true,
    });
    return object;
  };

  it.each([
    ["null document", null],
    ["undefined document", undefined],
    ["primitive document", 42],
    ["array document", []],
    ["document without data", { schemaVersion: 1 }],
    ["data not an object", { schemaVersion: 1, data: 7 }],
  ])("returns INVALID_INPUT for a malformed document (%s)", (_label, document) => {
    const result = projectCasePreviewGeometry(document as CatalogDocumentV1, caseSel());
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", diagnostics: [] });
  });

  it.each([
    ["null selection", null],
    ["primitive selection", "m1"],
    ["missing fields", {}],
    ["non-string id", { modelId: 1, templateId: "t1" }],
  ])("returns INVALID_INPUT for a malformed selection (%s)", (_label, selection) => {
    const result = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }),
      selection as CasePreviewSelection,
    );
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", diagnostics: [] });
  });

  it("never throws for throwing getters, Proxy traps or a revoked Proxy", () => {
    const throwingDataDoc = {} as Record<string, unknown>;
    Object.defineProperty(throwingDataDoc, "data", {
      get() {
        throw new Error("hostile document getter");
      },
    });

    const throwingZone = hostile();
    Object.defineProperty(throwingZone, "x", {
      get() {
        throw new Error("hostile zone getter");
      },
      enumerable: true,
    });

    const proxyDoc = new Proxy(
      doc({ models: [MODEL], caseTemplates: [{ id: "t1", photoZones: [RECT_ZONE] }] }),
      {
        get() {
          throw new Error("hostile trap");
        },
      },
    );
    const revocable = Proxy.revocable(
      doc({ models: [MODEL], caseTemplates: [{ id: "t1", photoZones: [RECT_ZONE] }] }),
      {},
    );
    revocable.revoke();

    const candidates: unknown[] = [
      throwingDataDoc,
      caseDoc({ id: "t1", name: "케이스", photoZones: [throwingZone] }),
      proxyDoc,
      revocable.proxy,
    ];
    for (const candidate of candidates) {
      let result: ReturnType<typeof projectCasePreviewGeometry> | undefined;
      expect(() => {
        result = projectCasePreviewGeometry(candidate as CatalogDocumentV1, caseSel());
      }).not.toThrow();
      expect(result?.ok).toBe(false);
    }

    const hostileSelection = new Proxy(caseSel(), {
      get() {
        throw new Error("hostile selection trap");
      },
    });
    expect(() =>
      projectCasePreviewGeometry(
        caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }),
        hostileSelection,
      ),
    ).not.toThrow();
  });
});

describe("preview projection — purity and leak safety", () => {
  it("does not mutate a deep-frozen input and is deterministic", () => {
    const document = deepFreeze(
      doc({
        models: [{ ...MODEL }],
        caseTemplates: [{ id: "t1", name: "케이스", photoZones: [{ ...RECT_ZONE }] }],
      }),
    );
    const selection = deepFreeze(caseSel());
    const before = JSON.stringify(document);
    const first = projectCasePreviewGeometry(document, selection);
    const second = projectCasePreviewGeometry(document, selection);
    expect(first).toEqual(second);
    expect(JSON.stringify(document)).toBe(before);
  });

  it("returns JSON-safe plain data with only finite numbers", () => {
    const caseResult = projectCasePreviewGeometry(
      caseDoc({ id: "t1", name: "케이스", photoZones: [RECT_ZONE] }),
      caseSel(),
    );
    const frameResult = projectFramePreviewGeometry(
      frameDoc(SIZE, UPLOADED_FULL, { frameThickness: 5.5 }),
      frameSel(),
    );
    for (const result of [caseResult, frameResult]) {
      const clone = JSON.parse(JSON.stringify(result));
      expect(clone).toEqual(result);
    }
    expect(caseResult.ok && Number.isFinite(caseResult.value.modelLogicalSize.width)).toBe(true);
    expect(frameResult.ok && Number.isFinite(frameResult.value.borderPercentOfWidth)).toBe(true);
  });

  it("never echoes ids, names, images, URLs, tokens or paths", () => {
    const document = doc({
      models: [{ ...MODEL, name: "모델이름-노출금지" }],
      caseTemplates: [
        {
          id: "t1",
          name: "템플릿이름-노출금지",
          categoryId: "cat-secret",
          dataUrl: "data:image/png;base64,AAAA",
          storagePath: "templates/secret.png",
          photoZones: [{ ...RECT_ZONE, label: "라벨-노출금지" }],
        },
      ],
    });
    const ok = projectCasePreviewGeometry(document, caseSel());
    const failed = projectCasePreviewGeometry(document, caseSel({ templateId: "t-missing" }));
    for (const result of [ok, failed]) {
      const serialized = JSON.stringify(result);
      for (const forbidden of [
        "모델이름-노출금지",
        "템플릿이름-노출금지",
        "라벨-노출금지",
        "cat-secret",
        "data:",
        "base64",
        "templates/",
        "t-missing",
        "m1",
        "t1",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("keeps failure payloads to ok/code/diagnostics only", () => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, { id: "duo", name: "duo", type: "builtin" }, { frameThickness: 5 }),
      frameSel({ templateId: "duo" }),
    );
    expect(Object.keys(result).sort()).toEqual(["code", "diagnostics", "ok"]);
  });
});

// --- contentInsetPx (spec 025) ---------------------------------------------

describe("projectFramePreviewGeometry — contentInsetPx", () => {
  const inset = (template: Record<string, unknown>): number | string => {
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, template, { frameThickness: 5 }),
      frameSel({ templateId: String(template.id) }),
    );
    return result.ok ? result.value.contentInsetPx : result.code;
  };

  it.each([
    ["dataUrl", "dataUrl"],
    ["sourceDataUrl", "sourceDataUrl"],
    ["builderArtDataUrl", "builderArtDataUrl"],
    ["artDataUrl", "artDataUrl"],
    ["originalDataUrl", "originalDataUrl"],
  ])("uploaded with a design source in %s → 0", (_label, field) => {
    expect(inset({ ...UPLOADED_FULL, [field]: "data:image/png;base64,QQ" })).toBe(0);
  });

  it("uploaded without any design source → 8", () => {
    expect(inset(UPLOADED_FULL)).toBe(8);
    expect(inset({ ...UPLOADED_FULL, dataUrl: "" })).toBe(8);
    expect(inset({ ...UPLOADED_FULL, dataUrl: 42 })).toBe(8);
  });

  it("generatedDetailPreview gates the whole chain back to 8", () => {
    expect(
      inset({
        ...UPLOADED_FULL,
        generatedDetailPreview: true,
        dataUrl: "data:image/png;base64,QQ",
      }),
    ).toBe(8);
    expect(
      inset({
        ...UPLOADED_FULL,
        generatedDetailPreview: false,
        originalDataUrl: "data:image/png;base64,QQ",
      }),
    ).toBe(0);
  });

  it("builtin full → 8 even though it is a supported single-rect template", () => {
    expect(inset({ id: "full", name: "Full", type: "builtin" })).toBe(8);
  });

  it("returns only the number — no source string, field name or URL kind leaks", () => {
    const marker = "data:image/png;base64,SECRETMARKER";
    const result = projectFramePreviewGeometry(
      frameDoc(SIZE, { ...UPLOADED_FULL, sourceDataUrl: marker }, { frameThickness: 5 }),
      frameSel(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contentInsetPx).toBe(0);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["SECRETMARKER", "data:", "base64", "sourceDataUrl", "dataUrl"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("is always exactly 0 or 8", () => {
    for (const template of [
      UPLOADED_FULL,
      { ...UPLOADED_FULL, dataUrl: "data:image/png;base64,QQ" },
      { id: "full", name: "Full", type: "builtin" },
    ]) {
      expect([0, 8]).toContain(inset(template));
    }
  });
});
