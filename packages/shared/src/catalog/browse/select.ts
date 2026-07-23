// Pure browse selectors over a precomputed CatalogBrowseIndex (spec 016 §2, §6, §8, §10).

import type {
  BrowseCategory,
  BrowseOption,
  BrowseSize,
  BrowseTemplate,
  CatalogBrowseIndex,
} from "./types";

export function selectModels(index: CatalogBrowseIndex): readonly BrowseOption[] {
  return index.models;
}

export function selectCaseCategories(index: CatalogBrowseIndex): readonly BrowseCategory[] {
  return index.caseCategories;
}

export function selectFrameCategories(index: CatalogBrowseIndex): readonly BrowseCategory[] {
  return index.frameCategories;
}

export function selectFrameSizes(index: CatalogBrowseIndex): readonly BrowseSize[] {
  return index.frameSizes;
}

/**
 * Case templates for a category. No category / "all" → the whole collection in source order.
 * A known catalog category → exact `categoryId` match (any type). An unknown category → empty.
 */
export function selectCaseTemplates(
  index: CatalogBrowseIndex,
  query: { categoryId?: string } = {},
): readonly BrowseTemplate[] {
  const { categoryId } = query;
  if (categoryId === undefined || categoryId === "all") {
    return index.caseTemplates.map((e) => e.view);
  }
  if (!index.caseCategoryIds.has(categoryId)) return [];
  return index.caseTemplates.filter((e) => e.categoryId === categoryId).map((e) => e.view);
}

/**
 * Frame templates for a category and/or size.
 * - category: no category / "all" → all; "builtin" → type builtin; a known catalog category →
 *   type uploaded with exact `categoryId`; unknown category → empty.
 * - size: no size → all templates (all/restricted/unmatched); a known VISIBLE size → templates
 *   whose scope is "all" or whose "restricted" keys intersect the size's keys; unmatched excluded;
 *   an unknown or hidden size → empty.
 */
export function selectFrameTemplates(
  index: CatalogBrowseIndex,
  query: { categoryId?: string; sizeId?: string } = {},
): readonly BrowseTemplate[] {
  const { categoryId, sizeId } = query;
  let entries = index.frameTemplates;

  if (categoryId !== undefined && categoryId !== "all") {
    if (categoryId === "builtin") {
      entries = entries.filter((e) => e.kind === "builtin");
    } else if (index.frameCategoryIds.has(categoryId)) {
      entries = entries.filter((e) => e.kind === "uploaded" && e.categoryId === categoryId);
    } else {
      return [];
    }
  }

  if (sizeId !== undefined) {
    const sizeKeys = index.sizeIdToKeys.get(sizeId); // present only for known visible sizes
    if (!sizeKeys) return [];
    entries = entries.filter(
      (e) =>
        e.sizeScope === "all" ||
        (e.sizeScope === "restricted" && e.sizeKeys.some((key) => sizeKeys.has(key))),
    );
  }

  return entries.map((e) => e.view);
}
