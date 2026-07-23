// Single legacy catalog read boundary (spec 012).
// Pure, deterministic, side-effect free: no Date/random, no fetch/Firebase/storage.
// The input object is never mutated (validated on a JSON-safe clone).

import { cloneJsonSafe, isPlainObject, type JsonObject, type JsonValue } from "./json";
import type {
  CatalogDocumentV1,
  CatalogIssue,
  CatalogReadReport,
  CatalogReadResult,
  LegacyImageReference,
} from "./types";

/** Top-level keys recognized by the catalog contract (DEF + legacy-analysis §4). */
const KNOWN_TOP_LEVEL = new Set<string>([
  "brand",
  "models",
  "caseCategories",
  "caseTemplates",
  "frameTemplates",
  "frameCategories",
  "frameSizes",
  "frameColors",
  "frameThickness",
  "clockSettings",
  "customFonts",
  "caseMockup",
  "frameMockup",
  "guideBackgrounds",
  "watermark",
  "roomBackgroundSettings",
  "__opRev",
  "__opRevAt",
  "__cloudRev",
  "__publishedAt",
]);

/** Collections filled with an explicit empty default when absent, and included in counts. */
const COLLECTION_KEYS = [
  "models",
  "caseCategories",
  "caseTemplates",
  "frameCategories",
  "frameTemplates",
  "frameSizes",
  "frameColors",
  "guideBackgrounds",
  "customFonts",
] as const;

/** Collections whose items must carry a string `name` (evidence: DEF instances). */
const REQUIRE_NAME = new Set<string>([
  "models",
  "caseCategories",
  "frameCategories",
  "frameTemplates",
  "frameSizes",
  "frameColors",
]);

/** Collections carrying dataUrl/storagePath image references (evidence: legacy-analysis §4). */
const IMAGE_COLLECTIONS = ["frameTemplates", "caseTemplates", "guideBackgrounds"] as const;

/** frameTemplate.type values seen in the legacy code; others are preserved with a warning. */
const KNOWN_FRAME_TEMPLATE_TYPES = new Set<string>(["builtin", "uploaded"]);

const isFinitePositive = (n: unknown): boolean =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** True for a well-formed Catalog V1 wrapper (shallow — does not deep-validate `data`). */
export function isCatalogDocumentV1(input: unknown): input is CatalogDocumentV1 {
  return (
    isPlainObject(input) &&
    input.schemaVersion === 1 &&
    input.migratedFrom === "legacy-v0" &&
    isPlainObject((input as JsonObject).data)
  );
}

/**
 * Read a legacy `S`/`ADM` catalog (or a Catalog V1 wrapper) into the internal V1 read model.
 * Returns a discriminated Result — it never throws in normal control flow and never returns a
 * default catalog as a success on failure.
 */
export function readLegacyCatalog(input: unknown): CatalogReadResult {
  const fatals: CatalogIssue[] = [];
  const warnings: CatalogIssue[] = [];
  const defaultsApplied: string[] = [];
  const unknownPaths: string[] = [];
  const counts: Record<string, number> = {};
  const imageReferences = { dataUrl: 0, storagePath: 0, dual: 0 };

  let sourceVersion: CatalogReadReport["sourceVersion"] = "legacy-v0";

  const report = (): CatalogReadReport => ({
    sourceVersion,
    defaultsApplied,
    warnings,
    unknownPaths,
    counts,
    imageReferences,
  });
  const fail = (): CatalogReadResult => ({ ok: false, errors: fatals, report: report() });

  // 1. Version detection: raw legacy has no schemaVersion; a V1 wrapper has schemaVersion:1.
  let raw: unknown = input;
  if (isPlainObject(input) && "schemaVersion" in input) {
    const sv = (input as JsonObject).schemaVersion;
    if (sv === 1) {
      if ((input as JsonObject).migratedFrom !== "legacy-v0" || !isPlainObject(input.data)) {
        fatals.push({ code: "MALFORMED_V1_DOCUMENT", path: "" });
        return fail();
      }
      sourceVersion = "catalog-v1";
      raw = input.data;
    } else {
      fatals.push({ code: "UNSUPPORTED_SCHEMA_VERSION", path: "schemaVersion" });
      return fail();
    }
  }

  // 2. Root must be a non-null plain object.
  if (!isPlainObject(raw)) {
    fatals.push({ code: "ROOT_NOT_OBJECT", path: "" });
    return fail();
  }

  // 3. JSON-safe deep clone (rejects functions / non-plain objects / circular refs).
  const clone = cloneJsonSafe(raw, (issue) => fatals.push(issue));
  if (fatals.length > 0) return fail();
  const catalog = clone as JsonObject;

  // 4. Unknown top-level keys: preserved in place, reported (not dropped).
  for (const key of Object.keys(catalog)) {
    if (!KNOWN_TOP_LEVEL.has(key)) {
      unknownPaths.push(key);
      warnings.push({ code: "UNKNOWN_FIELD", path: key });
    }
  }

  // 5. Missing collections → explicit empty default; present-but-wrong-type → fatal.
  for (const key of COLLECTION_KEYS) {
    if (catalog[key] === undefined) {
      catalog[key] = [];
      defaultsApplied.push(key);
    } else if (!Array.isArray(catalog[key])) {
      fatals.push({ code: "COLLECTION_NOT_ARRAY", path: key });
    }
  }

  // 6. Validate id/name/dup and per-collection numeric/image/type rules.
  for (const key of COLLECTION_KEYS) {
    const arr = catalog[key];
    if (!Array.isArray(arr)) continue; // already reported as COLLECTION_NOT_ARRAY
    counts[key] = arr.length;
    if (key === "customFonts") continue; // opaque array — no id/name evidence

    const requireName = REQUIRE_NAME.has(key);
    const isImageCollection = (IMAGE_COLLECTIONS as readonly string[]).includes(key);
    const seen = new Set<string>();

    arr.forEach((item, i) => {
      const p = `${key}[${i}]`;
      if (!isPlainObject(item)) {
        fatals.push({ code: "ITEM_NOT_OBJECT", path: p });
        return;
      }
      validateId(item.id, p, seen, fatals);
      if (requireName) validateName(item.name, p, fatals);
      if (key === "models") {
        validatePositive(item.w, `${p}.w`, fatals);
        validatePositive(item.h, `${p}.h`, fatals);
      }
      if (key === "frameSizes") validatePositive(item.aspect, `${p}.aspect`, fatals);
      if (key === "frameTemplates") validateFrameTemplateType(item.type, p, warnings);
      if (isImageCollection) classifyImage(item, p, imageReferences, warnings, fatals);
    });
  }

  // 7. Top-level number + revision fields.
  if (catalog.frameThickness !== undefined)
    validatePositive(catalog.frameThickness, "frameThickness", fatals);
  validateRevision(catalog.__opRev, "__opRev", warnings);
  validateRevision(catalog.__cloudRev, "__cloudRev", warnings);

  if (fatals.length > 0) return fail();

  const document: CatalogDocumentV1 = {
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: catalog,
  };
  return { ok: true, document, report: report() };
}

function validateId(id: JsonValue, path: string, seen: Set<string>, fatals: CatalogIssue[]): void {
  if (id === undefined) {
    fatals.push({ code: "MISSING_ID", path: `${path}.id` });
  } else if (typeof id !== "string" || id.length === 0) {
    fatals.push({ code: "INVALID_ID", path: `${path}.id` });
  } else if (seen.has(id)) {
    fatals.push({ code: "DUPLICATE_ID", path: `${path}.id` });
  } else {
    seen.add(id);
  }
}

function validateName(name: JsonValue, path: string, fatals: CatalogIssue[]): void {
  if (name === undefined) fatals.push({ code: "MISSING_NAME", path: `${path}.name` });
  else if (typeof name !== "string") fatals.push({ code: "INVALID_NAME", path: `${path}.name` });
}

function validatePositive(value: JsonValue, path: string, fatals: CatalogIssue[]): void {
  if (value === undefined) return;
  if (!isFinitePositive(value)) fatals.push({ code: "INVALID_NUMBER", path });
}

function validateFrameTemplateType(type: JsonValue, path: string, warnings: CatalogIssue[]): void {
  if (type === undefined) return;
  if (typeof type !== "string" || !KNOWN_FRAME_TEMPLATE_TYPES.has(type)) {
    warnings.push({ code: "UNKNOWN_FRAME_TEMPLATE_TYPE", path: `${path}.type` });
  }
}

function validateRevision(value: JsonValue, path: string, warnings: CatalogIssue[]): void {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    warnings.push({ code: "INVALID_REVISION", path });
  }
}

/** Classify an item's dataUrl/storagePath; tally counts; reject unsafe storage path schemes. */
function classifyImage(
  item: JsonObject,
  path: string,
  tally: { dataUrl: number; storagePath: number; dual: number },
  warnings: CatalogIssue[],
  fatals: CatalogIssue[],
): LegacyImageReference {
  const rawData = item.dataUrl;
  const rawPath = item.storagePath;

  let dataUrl: string | undefined;
  if (typeof rawData === "string" && rawData.length > 0) {
    if (/^data:/i.test(rawData)) dataUrl = rawData;
    else warnings.push({ code: "INVALID_DATA_URL", path: `${path}.dataUrl` });
  }

  let storagePath: string | undefined;
  if (typeof rawPath === "string" && rawPath.length > 0) {
    if (/^\s*(javascript|vbscript):/i.test(rawPath)) {
      fatals.push({ code: "UNSAFE_STORAGE_PATH", path: `${path}.storagePath` });
    } else {
      storagePath = rawPath;
    }
  }

  if (dataUrl !== undefined && storagePath !== undefined) {
    tally.dual++;
    return { kind: "dual", dataUrl, storagePath };
  }
  if (dataUrl !== undefined) {
    tally.dataUrl++;
    return { kind: "data-url", dataUrl };
  }
  if (storagePath !== undefined) {
    tally.storagePath++;
    return { kind: "storage-path", storagePath };
  }
  return { kind: "none" };
}
