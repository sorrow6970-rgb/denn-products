// Build a browse index from a validated CatalogDocumentV1 (spec 016). Pure, no IO/React/Firebase.
// Never mutates the input; never deep-clones; never traverses unknown/base64 values.

import type { JsonObject, JsonValue } from "../json";
import type { CatalogDocumentV1 } from "../types";
import { sizeItemKeys, templateSizeKeys } from "./keys";
import type {
  BrowseCategory,
  BrowseOption,
  BrowseSize,
  BrowseTemplate,
  CaseTemplateEntry,
  CatalogBrowseDiagnostic,
  CatalogBrowseDiagnosticCode,
  CatalogBrowseIndex,
  FrameTemplateEntry,
} from "./types";

// Virtual category ids reserved by the selector (not deserialized from stored data).
const CASE_RESERVED = new Set<string>(["all"]);
const FRAME_RESERVED = new Set<string>(["all", "builtin"]);
const VIRTUAL_INDEX = -1;

function asArray(value: JsonValue | undefined): readonly JsonObject[] {
  return Array.isArray(value) ? (value as readonly JsonObject[]) : [];
}

type Display = { id: string; label: string; description?: string };

function displayFields(
  item: JsonObject,
  collection: string,
  sourceIndex: number,
  diags: CatalogBrowseDiagnostic[],
): Display | null {
  const { id } = item;
  const name = item.name;
  if (typeof id !== "string" || id.length === 0 || typeof name !== "string" || name.length === 0) {
    diags.push({ code: "INVALID_DISPLAY_FIELD", collection, sourceIndex });
    return null;
  }
  const sub = item.sub;
  return typeof sub === "string" && sub.length > 0
    ? { id, label: name, description: sub }
    : { id, label: name };
}

function typeKind(type: JsonValue): "builtin" | "uploaded" | "other" {
  if (type === "builtin") return "builtin";
  if (type === "uploaded") return "uploaded";
  return "other";
}

function categoryIdOf(item: JsonObject): string | null {
  const cid = item.categoryId;
  return typeof cid === "string" && cid.length > 0 ? cid : null;
}

export function buildCatalogBrowseIndex(document: CatalogDocumentV1): CatalogBrowseIndex {
  const data = document.data;
  const diags: CatalogBrowseDiagnostic[] = [];

  // --- models ---
  const models: BrowseOption[] = [];
  asArray(data.models).forEach((item, i) => {
    const df = displayFields(item, "models", i, diags);
    if (df) models.push({ ...df, sourceIndex: i });
  });

  // --- case categories (virtual "all" + catalog) ---
  const caseCategories: BrowseCategory[] = [
    { id: "all", label: "전체", sourceIndex: VIRTUAL_INDEX, kind: "all" },
  ];
  const caseCategoryIds = new Set<string>();
  asArray(data.caseCategories).forEach((item, i) => {
    const df = displayFields(item, "caseCategories", i, diags);
    if (!df) return;
    if (CASE_RESERVED.has(df.id)) {
      diags.push({ code: "RESERVED_CATEGORY_ID", collection: "caseCategories", sourceIndex: i });
      return;
    }
    caseCategoryIds.add(df.id);
    caseCategories.push({ ...df, sourceIndex: i, kind: "catalog" });
  });

  // --- frame categories (virtual "all" + "builtin" + catalog) ---
  const frameCategories: BrowseCategory[] = [
    { id: "all", label: "전체", sourceIndex: VIRTUAL_INDEX, kind: "all" },
    { id: "builtin", label: "기본 액자", sourceIndex: VIRTUAL_INDEX, kind: "builtin" },
  ];
  const frameCategoryIds = new Set<string>();
  asArray(data.frameCategories).forEach((item, i) => {
    const df = displayFields(item, "frameCategories", i, diags);
    if (!df) return;
    if (FRAME_RESERVED.has(df.id)) {
      diags.push({ code: "RESERVED_CATEGORY_ID", collection: "frameCategories", sourceIndex: i });
      return;
    }
    frameCategoryIds.add(df.id);
    frameCategories.push({ ...df, sourceIndex: i, kind: "catalog" });
  });

  // --- frame sizes (hidden excluded) + key index ---
  const frameSizes: BrowseSize[] = [];
  const sizeIdToKeys = new Map<string, ReadonlySet<string>>();
  const allVisibleSizeKeys = new Set<string>();
  asArray(data.frameSizes).forEach((item, i) => {
    if (item.hideInMockup === true) return; // hidden: not shown, not a diagnostic
    const df = displayFields(item, "frameSizes", i, diags);
    if (!df) return;
    const keys = sizeItemKeys(item);
    sizeIdToKeys.set(df.id, new Set(keys));
    for (const key of keys) allVisibleSizeKeys.add(key);
    const aspectRaw = item.aspect;
    const aspect =
      typeof aspectRaw === "number" && Number.isFinite(aspectRaw) && aspectRaw > 0
        ? aspectRaw
        : undefined;
    frameSizes.push({ ...df, sourceIndex: i, ...(aspect !== undefined ? { aspect } : {}) });
  });

  // --- case templates ---
  const caseTemplates: CaseTemplateEntry[] = [];
  asArray(data.caseTemplates).forEach((item, i) => {
    const df = displayFields(item, "caseTemplates", i, diags);
    if (!df) return;
    const kind = typeKind(item.type);
    const categoryId = categoryIdOf(item);
    if (categoryId !== null && !caseCategoryIds.has(categoryId)) {
      diags.push({
        code: "ORPHAN_CATEGORY_REFERENCE",
        collection: "caseTemplates",
        sourceIndex: i,
      });
    }
    const view: BrowseTemplate = {
      ...df,
      sourceIndex: i,
      kind,
      ...(categoryId !== null ? { categoryId } : {}),
      sizeScope: "all",
    };
    caseTemplates.push({ view, categoryId });
  });

  // --- frame templates ---
  const frameTemplates: FrameTemplateEntry[] = [];
  asArray(data.frameTemplates).forEach((item, i) => {
    const df = displayFields(item, "frameTemplates", i, diags);
    if (!df) return;
    const kind = typeKind(item.type);
    if (kind === "other" && typeof item.type === "string" && item.type.length > 0) {
      diags.push({
        code: "UNSUPPORTED_TEMPLATE_TYPE",
        collection: "frameTemplates",
        sourceIndex: i,
      });
    }
    const categoryId = categoryIdOf(item);
    if (categoryId !== null && !frameCategoryIds.has(categoryId)) {
      diags.push({
        code: "ORPHAN_CATEGORY_REFERENCE",
        collection: "frameTemplates",
        sourceIndex: i,
      });
    }

    let sizeScope: "all" | "restricted" | "unmatched";
    let sizeKeys: readonly string[];
    if (kind === "builtin") {
      sizeScope = "all";
      sizeKeys = [];
    } else {
      const keys = templateSizeKeys(item);
      if (keys.length === 0) {
        sizeScope = "all";
        sizeKeys = [];
      } else if (keys.some((key) => allVisibleSizeKeys.has(key))) {
        sizeScope = "restricted";
        sizeKeys = keys;
      } else {
        sizeScope = "unmatched";
        sizeKeys = keys;
        diags.push({
          code: "UNKNOWN_SIZE_REFERENCE",
          collection: "frameTemplates",
          sourceIndex: i,
        });
      }
    }

    const view: BrowseTemplate = {
      ...df,
      sourceIndex: i,
      kind,
      ...(categoryId !== null ? { categoryId } : {}),
      sizeScope,
    };
    frameTemplates.push({ view, kind, categoryId, sizeKeys, sizeScope });
  });

  return {
    models,
    caseCategories,
    frameCategories,
    frameSizes,
    diagnostics: sortDiagnostics(diags),
    caseTemplates,
    frameTemplates,
    caseCategoryIds,
    frameCategoryIds,
    sizeIdToKeys,
  };
}

const CODE_ORDER: readonly CatalogBrowseDiagnosticCode[] = [
  "RESERVED_CATEGORY_ID",
  "ORPHAN_CATEGORY_REFERENCE",
  "UNSUPPORTED_TEMPLATE_TYPE",
  "UNKNOWN_SIZE_REFERENCE",
  "INVALID_DISPLAY_FIELD",
];

/** Dedupe by (code, collection, sourceIndex) and return a deterministic order. */
function sortDiagnostics(
  diags: readonly CatalogBrowseDiagnostic[],
): readonly CatalogBrowseDiagnostic[] {
  const seen = new Set<string>();
  const unique: CatalogBrowseDiagnostic[] = [];
  for (const d of diags) {
    const key = `${d.code}|${d.collection}|${d.sourceIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(d);
    }
  }
  return unique.sort((a, b) => {
    if (a.collection !== b.collection) return a.collection < b.collection ? -1 : 1;
    if (a.sourceIndex !== b.sourceIndex) return a.sourceIndex - b.sourceIndex;
    return CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code);
  });
}
