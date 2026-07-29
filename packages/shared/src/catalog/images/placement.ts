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

const FRAME_FIELDS = [
  "dataUrl",
  "sourceDataUrl",
  "builderArtDataUrl",
  "artDataUrl",
  "originalDataUrl",
] as const;

/**
 * Every field this decision uses, read EXACTLY once (spec 028 보완 라운드 1).
 *
 * Reading the source chain and the builder markers more than once would let a drifting getter show
 * a legacy-crop variant to one check and hide it from the next, which would fail OPEN into a plain
 * `stretch`. Only booleans/comparisons are kept — no source string ever leaves this snapshot.
 */
interface TemplateSnapshot {
  readonly isUploaded: boolean;
  readonly hasCaseSource: boolean;
  readonly hasFrameSource: boolean;
  readonly isBuilderMarked: boolean;
  readonly isInnerOverlay: boolean;
  readonly isFrameBakedFalse: boolean;
}

function readTemplateOnce(item: CatalogItemV1): TemplateSnapshot {
  const generated = item.generatedDetailPreview === true;
  // the five legacy source fields, each read once; `dataUrl` also answers the case chain
  const sources = FRAME_FIELDS.map((field) => isNonEmpty(item[field]));
  const builtBy = item.builtBy;
  const exportVersion = item.exportVersion;
  const overlayScope = item.overlayScope;
  const frameBaked = item.frameBaked;
  return {
    isUploaded: item.type === "uploaded",
    // legacy `templateSourceForDesign` (:3025): the generated-preview gate wins over every field
    hasCaseSource: !generated && sources[0],
    hasFrameSource: !generated && sources.some((present) => present),
    isBuilderMarked:
      builtBy === "builder" || exportVersion === "clean-inner-v1" || overlayScope === "inner",
    isInnerOverlay: overlayScope === "inner",
    isFrameBakedFalse: frameBaked === false,
  };
}

/** Legacy `needsLegacyBuilderCrop` (:3028), evaluated on the snapshot only. */
function needsLegacyBuilderCrop(snapshot: TemplateSnapshot): boolean {
  // legacy `builderTemplate` (:3027) = uploaded + real source + a builder marker
  if (!snapshot.isUploaded || !snapshot.hasFrameSource || !snapshot.isBuilderMarked) return false;
  return !(snapshot.isInnerOverlay && snapshot.isFrameBakedFalse);
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
    // one read of every used field; nothing below touches the caller's template again
    const snapshot = readTemplateOnce(item as CatalogItemV1);

    if (kind === "case") {
      return snapshot.hasCaseSource ? { status: "stretch", target: "case-canvas" } : NONE;
    }

    // frame: only uploaded templates carry artwork; builtin ones are drawn from slots + text
    if (!snapshot.isUploaded) return NONE;
    if (!snapshot.hasFrameSource) return NONE;
    if (needsLegacyBuilderCrop(snapshot)) {
      return { status: "unsupported", reason: "legacy-builder-crop" };
    }
    return { status: "stretch", target: "frame-mat" };
  } catch {
    return { status: "unsupported", reason: "invalid-template" };
  }
}
