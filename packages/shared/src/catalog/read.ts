// Single legacy catalog read boundary (spec 012).
// Pure, deterministic, side-effect free: no Date/random, no fetch/Firebase/storage.
// The input object is never mutated (validated on a JSON-safe clone).

import { cloneJsonSafe, isPlainObject, type JsonObject, type JsonValue } from "./json";
import type {
  CatalogDocumentV1,
  CatalogExtensions,
  CatalogIssue,
  CatalogReadReport,
  CatalogReadResult,
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

/**
 * Known item field allow-lists (evidence: DEF L846-856 + legacy-analysis §4). Extra item
 * fields for these collections are preserved and reported as nested UNKNOWN_FIELD.
 * Collections NOT listed here (caseTemplates, guideBackgrounds, customFonts) have no
 * evidenced item schema, so their items are treated as opaque — only `id` is validated.
 */
const ITEM_KNOWN: Record<string, Set<string>> = {
  models: new Set([
    "id",
    "name",
    "sub",
    "info",
    "w",
    "h",
    "dieline",
    "magsafeDL",
    "printArea",
    "custom",
  ]),
  caseCategories: new Set(["id", "name"]),
  frameCategories: new Set(["id", "name"]),
  frameSizes: new Set([
    "id",
    "name",
    "sub",
    "aspect",
    "custom",
    "clock",
    // spec 032: the operator-authored PHYSICAL size, in centimetres. Print resolution is derived
    // from these and never from a name, label or the logical w/h.
    "printWidthCm",
    "printHeightCm",
    // spec 034: the ONE legacy alias pair the legacy admin actually writes (denn-admin.html:1698).
    // Recognised so it can be normalised (see normalizeLegacyPrintSizeCm) instead of being dropped
    // into UNKNOWN_FIELD. The other legacy cm candidates (wCm/widthCm/cmW/printWcm) and the
    // name/sub/label parsing the legacy consumer did are still FORBIDDEN — spec 032 P-2.
    "wcm",
    "hcm",
  ]),
  frameColors: new Set(["id", "name", "fill", "grain", "custom"]),
  frameTemplates: new Set([
    "id",
    "name",
    "type",
    "dataUrl",
    "storagePath",
    "textZones",
    "zones",
    "photoSlot",
    "categoryId",
    "sizeId",
    "clock",
    "allowColorChange",
    "maskMode",
    "editorOverlayImages",
    "clockEnabled",
    "builtBy",
  ]),
};

/** Known field allow-lists for top-level objects (nested unknowns reported one level deep). */
const OBJECT_KNOWN: Record<string, Set<string>> = {
  brand: new Set(["name", "sub", "kakaoUrl", "msgCase", "acc", "acc2"]),
  clockSettings: new Set(["x", "y", "size", "customImg"]),
  watermark: new Set(["enabled", "dataUrl", "opacity", "position"]),
};

/** frameTemplate.type values seen in the legacy code; others are preserved with a warning. */
const KNOWN_FRAME_TEMPLATE_TYPES = new Set<string>(["builtin", "uploaded"]);

/** A storagePath must be a relative path, never a URL — reject ANY leading URI scheme. */
const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

const isFinitePositive = (n: unknown): boolean =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** True for a parseable `https:` URL string (used to accept migrated download URLs in dataUrl). */
function isHttpsUrlString(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Join a base path with a child segment, avoiding a leading dot at the root (path === ""). */
const joinPath = (base: string, segment: string): string => (base ? `${base}.${segment}` : segment);

/**
 * True for a well-formed Catalog V1 wrapper AND a fully-valid `data`. Beyond the shallow
 * shape (exactly the three keys, schemaVersion 1, migratedFrom "legacy-v0", plain-object
 * data), it reuses `readLegacyCatalog` so the deep contract (collection types, JSON-safety /
 * non-finite, item id/name, unsafe storagePath, …) cannot diverge. No circular call:
 * `readLegacyCatalog` never invokes this guard.
 */
export function isCatalogDocumentV1(input: unknown): input is CatalogDocumentV1 {
  if (!isPlainObject(input)) return false;
  const keys = Object.keys(input);
  if (keys.length !== 3) return false;
  if (!keys.every((k) => k === "schemaVersion" || k === "migratedFrom" || k === "data")) {
    return false;
  }
  if (input.schemaVersion !== 1) return false;
  if (input.migratedFrom !== "legacy-v0") return false;
  if (!isPlainObject(input.data)) return false;
  return readLegacyCatalog(input).ok;
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
  const extensions: CatalogExtensions = {};
  const counts: Record<string, number> = {};
  const imageReferences = { dataUrl: 0, storagePath: 0, dual: 0 };

  let sourceVersion: CatalogReadReport["sourceVersion"] = "legacy-v0";

  const report = (): CatalogReadReport => ({
    sourceVersion,
    defaultsApplied,
    warnings,
    unknownPaths,
    extensions,
    counts,
    imageReferences,
  });
  const fail = (): CatalogReadResult => ({ ok: false, errors: fatals, report: report() });

  const recordUnknown = (path: string, value: JsonValue): void => {
    unknownPaths.push(path);
    extensions[path] = value;
    warnings.push({ code: "UNKNOWN_FIELD", path });
  };

  // 1. Version detection: raw legacy has no schemaVersion; a V1 wrapper has schemaVersion:1.
  let raw: unknown = input;
  if (isPlainObject(input) && "schemaVersion" in input) {
    const sv = input.schemaVersion;
    if (sv === 1) {
      if (input.migratedFrom !== "legacy-v0" || !isPlainObject(input.data)) {
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

  // 3. JSON-safe deep clone (rejects functions / non-plain objects / circular / non-finite).
  const clone = cloneJsonSafe(raw, (issue) => fatals.push(issue));
  if (fatals.length > 0) return fail();
  const catalog = clone as JsonObject;

  // 4. Whole-catalog image aggregation + storage-path safety (any dataUrl/storagePath, any depth).
  collectImages(catalog, "", imageReferences, warnings, fatals);

  // 5. Unknown top-level keys: preserved in place, reported (not dropped).
  for (const key of Object.keys(catalog)) {
    if (!KNOWN_TOP_LEVEL.has(key)) recordUnknown(key, catalog[key]);
  }

  // 6. Nested unknown keys inside known top-level objects (one level; opaque deeper).
  for (const key of Object.keys(OBJECT_KNOWN)) {
    const obj = catalog[key];
    if (!isPlainObject(obj)) continue;
    const known = OBJECT_KNOWN[key];
    for (const sub of Object.keys(obj)) {
      if (!known.has(sub)) recordUnknown(`${key}.${sub}`, obj[sub]);
    }
  }

  // 7. Missing collections → explicit empty default; present-but-wrong-type → fatal.
  for (const key of COLLECTION_KEYS) {
    if (catalog[key] === undefined) {
      catalog[key] = [];
      defaultsApplied.push(key);
    } else if (!Array.isArray(catalog[key])) {
      fatals.push({ code: "COLLECTION_NOT_ARRAY", path: key });
    }
  }

  // 8. Per-collection: id/name/dup, numbers, template type, and nested item unknowns.
  for (const key of COLLECTION_KEYS) {
    const arr = catalog[key];
    if (!Array.isArray(arr)) continue; // already reported as COLLECTION_NOT_ARRAY
    counts[key] = arr.length;
    if (key === "customFonts") continue; // opaque array — no id/name evidence

    const requireName = REQUIRE_NAME.has(key);
    const itemKnown = ITEM_KNOWN[key];
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
      if (key === "frameSizes") {
        validatePositive(item.aspect, `${p}.aspect`, fatals);
        const beforePrintSize = fatals.length;
        validatePrintSizeCm(item, p, fatals);
        // spec 034 N-3: the canonical declaration is judged FIRST and alone. If it is already
        // broken, the legacy alias must not paper over it — the operator has to see which
        // declaration is wrong, not have one silently win.
        if (fatals.length === beforePrintSize) {
          normalizeLegacyPrintSizeCm(item, p, fatals, warnings);
        }
      }
      if (key === "frameTemplates") validateFrameTemplateType(item.type, p, warnings);
      if (itemKnown) {
        for (const sub of Object.keys(item)) {
          if (!itemKnown.has(sub)) recordUnknown(`${p}.${sub}`, item[sub]);
        }
      }
    });
  }

  // 9. Top-level number + revision fields.
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

/**
 * spec 032: the largest physical dimension a print size may declare, in centimetres.
 * Exported since spec 035 so the operator-facing message states the limit by reference instead of
 * re-typing the number.
 */
export const MAX_PRINT_CM = 500;

/** A usable physical dimension: a finite number, greater than 0, at most `MAX_PRINT_CM`. */
const isPrintSizeCm = (value: JsonValue): boolean =>
  isFinitePositive(value) && (value as number) <= MAX_PRINT_CM;

/**
 * Validate the operator-authored physical print size (spec 032).
 *
 * The pair is ALL-OR-NOTHING: a size may declare both `printWidthCm` and `printHeightCm`, or
 * neither. Declaring one alone is a fatal `INVALID_NUMBER`, because a half-specified size would
 * otherwise have to be completed by guessing — and guessing the physical size from a name is
 * exactly the legacy behaviour this field exists to remove.
 *
 * Each value must be finite, greater than 0 and at most 500 cm. Anything else fails CLOSED; nothing
 * is clamped, rounded or inferred, and `aspect` is never consulted to fill a missing side.
 */
function validatePrintSizeCm(
  item: Record<string, JsonValue>,
  path: string,
  fatals: CatalogIssue[],
): void {
  const width = item.printWidthCm;
  const height = item.printHeightCm;
  if (width === undefined && height === undefined) return; // an existing catalog simply has neither

  // one side alone is unusable: report the MISSING side, never invent it
  if (width === undefined) {
    fatals.push({ code: "INVALID_NUMBER", path: `${path}.printWidthCm` });
    return;
  }
  if (height === undefined) {
    fatals.push({ code: "INVALID_NUMBER", path: `${path}.printHeightCm` });
    return;
  }

  if (!isPrintSizeCm(width)) fatals.push({ code: "INVALID_NUMBER", path: `${path}.printWidthCm` });
  if (!isPrintSizeCm(height))
    fatals.push({ code: "INVALID_NUMBER", path: `${path}.printHeightCm` });
}

/**
 * Normalize the ONE legacy physical-size pair (`wcm`/`hcm`) against the canonical pair (spec 034).
 *
 * The legacy admin has been writing `wcm`/`hcm` all along (denn-admin.html:1698), so a size can
 * carry the operator's real measurements in fields this rebuild used to ignore. Two rules, and
 * only these two:
 *
 * - Canonical pair present → the legacy fields may only AGREE. A different value is a fatal
 *   `CONFLICTING_PRINT_SIZE` on the LEGACY path: two contradicting operator declarations cannot be
 *   resolved by code, and no tolerance is allowed (21 vs 21.1 is ~12 px at 300 dpi — a tolerance
 *   constant would just be the size of the print defect it permits).
 * - Canonical pair absent → a complete, in-range legacy pair is PROMOTED, but only into the
 *   already-cloned document. The caller's input is never written back (Founder O-5), and the raw
 *   `wcm`/`hcm` stay in place next to the promoted fields.
 *
 * An unusable legacy value (half a pair, wrong type, out of range) is a WARNING, not a fatal: it is
 * pre-existing operational data, a fatal would take the whole customer catalog down, and skipping
 * the promotion already blocks printing (the projection stays `null`), which is the property that
 * matters. Nothing here reads `aspect`, `sub`, `name` or the logical `w`/`h`.
 */
function normalizeLegacyPrintSizeCm(
  item: Record<string, JsonValue>,
  path: string,
  fatals: CatalogIssue[],
  warnings: CatalogIssue[],
): void {
  // each field is read exactly once: a drifting getter must not return one value to the check and
  // another to the promotion
  const legacyWidth = item.wcm;
  const legacyHeight = item.hcm;
  if (legacyWidth === undefined && legacyHeight === undefined) return;

  const width = item.printWidthCm;
  const height = item.printHeightCm;

  // validatePrintSizeCm already passed, so the canonical pair is either fully valid or fully absent
  if (width !== undefined && height !== undefined) {
    if (legacyWidth !== undefined && legacyWidth !== width) {
      fatals.push({ code: "CONFLICTING_PRINT_SIZE", path: `${path}.wcm` });
    }
    if (legacyHeight !== undefined && legacyHeight !== height) {
      fatals.push({ code: "CONFLICTING_PRINT_SIZE", path: `${path}.hcm` });
    }
    return;
  }

  if (isPrintSizeCm(legacyWidth) && isPrintSizeCm(legacyHeight)) {
    item.printWidthCm = legacyWidth;
    item.printHeightCm = legacyHeight;
    warnings.push({ code: "LEGACY_PRINT_SIZE_NORMALIZED", path: `${path}.wcm` });
    return;
  }

  if (!isPrintSizeCm(legacyWidth)) {
    warnings.push({ code: "LEGACY_PRINT_SIZE_IGNORED", path: `${path}.wcm` });
  }
  if (!isPrintSizeCm(legacyHeight)) {
    warnings.push({ code: "LEGACY_PRINT_SIZE_IGNORED", path: `${path}.hcm` });
  }
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

/**
 * Recursively walk the entire clone; wherever an object has `dataUrl`/`storagePath` string
 * keys, classify and tally them. `dataUrl` must use the `data:` scheme (else INVALID_DATA_URL);
 * `storagePath` must not be a URL — any leading URI scheme is rejected as UNSAFE_STORAGE_PATH.
 */
function collectImages(
  node: JsonValue,
  path: string,
  tally: { dataUrl: number; storagePath: number; dual: number },
  warnings: CatalogIssue[],
  fatals: CatalogIssue[],
): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => {
      collectImages(child, `${path}[${i}]`, tally, warnings, fatals);
    });
    return;
  }
  if (!isPlainObject(node)) return;

  const rawData = node.dataUrl;
  const rawPath = node.storagePath;
  let hasData = false;
  let hasPath = false;

  if (typeof rawData === "string" && rawData.length > 0) {
    // Check a trimmed copy so leading whitespace can't smuggle a non-data scheme;
    // the original value is preserved unchanged in the document.
    const trimmedData = rawData.trimStart();
    // A `data:` value is the pre-migration base64 form. An `https:` value is the legitimate
    // post-migration Firebase download URL written back into dataUrl (denn-admin.html:15098) — it
    // is a valid dataUrl-family reference, NOT an INVALID_DATA_URL (spec 018 §3). Any other string
    // stays an INVALID_DATA_URL warning.
    if (/^data:/i.test(trimmedData) || isHttpsUrlString(trimmedData)) hasData = true;
    else warnings.push({ code: "INVALID_DATA_URL", path: joinPath(path, "dataUrl") });
  }
  if (typeof rawPath === "string" && rawPath.length > 0) {
    // trimStart the check value only (original preserved) so " https://" / "\tjavascript:"
    // can't bypass the scheme guard.
    if (URL_SCHEME_RE.test(rawPath.trimStart())) {
      fatals.push({ code: "UNSAFE_STORAGE_PATH", path: joinPath(path, "storagePath") });
    } else {
      hasPath = true;
    }
  }
  if (hasData && hasPath) tally.dual++;
  else if (hasData) tally.dataUrl++;
  else if (hasPath) tally.storagePath++;

  for (const key of Object.keys(node)) {
    collectImages(node[key], joinPath(path, key), tally, warnings, fatals);
  }
}
