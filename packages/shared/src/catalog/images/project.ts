// Pure catalog template image projection (spec 018). Separate from the browse selectors (spec 016):
// browse options never carry image/base64/path; this projection is the ONLY place that reads a
// template's image reference, by id, from a validated CatalogDocumentV1.
//
// Fixed legacy invariants (investigation 2026-07-27, cited by file:line):
//  1. The consumer app never turns `storagePath` into an image URL (denn-mockup-tool.html:59 is the
//     only use, a presence count) — storagePath is NOT a projection source here.
//  2. After migration `dataUrl` may hold a `data:` URL OR an HTTPS Firebase download URL
//     (denn-admin.html:15098 writes getDownloadURL's https url into the dataUrl-family field).
//  3. Frame image priority: dataUrl → sourceDataUrl → builderArtDataUrl → artDataUrl → originalDataUrl
//     (denn-mockup-tool.html:3025 `templateSourceForDesign`, :11001 `imageSrc`). Case uses only
//     `dataUrl` (no evidenced hi-res fields — denn-mockup-tool.html:1045/1679).
//  4. `generatedDetailPreview === true` gates the whole chain to "no real art" (mockup:3025, :11001).
//  5. dual (dataUrl + storagePath) consumes only the dataUrl-family; NO storagePath fallback.

import type { CatalogDocumentV1, CatalogItemV1 } from "../types";

export type CatalogTemplateKind = "case" | "frame";

export type CatalogImageProjection =
  | {
      readonly status: "available";
      readonly sourceKind: "data-image" | "https-image";
      readonly value: string;
    }
  | {
      readonly status: "unavailable";
      readonly reason: "none" | "generated-preview" | "invalid-reference";
    };

// Priority chains. Case = dataUrl only; frame = full builder fallback chain (invariant 3).
const CASE_FIELDS = ["dataUrl"] as const;
const FRAME_FIELDS = [
  "dataUrl",
  "sourceDataUrl",
  "builderArtDataUrl",
  "artDataUrl",
  "originalDataUrl",
] as const;

/** Classify a raw field string as a displayable image source, or null (fall through / invalid). */
function classifyImageString(value: string): "data-image" | "https-image" | null {
  if (value.length === 0) return null;
  if (/^data:/i.test(value)) return "data-image";
  // https only. `new URL` rejects relative/blank/malformed; protocol screens http/javascript/blob.
  try {
    if (new URL(value).protocol === "https:") return "https-image";
  } catch {
    return null;
  }
  return null;
}

function findTemplate(
  document: CatalogDocumentV1,
  templateKind: CatalogTemplateKind,
  templateId: string,
): CatalogItemV1 | undefined {
  const collection =
    templateKind === "case" ? document.data.caseTemplates : document.data.frameTemplates;
  if (!Array.isArray(collection)) return undefined;
  return collection.find((item) => item.id === templateId);
}

/**
 * Project a template id (+ kind) to a minimal displayable image reference. Never throws on a
 * missing id, never mutates the input, never returns the raw template object, and never
 * decodes/fetches/clones/re-encodes the image string — `value` is the ONE original string
 * reference. Diagnostics carry no value/URL/base64/path.
 */
export function projectCatalogTemplateImage(
  document: CatalogDocumentV1,
  input: { templateKind: CatalogTemplateKind; templateId: string },
): CatalogImageProjection {
  const item = findTemplate(document, input.templateKind, input.templateId);
  if (!item) return { status: "unavailable", reason: "none" };
  if (item.generatedDetailPreview === true) {
    return { status: "unavailable", reason: "generated-preview" };
  }

  const fields = input.templateKind === "case" ? CASE_FIELDS : FRAME_FIELDS;
  let sawCandidate = false;
  for (const field of fields) {
    const raw = item[field];
    if (typeof raw !== "string" || raw.length === 0) continue;
    sawCandidate = true;
    const sourceKind = classifyImageString(raw);
    if (sourceKind) return { status: "available", sourceKind, value: raw };
  }
  // A field held a non-empty string but none classified → invalid-reference; otherwise none.
  return { status: "unavailable", reason: sawCandidate ? "invalid-reference" : "none" };
}
