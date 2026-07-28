// Public surface of the legacy catalog read boundary (spec 012).
// Browse selectors over a validated CatalogDocumentV1 (spec 016).
// Template image projection over a validated CatalogDocumentV1 (spec 018).
// Preview geometry projection over a validated CatalogDocumentV1 (spec 023).
export * from "./browse";
export * from "./images";
export * from "./preview";
export type { JsonObject, JsonPrimitive, JsonValue } from "./json";
export { isPlainObject } from "./json";
export { isCatalogDocumentV1, readLegacyCatalog } from "./read";
export type {
  CatalogDocumentV1,
  CatalogExtensions,
  CatalogIssue,
  CatalogIssueCode,
  CatalogItemV1,
  CatalogReadReport,
  CatalogReadResult,
  CatalogV1,
  LegacyImageReference,
} from "./types";
