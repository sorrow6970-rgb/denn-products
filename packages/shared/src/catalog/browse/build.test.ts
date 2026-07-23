import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import { buildCatalogBrowseIndex } from "./build";
import {
  selectCaseCategories,
  selectFrameCategories,
  selectFrameSizes,
  selectFrameTemplates,
  selectModels,
} from "./select";

function doc(data: Record<string, unknown>): CatalogDocumentV1 {
  return { schemaVersion: 1, migratedFrom: "legacy-v0", data } as unknown as CatalogDocumentV1;
}
function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

const RICH = () =>
  doc({
    models: [
      { id: "m1", name: "모델1", sub: "설명1" },
      { id: "m2", name: "모델2" },
    ],
    caseCategories: [
      { id: "all", name: "전체" }, // reserved → diagnostic, no duplicate tab
      { id: "phone", name: "폰케이스" },
    ],
    caseTemplates: [
      { id: "ct1", name: "케이스1", categoryId: "phone", type: "uploaded" },
      { id: "ct2", name: "케이스2" }, // uncategorized
      { id: "ct3", categoryId: "phone" }, // no name → INVALID_DISPLAY_FIELD
      { id: "ct4", name: "케이스4", categoryId: "ghost" }, // orphan
    ],
    frameCategories: [
      { id: "builtin", name: "예약" }, // reserved → diagnostic
      { id: "wedding", name: "웨딩" },
    ],
    frameSizes: [
      { id: "a4", name: "A4", sub: "21x29.7", aspect: 1.5 },
      { id: "sq", name: "정사각", aspect: 1 },
      { id: "hid", name: "숨김", hideInMockup: true }, // hidden
      { id: "bad", name: "잘못", aspect: -1 }, // invalid aspect omitted, size still shown
    ],
    frameTemplates: [
      { id: "ft1", name: "프레임1", type: "builtin" }, // all
      { id: "ft2", name: "프레임2", type: "uploaded", categoryId: "wedding", sizeId: "a4" }, // restricted
      { id: "ft3", name: "프레임3", type: "uploaded", allFrameSizes: true }, // all
      { id: "ft4", name: "프레임4", type: "uploaded", sizeId: "nope" }, // unmatched
      {
        id: "ft5",
        name: "프레임5",
        type: "hologram", // unsupported type
        dataUrl: "data:image/png;base64,SECRETB64",
        storagePath: "guides/SECRET_PATH.png",
        secretUnknown: "SECRET_UNKNOWN",
      },
      { id: "ft6", name: "프레임6", type: "uploaded", categoryId: "ghost" }, // orphan
    ],
  });

const SECRETS = ["SECRETB64", "SECRET_PATH", "SECRET_UNKNOWN", "data:image", "guides/"];

describe("buildCatalogBrowseIndex — options & order", () => {
  it("models keep source order + label/description", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    expect(selectModels(idx)).toEqual([
      { id: "m1", label: "모델1", description: "설명1", sourceIndex: 0 },
      { id: "m2", label: "모델2", sourceIndex: 1 },
    ]);
  });

  it("case categories = virtual all + catalog (reserved {id:all} deduped)", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    expect(selectCaseCategories(idx)).toEqual([
      { id: "all", label: "전체", sourceIndex: -1, kind: "all" },
      { id: "phone", label: "폰케이스", sourceIndex: 1, kind: "catalog" },
    ]);
  });

  it("frame categories = virtual all + builtin + catalog (reserved {id:builtin} deduped)", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    expect(selectFrameCategories(idx)).toEqual([
      { id: "all", label: "전체", sourceIndex: -1, kind: "all" },
      { id: "builtin", label: "기본 액자", sourceIndex: -1, kind: "builtin" },
      { id: "wedding", label: "웨딩", sourceIndex: 1, kind: "catalog" },
    ]);
  });

  it("frame sizes exclude hidden; aspect only when finite positive", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    expect(selectFrameSizes(idx)).toEqual([
      { id: "a4", label: "A4", description: "21x29.7", sourceIndex: 0, aspect: 1.5 },
      { id: "sq", label: "정사각", sourceIndex: 1, aspect: 1 },
      { id: "bad", label: "잘못", sourceIndex: 3 },
    ]);
  });
});

describe("buildCatalogBrowseIndex — diagnostics", () => {
  it("emits deterministic, deduped diagnostics with code/collection/sourceIndex only", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    expect(idx.diagnostics).toEqual([
      { code: "RESERVED_CATEGORY_ID", collection: "caseCategories", sourceIndex: 0 },
      { code: "INVALID_DISPLAY_FIELD", collection: "caseTemplates", sourceIndex: 2 },
      { code: "ORPHAN_CATEGORY_REFERENCE", collection: "caseTemplates", sourceIndex: 3 },
      { code: "RESERVED_CATEGORY_ID", collection: "frameCategories", sourceIndex: 0 },
      { code: "UNKNOWN_SIZE_REFERENCE", collection: "frameTemplates", sourceIndex: 3 },
      { code: "UNSUPPORTED_TEMPLATE_TYPE", collection: "frameTemplates", sourceIndex: 4 },
      { code: "ORPHAN_CATEGORY_REFERENCE", collection: "frameTemplates", sourceIndex: 5 },
    ]);
    for (const d of idx.diagnostics) {
      expect(Object.keys(d).sort()).toEqual(["code", "collection", "sourceIndex"]);
    }
  });

  it("unsupported type is kept as kind other, sizeScope of unmatched is unmatched", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    const templates = selectFrameTemplates(idx);
    expect(templates.find((t) => t.id === "ft5")?.kind).toBe("other");
    expect(templates.find((t) => t.id === "ft4")?.sizeScope).toBe("unmatched");
    expect(templates.find((t) => t.id === "ft2")?.sizeScope).toBe("restricted");
    expect(templates.find((t) => t.id === "ft1")?.sizeScope).toBe("all");
  });
});

describe("buildCatalogBrowseIndex — safety", () => {
  it("never copies raw item / unknown / image / base64 into output or diagnostics", () => {
    const idx = buildCatalogBrowseIndex(RICH());
    const serialized = JSON.stringify({
      models: selectModels(idx),
      caseCategories: selectCaseCategories(idx),
      frameCategories: selectFrameCategories(idx),
      frameSizes: selectFrameSizes(idx),
      frameTemplates: selectFrameTemplates(idx),
      diagnostics: idx.diagnostics,
    });
    for (const marker of SECRETS) expect(serialized).not.toContain(marker);
  });

  it("does not mutate a deep-frozen input", () => {
    const input = RICH();
    const snapshot = structuredClone(input);
    deepFreeze(input);
    buildCatalogBrowseIndex(input);
    expect(input).toEqual(snapshot);
  });

  it("is idempotent: two builds give deep-equal selector output", () => {
    const a = buildCatalogBrowseIndex(RICH());
    const b = buildCatalogBrowseIndex(RICH());
    expect(selectModels(a)).toEqual(selectModels(b));
    expect(selectFrameTemplates(a)).toEqual(selectFrameTemplates(b));
    expect(a.diagnostics).toEqual(b.diagnostics);
  });
});
