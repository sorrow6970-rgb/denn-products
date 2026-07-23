// Public surface of the legacy catalog read boundary (spec 012).
// Browse selectors over a validated CatalogDocumentV1 (spec 016).
export * from "./browse";
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
