import { buildCatalogBrowseIndex, type CatalogBrowseIndex } from "@denn/shared";
import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORY_ID,
  type CatalogBrowseSelection,
  INITIAL_SELECTION,
  isCategorySelectable,
  isSelectionComplete,
  reduceSelection,
  templatesFor,
} from "./selection";

// Synthetic legacy-v0 catalog (no real product names/ids/images). Chosen so:
// - case category cc2 has 0 templates → disabled
// - frame category fc2 is enabled only under size fs2 (size-dependent disabling)
// - ftx references an unknown size → an UNKNOWN_SIZE_REFERENCE diagnostic
function doc(data: Record<string, unknown>): CatalogDocumentV1 {
  return { schemaVersion: 1, migratedFrom: "legacy-v0", data } as unknown as CatalogDocumentV1;
}

const FIXTURE = () =>
  doc({
    models: [
      { id: "m1", name: "모델 하나" },
      { id: "m2", name: "모델 둘" },
    ],
    caseCategories: [
      { id: "cc1", name: "분류 A" },
      { id: "cc2", name: "분류 B" }, // no templates → disabled
    ],
    caseTemplates: [
      { id: "ct1", name: "케이스 알파", categoryId: "cc1", type: "uploaded" },
      { id: "ct2", name: "케이스 베타", type: "uploaded" }, // uncategorized
    ],
    frameSizes: [
      { id: "fs1", name: "사이즈 하나" },
      { id: "fs2", name: "사이즈 둘" },
      { id: "fsh", name: "숨김 사이즈", hideInMockup: true }, // hidden
    ],
    frameCategories: [
      { id: "fc1", name: "액자 A" },
      { id: "fc2", name: "액자 B" },
    ],
    frameTemplates: [
      { id: "ftall", name: "전체 액자", type: "builtin" }, // scope all
      { id: "ftr1", name: "제한 액자 하나", type: "uploaded", categoryId: "fc1", sizeIds: ["fs1"] },
      { id: "ftr2", name: "제한 액자 둘", type: "uploaded", categoryId: "fc2", sizeIds: ["fs2"] },
      {
        id: "ftx",
        name: "미스매치 액자",
        type: "uploaded",
        categoryId: "fc1",
        sizeIds: ["없는사이즈"],
      },
    ],
  });

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

const index = (): CatalogBrowseIndex => buildCatalogBrowseIndex(FIXTURE());

// Convenience: run a sequence of actions from the initial state.
function run(
  idx: CatalogBrowseIndex,
  actions: Parameters<typeof reduceSelection>[1][],
  start: CatalogBrowseSelection = INITIAL_SELECTION,
): CatalogBrowseSelection {
  return actions.reduce((s, a) => reduceSelection(s, a, idx), start);
}

describe("selection reducer — initial + product kind", () => {
  it("initial state has no kind and virtual-all category", () => {
    expect(INITIAL_SELECTION).toEqual({
      productKind: null,
      modelId: null,
      frameSizeId: null,
      categoryId: ALL_CATEGORY_ID,
      templateId: null,
    });
  });

  it("selecting a product kind sets it and leaves the rest at defaults", () => {
    const s = reduceSelection(
      INITIAL_SELECTION,
      { type: "selectProductKind", productKind: "case" },
      index(),
    );
    expect(s).toEqual({ ...INITIAL_SELECTION, productKind: "case" });
  });

  it("changing product kind clears model/size/category/template", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectCategory", categoryId: "cc1" },
      { type: "selectTemplate", templateId: "ct1" },
    ]);
    expect(built).toEqual({
      productKind: "case",
      modelId: "m1",
      frameSizeId: null,
      categoryId: "cc1",
      templateId: "ct1",
    });
    const switched = reduceSelection(
      built,
      { type: "selectProductKind", productKind: "frame" },
      idx,
    );
    expect(switched).toEqual({ ...INITIAL_SELECTION, productKind: "frame" });
  });

  it("re-selecting the same product kind is a stable no-op (keeps sub-selections)", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
    ]);
    expect(reduceSelection(built, { type: "selectProductKind", productKind: "case" }, idx)).toBe(
      built,
    );
  });
});

describe("selection reducer — case flow", () => {
  it("changing the model keeps category and template (no model→template filter)", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectCategory", categoryId: "cc1" },
      { type: "selectTemplate", templateId: "ct1" },
    ]);
    const changed = reduceSelection(built, { type: "selectModel", modelId: "m2" }, idx);
    expect(changed).toEqual({ ...built, modelId: "m2" });
    expect(changed.categoryId).toBe("cc1");
    expect(changed.templateId).toBe("ct1");
  });

  it("changing the category clears the template", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectTemplate", templateId: "ct1" }, // category is "all"
    ]);
    expect(built.templateId).toBe("ct1");
    const changed = reduceSelection(built, { type: "selectCategory", categoryId: "cc1" }, idx);
    expect(changed.categoryId).toBe("cc1");
    expect(changed.templateId).toBeNull();
  });

  it("a disabled (0-template) category is a no-op", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
    ]);
    // cc2 has no templates → disabled
    expect(isCategorySelectable(idx, "case", null, "cc2")).toBe(false);
    expect(reduceSelection(built, { type: "selectCategory", categoryId: "cc2" }, idx)).toBe(built);
  });

  it("only a template in the current result can be selected", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectCategory", categoryId: "cc1" }, // only ct1 available
    ]);
    // ct2 is uncategorized → not under cc1
    expect(reduceSelection(built, { type: "selectTemplate", templateId: "ct2" }, idx)).toBe(built);
    const ok = reduceSelection(built, { type: "selectTemplate", templateId: "ct1" }, idx);
    expect(ok.templateId).toBe("ct1");
  });
});

describe("selection reducer — frame flow", () => {
  it("changing the size resets category to all and clears the template", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "frame" },
      { type: "selectFrameSize", frameSizeId: "fs2" },
      { type: "selectCategory", categoryId: "fc2" }, // enabled under fs2
      { type: "selectTemplate", templateId: "ftr2" },
    ]);
    expect(built).toEqual({
      productKind: "frame",
      modelId: null,
      frameSizeId: "fs2",
      categoryId: "fc2",
      templateId: "ftr2",
    });
    const changed = reduceSelection(built, { type: "selectFrameSize", frameSizeId: "fs1" }, idx);
    expect(changed.frameSizeId).toBe("fs1");
    expect(changed.categoryId).toBe(ALL_CATEGORY_ID);
    expect(changed.templateId).toBeNull();
  });

  it("frame templates come from selectFrameTemplates(size,category) only", () => {
    const idx = index();
    // size fs1, category all → ftall + ftr1
    expect(templatesFor(idx, "frame", "fs1", "all").map((t) => t.id)).toEqual(["ftall", "ftr1"]);
    // size fs1, category fc2 → empty (ftr2 is fs2-only) → fc2 disabled under fs1
    expect(isCategorySelectable(idx, "frame", "fs1", "fc2")).toBe(false);
    // size fs2, category fc2 → ftr2 → enabled
    expect(isCategorySelectable(idx, "frame", "fs2", "fc2")).toBe(true);
  });

  it("model action is ignored while browsing frames", () => {
    const idx = index();
    const built = run(idx, [{ type: "selectProductKind", productKind: "frame" }]);
    expect(reduceSelection(built, { type: "selectModel", modelId: "m1" }, idx)).toBe(built);
  });
});

describe("selection reducer — invalid ids are no-ops", () => {
  it("unknown model / size / category / template return the same reference", () => {
    const idx = index();
    const caseState = run(idx, [{ type: "selectProductKind", productKind: "case" }]);
    expect(reduceSelection(caseState, { type: "selectModel", modelId: "ghost" }, idx)).toBe(
      caseState,
    );
    expect(reduceSelection(caseState, { type: "selectCategory", categoryId: "ghost" }, idx)).toBe(
      caseState,
    );
    expect(reduceSelection(caseState, { type: "selectTemplate", templateId: "ghost" }, idx)).toBe(
      caseState,
    );

    const frameState = run(idx, [{ type: "selectProductKind", productKind: "frame" }]);
    expect(reduceSelection(frameState, { type: "selectFrameSize", frameSizeId: "fsh" }, idx)).toBe(
      frameState,
    ); // hidden
    expect(
      reduceSelection(frameState, { type: "selectFrameSize", frameSizeId: "ghost" }, idx),
    ).toBe(frameState);
  });

  it("actions before a product kind is chosen are no-ops", () => {
    const idx = index();
    expect(reduceSelection(INITIAL_SELECTION, { type: "selectModel", modelId: "m1" }, idx)).toBe(
      INITIAL_SELECTION,
    );
    expect(
      reduceSelection(INITIAL_SELECTION, { type: "selectCategory", categoryId: "cc1" }, idx),
    ).toBe(INITIAL_SELECTION);
    expect(
      reduceSelection(INITIAL_SELECTION, { type: "selectTemplate", templateId: "ct1" }, idx),
    ).toBe(INITIAL_SELECTION);
  });

  it("re-selecting the current value is a stable no-op (never toggles off)", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectTemplate", templateId: "ct1" },
    ]);
    expect(reduceSelection(built, { type: "selectModel", modelId: "m1" }, idx)).toBe(built);
    expect(reduceSelection(built, { type: "selectTemplate", templateId: "ct1" }, idx)).toBe(built);
    expect(reduceSelection(built, { type: "selectCategory", categoryId: "all" }, idx)).toBe(built);
  });
});

describe("selection reducer — reconcile after catalog swap", () => {
  it("drops selections whose ids vanished and never auto-selects a replacement", () => {
    const before = index();
    const built = run(before, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m2" },
      { type: "selectCategory", categoryId: "cc1" },
      { type: "selectTemplate", templateId: "ct1" },
    ]);
    // New catalog: m2, cc1, ct1 all gone; only m1 / other category remain.
    const after = buildCatalogBrowseIndex(
      doc({
        models: [{ id: "m1", name: "모델 하나" }],
        caseCategories: [{ id: "cc9", name: "분류 Z" }],
        caseTemplates: [{ id: "ct9", name: "케이스 제트", categoryId: "cc9", type: "uploaded" }],
      }),
    );
    const reconciled = reduceSelection(built, { type: "reconcile" }, after);
    expect(reconciled).toEqual({
      productKind: "case", // kept — not catalog-derived
      modelId: null, // m2 vanished
      frameSizeId: null,
      categoryId: ALL_CATEGORY_ID, // cc1 vanished → reset
      templateId: null, // ct1 vanished
    });
  });

  it("keeps still-valid selections unchanged (same reference)", () => {
    const idx = index();
    const built = run(idx, [
      { type: "selectProductKind", productKind: "frame" },
      { type: "selectFrameSize", frameSizeId: "fs1" },
    ]);
    // Reconcile against the SAME catalog identity → nothing to clean.
    expect(reduceSelection(built, { type: "reconcile" }, idx)).toBe(built);
  });
});

describe("selection reducer — completion + immutability", () => {
  it("case completes on kind+model+template; frame on kind+size+template", () => {
    const idx = index();
    const caseDone = run(idx, [
      { type: "selectProductKind", productKind: "case" },
      { type: "selectModel", modelId: "m1" },
      { type: "selectTemplate", templateId: "ct2" }, // category all
    ]);
    expect(isSelectionComplete(caseDone)).toBe(true);
    expect(isSelectionComplete({ ...caseDone, templateId: null })).toBe(false);
    expect(isSelectionComplete({ ...caseDone, modelId: null })).toBe(false);

    const frameDone = run(idx, [
      { type: "selectProductKind", productKind: "frame" },
      { type: "selectFrameSize", frameSizeId: "fs1" },
      { type: "selectTemplate", templateId: "ftall" },
    ]);
    expect(isSelectionComplete(frameDone)).toBe(true);
    expect(isSelectionComplete({ ...frameDone, frameSizeId: null })).toBe(false);
  });

  it("does not mutate a frozen input state or index", () => {
    const idx = deepFreeze(index());
    const state = deepFreeze({ ...INITIAL_SELECTION });
    expect(() =>
      reduceSelection(state, { type: "selectProductKind", productKind: "case" }, idx),
    ).not.toThrow();
    // original untouched
    expect(state).toEqual(INITIAL_SELECTION);
  });
});
