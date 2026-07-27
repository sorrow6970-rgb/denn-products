// Pure catalog-browse selection state (spec 017 §4, §5, §10). No React, no IO — only the spec 016
// public selectors over a precomputed CatalogBrowseIndex. IDs only are stored; labels/options are
// looked up from the index at render time and never duplicated into state.

import {
  type BrowseTemplate,
  type CatalogBrowseIndex,
  selectCaseCategories,
  selectCaseTemplates,
  selectFrameCategories,
  selectFrameSizes,
  selectFrameTemplates,
  selectModels,
} from "@denn/shared";

export type ProductKind = "case" | "frame";

/** Virtual "전체" category id — always present, never disabled, the reset target. */
export const ALL_CATEGORY_ID = "all";

export interface CatalogBrowseSelection {
  readonly productKind: ProductKind | null;
  readonly modelId: string | null;
  readonly frameSizeId: string | null;
  readonly categoryId: string;
  readonly templateId: string | null;
}

/** Nothing chosen; category defaults to the virtual "전체" (spec 017 §4). */
export const INITIAL_SELECTION: CatalogBrowseSelection = {
  productKind: null,
  modelId: null,
  frameSizeId: null,
  categoryId: ALL_CATEGORY_ID,
  templateId: null,
};

export type BrowseAction =
  | { readonly type: "selectProductKind"; readonly productKind: ProductKind }
  | { readonly type: "selectModel"; readonly modelId: string }
  | { readonly type: "selectFrameSize"; readonly frameSizeId: string }
  | { readonly type: "selectCategory"; readonly categoryId: string }
  | { readonly type: "selectTemplate"; readonly templateId: string }
  // Re-validate against a new catalog identity: drop selections whose ids vanished. Never
  // auto-selects a replacement (spec 017 §5).
  | { readonly type: "reconcile" };

// --- membership predicates (all pure, index-only) ---------------------------

function hasModel(index: CatalogBrowseIndex, id: string): boolean {
  return selectModels(index).some((m) => m.id === id);
}

/** selectFrameSizes already excludes hidden sizes, so this is "visible + exists". */
function isVisibleSize(index: CatalogBrowseIndex, id: string): boolean {
  return selectFrameSizes(index).some((s) => s.id === id);
}

function categoryExists(
  index: CatalogBrowseIndex,
  productKind: ProductKind,
  categoryId: string,
): boolean {
  const list = productKind === "case" ? selectCaseCategories(index) : selectFrameCategories(index);
  return list.some((c) => c.id === categoryId);
}

/**
 * Templates for the current selection via the spec 016 selectors only. Frame templates require a
 * size to be meaningful, so with no size the frame result is empty (the UI shows the size step
 * first). A null product kind yields no templates.
 */
export function templatesFor(
  index: CatalogBrowseIndex,
  productKind: ProductKind | null,
  frameSizeId: string | null,
  categoryId: string,
): readonly BrowseTemplate[] {
  if (productKind === "case") return selectCaseTemplates(index, { categoryId });
  if (productKind === "frame") {
    if (frameSizeId === null) return [];
    return selectFrameTemplates(index, { categoryId, sizeId: frameSizeId });
  }
  return [];
}

/**
 * Whether a category can be selected. The virtual "전체" is always selectable (kept visible even at
 * 0 results, spec 017 §8). A concrete catalog/builtin category must exist AND currently yield at
 * least one template — a 0-count category is disabled and cannot be chosen.
 */
export function isCategorySelectable(
  index: CatalogBrowseIndex,
  productKind: ProductKind | null,
  frameSizeId: string | null,
  categoryId: string,
): boolean {
  if (productKind === null) return false;
  if (!categoryExists(index, productKind, categoryId)) return false;
  if (categoryId === ALL_CATEGORY_ID) return true;
  return templatesFor(index, productKind, frameSizeId, categoryId).length > 0;
}

/** Case: kind+model+template. Frame: kind+size+template. Category is not part of completion. */
export function isSelectionComplete(state: CatalogBrowseSelection): boolean {
  if (state.productKind === "case") return state.modelId !== null && state.templateId !== null;
  if (state.productKind === "frame") return state.frameSizeId !== null && state.templateId !== null;
  return false;
}

// --- reducer ----------------------------------------------------------------

/**
 * Drop selections whose ids no longer exist in `index`; reset category to "전체" when it is no
 * longer selectable and clear a template that is not in the current result. Never auto-selects a
 * replacement. Returns the same reference when nothing changed (referential stability).
 */
function sanitize(
  state: CatalogBrowseSelection,
  index: CatalogBrowseIndex,
): CatalogBrowseSelection {
  const kind = state.productKind;
  if (kind === null) {
    // No product kind: the only canonical shape is INITIAL_SELECTION.
    const clean =
      state.modelId === null &&
      state.frameSizeId === null &&
      state.categoryId === ALL_CATEGORY_ID &&
      state.templateId === null;
    return clean ? state : INITIAL_SELECTION;
  }

  // A product kind uses only its own axis; force the other axis to null.
  let modelId = kind === "case" ? state.modelId : null;
  let frameSizeId = kind === "frame" ? state.frameSizeId : null;
  if (modelId !== null && !hasModel(index, modelId)) modelId = null;
  if (frameSizeId !== null && !isVisibleSize(index, frameSizeId)) frameSizeId = null;

  let categoryId = state.categoryId;
  let templateId = state.templateId;
  if (
    categoryId !== ALL_CATEGORY_ID &&
    !isCategorySelectable(index, kind, frameSizeId, categoryId)
  ) {
    categoryId = ALL_CATEGORY_ID;
    templateId = null;
  }
  if (templateId !== null) {
    const available = templatesFor(index, kind, frameSizeId, categoryId);
    if (!available.some((t) => t.id === templateId)) templateId = null;
  }

  if (
    modelId === state.modelId &&
    frameSizeId === state.frameSizeId &&
    categoryId === state.categoryId &&
    templateId === state.templateId
  ) {
    return state;
  }
  return { productKind: kind, modelId, frameSizeId, categoryId, templateId };
}

/**
 * Pure browse-selection reducer (spec 017 §4-5). Unknown/disabled ids are stable no-ops (the same
 * reference is returned). Re-selecting the current value is a no-op, never a toggle-off.
 */
export function reduceSelection(
  state: CatalogBrowseSelection,
  action: BrowseAction,
  index: CatalogBrowseIndex,
): CatalogBrowseSelection {
  switch (action.type) {
    case "selectProductKind": {
      if (state.productKind === action.productKind) return state;
      // Switching kind clears every prior model/size/category/template selection.
      return {
        productKind: action.productKind,
        modelId: null,
        frameSizeId: null,
        categoryId: ALL_CATEGORY_ID,
        templateId: null,
      };
    }
    case "selectModel": {
      if (state.productKind !== "case") return state;
      if (!hasModel(index, action.modelId)) return state;
      if (state.modelId === action.modelId) return state;
      // Model has no direct template relationship → category/template are preserved (spec 017 §5).
      return { ...state, modelId: action.modelId };
    }
    case "selectFrameSize": {
      if (state.productKind !== "frame") return state;
      if (!isVisibleSize(index, action.frameSizeId)) return state;
      if (state.frameSizeId === action.frameSizeId) return state;
      // A new size can invalidate the category → reset to "전체" and clear the template.
      return {
        ...state,
        frameSizeId: action.frameSizeId,
        categoryId: ALL_CATEGORY_ID,
        templateId: null,
      };
    }
    case "selectCategory": {
      if (state.productKind === null) return state;
      if (!isCategorySelectable(index, state.productKind, state.frameSizeId, action.categoryId))
        return state;
      if (state.categoryId === action.categoryId) return state;
      return { ...state, categoryId: action.categoryId, templateId: null };
    }
    case "selectTemplate": {
      if (state.productKind === null) return state;
      const available = templatesFor(index, state.productKind, state.frameSizeId, state.categoryId);
      if (!available.some((t) => t.id === action.templateId)) return state;
      if (state.templateId === action.templateId) return state;
      return { ...state, templateId: action.templateId };
    }
    case "reconcile":
      return sanitize(state, index);
  }
}
