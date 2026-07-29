// Where a template's artwork belongs on the preview canvas (spec 028). Pure and render-agnostic:
// it answers "is there art, and which rectangle does the legacy tool stretch it over", and NEVER
// returns the source string, a field name, a template id or a raw catalog object.
//
// Legacy evidence (denn-mockup-tool.html):
//  - case art is drawn over the WHOLE canvas: `ctx.drawImage(tplImg, 0, 0, W, H)` (:1679), gated by
//    `curCTpl.id !== 'none' && curCTpl.dataUrl` (:1658)
//  - frame art is drawn over the MAT rect: `drawUploadedTemplateOverlay` → `drawImage(ov, IX, IY,
//    IW, IH)` for `designCanvasTemplate` (:3093-3097), reached only for `type === 'uploaded'` with a
//    real source (:3132-3133)
//  - `templateSourceForDesign` / `builderTemplate` / `needsLegacyBuilderCrop` (:3025-3028). A
//    template that needs the legacy crop is NOT supported here: that path measures the artwork's own
//    pixels (`detectLegacyInnerRect`, :3076-3091) with brightness heuristics, which a deterministic
//    plan cannot reproduce — and approximating it with a plain stretch would show a wrong product.

import type { CatalogDocumentV1, CatalogItemV1 } from "../types";
import type { CatalogTemplateKind } from "./project";

export type CatalogTemplateArtPlacement =
  // the template has no real artwork (builtin, no source, generated preview) — NOT a failure
  | { readonly status: "none" }
  // the artwork is stretched over exactly this target rectangle
  | { readonly status: "stretch"; readonly target: "case-canvas" | "frame-mat" }
  // real artwork exists but this spec cannot place it faithfully
  | {
      readonly status: "unsupported";
      readonly reason: "legacy-builder-crop" | "invalid-template";
    };

const NONE: CatalogTemplateArtPlacement = { status: "none" };
const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** Legacy `templateSourceForDesign` (:3025) as a boolean; the string itself never leaves. */
function hasDesignSource(item: CatalogItemV1, fields: readonly string[]): boolean {
  if (item.generatedDetailPreview === true) return false;
  for (const field of fields) {
    if (isNonEmpty(item[field])) return true;
  }
  return false;
}

const CASE_FIELDS = ["dataUrl"] as const;
const FRAME_FIELDS = [
  "dataUrl",
  "sourceDataUrl",
  "builderArtDataUrl",
  "artDataUrl",
  "originalDataUrl",
] as const;

/** Legacy `builderTemplate` (:3027) — uploaded + real source + a builder marker. */
function isBuilderTemplate(item: CatalogItemV1): boolean {
  if (item.type !== "uploaded") return false;
  if (!hasDesignSource(item, FRAME_FIELDS)) return false;
  return (
    item.builtBy === "builder" ||
    item.exportVersion === "clean-inner-v1" ||
    item.overlayScope === "inner"
  );
}

/** Legacy `needsLegacyBuilderCrop` (:3028) — the pixel-scan crop path. */
function needsLegacyBuilderCrop(item: CatalogItemV1): boolean {
  if (!isBuilderTemplate(item)) return false;
  return !(item.overlayScope === "inner" && item.frameBaked === false);
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Decide where (if anywhere) a template's artwork is drawn. Never throws — a hostile getter, a Proxy
 * trap or a revoked Proxy closes as `unsupported: invalid-template`, which the caller treats
 * fail-closed. The result carries no value, id, field name or diagnostic code.
 */
export function projectCatalogTemplateArtPlacement(
  document: CatalogDocumentV1,
  input: { templateKind: CatalogTemplateKind; templateId: string },
): CatalogTemplateArtPlacement {
  try {
    const kind = input?.templateKind;
    const templateId = input?.templateId;
    if ((kind !== "case" && kind !== "frame") || !isNonEmpty(templateId)) {
      return { status: "unsupported", reason: "invalid-template" };
    }
    const data: unknown = document?.data;
    if (!isPlainObject(data)) return { status: "unsupported", reason: "invalid-template" };
    const collection: unknown = kind === "case" ? data.caseTemplates : data.frameTemplates;
    if (!Array.isArray(collection)) return { status: "unsupported", reason: "invalid-template" };

    const item = (collection as readonly unknown[]).find(
      (candidate) => isPlainObject(candidate) && candidate.id === templateId,
    );
    if (!isPlainObject(item)) return { status: "unsupported", reason: "invalid-template" };
    const template = item as CatalogItemV1;

    if (kind === "case") {
      return hasDesignSource(template, CASE_FIELDS)
        ? { status: "stretch", target: "case-canvas" }
        : NONE;
    }

    // frame: only uploaded templates carry artwork; builtin ones are drawn from slots + text
    if (template.type !== "uploaded") return NONE;
    if (!hasDesignSource(template, FRAME_FIELDS)) return NONE;
    if (needsLegacyBuilderCrop(template)) {
      return { status: "unsupported", reason: "legacy-builder-crop" };
    }
    return { status: "stretch", target: "frame-mat" };
  } catch {
    return { status: "unsupported", reason: "invalid-template" };
  }
}
