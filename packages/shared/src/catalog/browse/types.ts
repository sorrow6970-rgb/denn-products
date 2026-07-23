// Public browse view model + diagnostics (spec 016 §3, §11).
// Output carries only the minimal UI fields (id/label/description/aspect/kind/scope) — never raw
// items, unknown fields, image values, base64, zones, or full paths.

export interface BrowseOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly sourceIndex: number;
}

export interface BrowseCategory extends BrowseOption {
  readonly kind: "all" | "builtin" | "catalog";
}

export interface BrowseSize extends BrowseOption {
  readonly aspect?: number;
}

export interface BrowseTemplate extends BrowseOption {
  readonly kind: "builtin" | "uploaded" | "other";
  readonly categoryId?: string;
  readonly sizeScope: "all" | "restricted" | "unmatched";
}

export type CatalogBrowseDiagnosticCode =
  | "RESERVED_CATEGORY_ID"
  | "ORPHAN_CATEGORY_REFERENCE"
  | "UNSUPPORTED_TEMPLATE_TYPE"
  | "UNKNOWN_SIZE_REFERENCE"
  | "INVALID_DISPLAY_FIELD";

export interface CatalogBrowseDiagnostic {
  readonly code: CatalogBrowseDiagnosticCode;
  readonly collection: string;
  readonly sourceIndex: number;
}

/** @internal frame template entry (view + filter metadata; not part of the public output). */
export interface FrameTemplateEntry {
  readonly view: BrowseTemplate;
  readonly kind: "builtin" | "uploaded" | "other";
  readonly categoryId: string | null;
  readonly sizeKeys: readonly string[];
  readonly sizeScope: "all" | "restricted" | "unmatched";
}

/** @internal case template entry. */
export interface CaseTemplateEntry {
  readonly view: BrowseTemplate;
  readonly categoryId: string | null;
}

/**
 * Precomputed browse index. The array fields are the public options; the remaining fields are
 * internal lookup structures used by the selectors (they hold only normalized keys/ids and view
 * objects — never raw source items, images, or base64).
 */
export interface CatalogBrowseIndex {
  readonly models: readonly BrowseOption[];
  readonly caseCategories: readonly BrowseCategory[];
  readonly frameCategories: readonly BrowseCategory[];
  readonly frameSizes: readonly BrowseSize[];
  readonly diagnostics: readonly CatalogBrowseDiagnostic[];
  /** @internal */ readonly caseTemplates: readonly CaseTemplateEntry[];
  /** @internal */ readonly frameTemplates: readonly FrameTemplateEntry[];
  /** @internal */ readonly caseCategoryIds: ReadonlySet<string>;
  /** @internal */ readonly frameCategoryIds: ReadonlySet<string>;
  /** @internal */ readonly sizeIdToKeys: ReadonlyMap<string, ReadonlySet<string>>;
}
