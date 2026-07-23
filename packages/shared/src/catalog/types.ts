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
  /** Unknown top-level keys, preserved in place. */
  unknownPaths: string[];
  /** Per-collection item counts. */
  counts: Record<string, number>;
  imageReferences: { dataUrl: number; storagePath: number; dual: number };
}

export type CatalogReadResult =
  | { ok: true; document: CatalogDocumentV1; report: CatalogReadReport }
  | { ok: false; errors: CatalogIssue[]; report: CatalogReadReport };
