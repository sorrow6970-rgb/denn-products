// Types for the legacy catalog read boundary (spec 012).
// CatalogV1 is a NEW internal read model — it does NOT imply Firebase persistence or
// operational-write approval. Only fields with legacy evidence are modeled; every other
// value (zone/clock/mockup detail, unknown fields) is preserved opaque and reported.

import type { JsonObject, JsonValue } from "./json";

/** Stable, machine-readable issue codes. `path` never contains raw customer data / base64. */
export type CatalogIssueCode =
  // fatal
  | "ROOT_NOT_OBJECT"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "MALFORMED_V1_DOCUMENT"
  | "NON_JSON_VALUE"
  | "NON_FINITE_NUMBER"
  | "CIRCULAR_REFERENCE"
  | "COLLECTION_NOT_ARRAY"
  | "ITEM_NOT_OBJECT"
  | "MISSING_ID"
  | "INVALID_ID"
  | "MISSING_NAME"
  | "INVALID_NAME"
  | "DUPLICATE_ID"
  | "INVALID_NUMBER"
  | "UNSAFE_STORAGE_PATH"
  // warning
  | "UNKNOWN_FIELD"
  | "UNKNOWN_FRAME_TEMPLATE_TYPE"
  | "INVALID_DATA_URL"
  | "INVALID_REVISION";

export interface CatalogIssue {
  code: CatalogIssueCode;
  /** JSON-ish path to the offending node, e.g. `frameTemplates[2].storagePath`. */
  path: string;
}

/** A catalog collection item. `id` is validated; everything else is preserved opaque. */
export interface CatalogItemV1 {
  id: string;
  [key: string]: JsonValue;
}

/**
 * Known top-level catalog fields (evidence: denn-admin.html `DEF` + legacy-analysis §4).
 * Typed fields are a convenience VIEW; at runtime `data` also preserves any unknown
 * top-level keys in place (reported in `report.unknownPaths`), so nothing is dropped.
 */
export interface CatalogV1 {
  brand?: JsonObject;
  models?: CatalogItemV1[];
  caseCategories?: CatalogItemV1[];
  caseTemplates?: CatalogItemV1[];
  frameTemplates?: CatalogItemV1[];
  frameCategories?: CatalogItemV1[];
  frameSizes?: CatalogItemV1[];
  frameColors?: CatalogItemV1[];
  frameThickness?: number;
  clockSettings?: JsonObject;
  customFonts?: JsonValue[];
  caseMockup?: JsonValue;
  frameMockup?: JsonValue;
  guideBackgrounds?: CatalogItemV1[];
  watermark?: JsonObject;
  /** Legacy flat map, preserved verbatim; NOT converted to roomSettings.operator/user here. */
  roomBackgroundSettings?: JsonObject;
  __opRev?: number;
  __opRevAt?: JsonValue;
  __cloudRev?: number;
  __publishedAt?: JsonValue;
}

export interface CatalogDocumentV1 {
  schemaVersion: 1;
  migratedFrom: "legacy-v0";
  data: CatalogV1;
}

/**
 * Explicit contract for preserved-but-unknown values: a map from the JSON-ish path of
 * each unknown field (top-level or nested inside a known object) to its preserved,
 * JSON-safe value. Nothing is silently dropped; every entry is also listed in
 * `report.unknownPaths` and flagged with an `UNKNOWN_FIELD` warning.
 */
export type CatalogExtensions = Record<string, JsonValue>;

/** Image reference classification. Decoding / MIME / size / CORS are later specs. */
export type LegacyImageReference =
  | { kind: "none" }
  | { kind: "data-url"; dataUrl: string }
  | { kind: "storage-path"; storagePath: string }
  | { kind: "dual"; dataUrl: string; storagePath: string };

export interface CatalogReadReport {
  sourceVersion: "legacy-v0" | "catalog-v1";
  /** Top-level collections that were absent and filled with an explicit empty default. */
  defaultsApplied: string[];
  warnings: CatalogIssue[];
  /** Unknown field paths (top-level and nested), preserved in place. */
  unknownPaths: string[];
  /** Explicit typed container of preserved unknown values, keyed by the same paths. */
  extensions: CatalogExtensions;
  /** Per-collection item counts. */
  counts: Record<string, number>;
  /** Aggregated across the WHOLE catalog (every dataUrl/storagePath, at any depth). */
  imageReferences: { dataUrl: number; storagePath: number; dual: number };
}

export type CatalogReadResult =
  | { ok: true; document: CatalogDocumentV1; report: CatalogReadReport }
  | { ok: false; errors: CatalogIssue[]; report: CatalogReadReport };
