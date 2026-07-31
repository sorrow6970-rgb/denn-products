// Catalog preview geometry projection types (spec 023).
//
// Output is render-AGNOSTIC on purpose: `@denn/shared` must not depend on `@denn/render`, so these
// are plain numbers/strings, not spec 020 `CasePlanInput`/`FramePlanInput`. Assembling a
// `PreviewRenderPlan` (with the caller's colours, user image and CSS logical size) is a later app
// layer. Nothing here carries a raw catalog item, product name, selection id, category id, image
// field, URL, base64, token or storagePath.

export type PreviewProjectionCollection =
  | "models"
  | "caseTemplates"
  | "frameSizes"
  | "frameTemplates";

/** Fatal codes. A failure never carries a value, an id, a name or a raw field (spec 023 §2, §3). */
export type PreviewProjectionErrorCode =
  // the document shell or the selection shape is unusable (also covers hostile property reads).
  | "INVALID_INPUT"
  // the required catalog collection is not an array.
  | "INVALID_COLLECTION"
  // exactly-one lookup found no item.
  | "ITEM_NOT_FOUND"
  // exactly-one lookup found more than one item with the same id.
  | "AMBIGUOUS_ITEM"
  // the looked-up item is not a plain object.
  | "INVALID_ITEM"
  // required geometry is missing or not a finite positive/in-range number (no clamp, no fallback).
  | "INVALID_GEOMETRY"
  // a circular / rounded / unknown zone shape that a rectangle cannot represent (never approximated).
  | "UNSUPPORTED_ZONE_SHAPE"
  // a frame template whose image area is not a single full-mat rectangle (multi-zone, text-only, …).
  | "UNSUPPORTED_FRAME_TEMPLATE";

/**
 * Non-fatal notices: an evidenced legacy fallback was taken, or a legacy layer is deliberately
 * omitted from this output. Diagnostics never make an unsupported shape "succeed" (spec 023 §6).
 */
export type PreviewProjectionDiagnosticCode =
  // zones came from the legacy `zones` alias instead of `photoZones`.
  | "LEGACY_ZONES_ALIAS"
  // zones came from the single `photoSlot` fallback.
  | "PHOTO_SLOT_FALLBACK"
  // a mat colour field existed but was not an exact `#RRGGBB`; white fallback was used.
  | "INVALID_MAT_COLOR"
  // the template carries inner-border data; legacy draws 4 filled bands, which is not a stroke.
  | "INNER_BORDER_OMITTED"
  // the legacy mat outline is `rgba(0,0,0,.06)`; an alpha colour is outside the supported contract.
  | "ALPHA_OUTLINE_OMITTED";

export interface PreviewProjectionDiagnostic {
  readonly code: PreviewProjectionDiagnosticCode;
  readonly collection: PreviewProjectionCollection;
  /** 0-based index in the ORIGINAL source array; omitted when there is no such index. */
  readonly sourceIndex?: number;
}

export type PreviewProjectionResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly diagnostics: readonly PreviewProjectionDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly code: PreviewProjectionErrorCode;
      readonly diagnostics: readonly PreviewProjectionDiagnostic[];
    };

/** A zone rectangle in PERCENT of the model logical size (legacy authoring unit). */
export interface PreviewPercentRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CasePreviewZone {
  /** `case-zone-<original source index>` — synthesized, never a catalog value. */
  readonly id: string;
  /** index in the ORIGINAL array, kept even though this output preserves source order. */
  readonly sourceIndex: number;
  readonly percentRect: PreviewPercentRect;
}

export interface CasePreviewGeometry {
  /** `models[].w/h` exactly as stored (logical px); no coercion, abs, clamp or fallback. */
  readonly modelLogicalSize: { readonly width: number; readonly height: number };
  readonly zones: readonly CasePreviewZone[];
}

export interface FramePreviewGeometry {
  /** `frameSizes[].aspect` = H / W, exactly as stored. No pixel size is produced here. */
  readonly aspect: number;
  /** border thickness as a percent of the logical WIDTH (size value first, then top-level). */
  readonly borderPercentOfWidth: number;
  /** canonical uppercase `#RRGGBB`; `#FFFFFF` when the mat is off or has no valid colour. */
  readonly matColor: string;
  /**
   * How far the photo sits inside the mat, in LOGICAL PX (spec 025) — never a ratio, never a source
   * string. `0` for an uploaded template that has a design source (that legacy path draws into the
   * mat rect itself), `8` for the other supported variants (builtin `full`, uploaded without a
   * design source), which the legacy id-dispatch path insets by 8 px on each side.
   */
  readonly contentInsetPx: 0 | 8;
  /**
   * spec 031: operator-authored text zones, normalized and in source order. Empty when the template
   * defines none. A template that defines a duplicate or unknown key fails the whole projection.
   */
  readonly textZones: readonly FrameTextZone[];
  /**
   * spec 031: where the PHYSICAL clock sits on the finished product, or `null` when this template
   * has no clock. Preview-only — never part of the render plan, print or export (Founder F-4).
   */
  readonly clockPreview: FrameClockPreview | null;
}

export interface CasePreviewSelection {
  readonly modelId: string;
  readonly templateId: string;
}

export interface FramePreviewSelection {
  readonly frameSizeId: string;
  readonly templateId: string;
}

// --- spec 031: frame text zones + physical clock preview ----------------------

/** The five customer-editable text keys. The set is closed; anything else is rejected. */
export const FRAME_TEXT_KEYS = ["main", "name", "name2", "date", "sub"] as const;
export type FrameTextKey = (typeof FRAME_TEXT_KEYS)[number];

export type FrameTextAlign = "left" | "center" | "right";

/** Defaults for the two caps the Founder approved (spec 031 §2.2). */
export const FRAME_TEXT_DEFAULT_MAX_CHARS = 80;
export const FRAME_TEXT_DEFAULT_MAX_LINES = 2;

/**
 * One operator-authored text zone, normalized (spec 031 §2.1).
 *
 * Every field is a validated plain value: no raw catalog object, no template id, no source string.
 * Percent fields are relative to the frame's logical canvas, exactly as the legacy authoring UI
 * stored them. `placeholder` comes from the operator's `defaultTexts` and is PLACEHOLDER-ONLY —
 * it must never be copied into an input value or into a plan (F-3).
 */
export interface FrameTextZone {
  readonly key: FrameTextKey;
  /** percent of the logical canvas, 0..100. */
  readonly xPercent: number;
  readonly yPercent: number;
  /** wrap width as a percent of the logical WIDTH, (0..100]. NOT a clip. */
  readonly boxWidthPercent: number;
  /** font size as a percent of the logical WIDTH, (0..100]. */
  readonly fontSizePercent: number;
  readonly align: FrameTextAlign;
  /** 1..64 code units, no control/quote/semicolon/backslash. The executor adds the fallback. */
  readonly fontFamily: string;
  readonly bold: boolean;
  readonly italic: boolean;
  /** canonical uppercase `#RRGGBB`. The operator owns it; the customer cannot change it (F-2). */
  readonly color: string;
  /** line height multiplier, (0..3]. */
  readonly lineHeight: number;
  /** letter spacing as a percent of the font size, [-100..100]. */
  readonly letterSpacingPercent: number;
  /** arbitrary degrees, [-360..360]. Text rotation is unrelated to the photo quarter turns. */
  readonly rotationDegrees: number;
  /** integer 1..200; defaults to 80 UTF-16 code units. */
  readonly maxChars: number;
  /** integer 1..5; defaults to 2. */
  readonly maxLines: number;
  /** operator sample text, shown as a placeholder only. Absent for `name2` and when unset. */
  readonly placeholder?: string;
}

/**
 * The physical clock's position on the product (spec 031 §2.7, Founder F-4).
 *
 * This is NOT artwork: it describes where the real clock hardware sits so the preview can show it.
 * It never reaches the render plan, print or export. `customImage` mirrors the existing catalog
 * media projection shape (`sourceKind` + `value`); resolving it to a usable src stays the app's job.
 */
export interface FrameClockPreview {
  /** percent of the logical canvas. */
  readonly xPercent: number;
  readonly yPercent: number;
  /** size as a percent of `min(width, height)`. */
  readonly sizePercent: number;
  /** operator-uploaded clock photo, when present. `null` means the `HH:MM` text placeholder. */
  readonly customImage: {
    readonly sourceKind: "data-image" | "https-image";
    readonly value: string;
  } | null;
}

/**
 * The operator-authored PHYSICAL size of a frame, in centimetres (spec 032).
 *
 * This is the ONLY source a print resolution may come from. It is never inferred from a size's
 * name, `sub`, `label`, `id` or `aspect`, and never from the logical `w`/`h` — deriving it from a
 * name is what let renaming a size change what got printed in the legacy tool.
 */
export interface FramePrintPhysicalSize {
  readonly widthCm: number;
  readonly heightCm: number;
}
