// Deterministic preview render-plan contract (spec 020). Pure, JSON-safe — this is a render PLAN,
// NOT a Canvas executor. No ctx.*, no <canvas>, no image objects. The builder itself synthesizes and
// copies no raw catalog item, decoded image, or source URL/token/storagePath value.
//
// Image sources are opaque `imageRef` keys — a restricted 1..128 char synthetic identifier
// (grammar in build.ts). The grammar rejects URL-shaped/whitespace/control/padded-base64 forms but
// is NOT a secret detector: it cannot tell whether an all-allowed-char value is a token/secret/
// unpadded base64. So callers must not pass a URL/base64/token/secret as an imageRef, and a later
// executor must NOT use imageRef as a URL — only as a lookup key into an in-memory trusted image
// binding map.

import type { GeometryErrorCode, ImageTransform, Rect, Size } from "../geometry";

/** A validated `#RRGGBB` hex color (upper/lowercase). No alpha/functions/url()/vars/named colors. */
export type HexColor = string;

/** Intrinsic (natural) size of the user image, in image pixels. */
export interface ImageIntrinsicSize {
  readonly width: number;
  readonly height: number;
}

/** A zone rect tagged as logical (CSS px) or percent-of-canvas. */
export type ZoneRect =
  | {
      readonly units: "logical";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly units: "percent";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };

/** Optional safe-area / border stroke. Only emitted when the caller supplies it. */
export interface StrokeSpec {
  readonly color: HexColor;
  readonly width: number;
}

export interface CaseImageZone {
  /** stable, non-empty, unique-per-input id (used to build a stable layerId). */
  readonly id: string;
  /** opaque binding key — NOT a URL. A later executor pairs it with a real source. */
  readonly imageRef: string;
  /**
   * intrinsic size of THIS zone's image — required since spec 025. The legacy case editor holds an
   * independent image per zone (`caseImgs[i]`, denn-mockup-tool.html:1662), so one shared intrinsic
   * size would compute a wrong cover rect for any zone whose image has a different aspect.
   */
  readonly image: ImageIntrinsicSize;
  readonly rect: ZoneRect;
  /**
   * transform of THIS zone's image — required since spec 025 (legacy `caseImgTs[i]`,
   * denn-mockup-tool.html:1665). There is no plan-level default to fall back to.
   */
  readonly transform: ImageTransform;
  /**
   * Optional quarter-turn rotation of THIS zone's photo (spec 030). Clockwise, in units of 90°.
   * It sits BESIDE `transform` rather than inside it because `ImageTransform` is the spec 019
   * geometry contract and rotation is not a geometry concern. Absent === 0 === no rotation, and an
   * absent/zero value produces byte-identical commands to a pre-030 plan. Any other value is
   * rejected (INVALID_TRANSFORM) — never clamped, wrapped or defaulted.
   */
  readonly rotationQuarterTurns?: 0 | 1 | 2 | 3;
  /** explicit draw order (ascending); ties broken by original array index. */
  readonly order?: number;
  /** optional safe-area stroke drawn after all zone images. */
  readonly guide?: StrokeSpec;
}

/**
 * Template art layer (spec 028). The legacy tool draws the template's own artwork STRETCHED over a
 * fixed rectangle — the whole case canvas (denn-mockup-tool.html:1679) or the frame's mat rect
 * (:3094) — with no aspect preservation, no crop and no opacity. It is optional: a template without
 * real art (builtin, no source, generated preview) simply has no art layer, which is NOT a failure.
 */
export interface TemplateArtSpec {
  /** opaque binding key — NOT a URL. The source string never reaches a plan. */
  readonly imageRef: string;
  /** exact destination rectangle; must be finite, positive and inside the logical canvas. */
  readonly destRect: Rect;
}

export interface CasePlanInput {
  readonly kind: "case";
  readonly logicalCanvas: Size;
  readonly bodyColor: HexColor;
  /**
   * Every zone owns its own `image` and `transform` (spec 025). The former plan-level `image` and
   * `defaultTransform` are REMOVED — there is no compatibility fallback and no deprecated overload.
   */
  readonly zones: readonly CaseImageZone[];
  /** optional template art, drawn after the zone photos and before the guides (spec 028). */
  readonly templateArt?: TemplateArtSpec;
}

export interface FramePlanInput {
  readonly kind: "frame";
  readonly logicalCanvas: Size;
  /** the whole frame body rectangle. */
  readonly frameRect: Rect;
  /**
   * the mat fill inside the frame band — a SEPARATE required rect since spec 024. The legacy frame
   * paints the mat over the whole area inside the band and only then insets the photo, so sharing
   * one rect with `imageZone` could only produce a plan with no mat ring (evidence:
   * denn-mockup-tool.html:3120-3130). There is no `matRect ?? imageZone` fallback.
   */
  readonly matRect: Rect;
  /** where the user photo is clipped and cover-fitted, inside the mat. */
  readonly imageZone: Rect;
  readonly frameColor: HexColor;
  readonly matColor: HexColor;
  readonly image: ImageIntrinsicSize;
  /** pan/scale only; the quarter-turn rotation is the separate field below (spec 030). */
  readonly transform: ImageTransform;
  /** Optional clockwise quarter-turn rotation of the user photo (spec 030). Absent === 0. */
  readonly rotationQuarterTurns?: 0 | 1 | 2 | 3;
  readonly imageRef: string;
  /**
   * optional inner border stroke; only emitted when supplied. Drawn on `imageZone`. This is NOT
   * equivalent to the legacy 4-band fill, so a product adapter must not supply it until that
   * geometry is decided (spec 024 §2).
   */
  readonly innerBorder?: StrokeSpec;
  /** optional template art, drawn after the user photo and before the inner border (spec 028). */
  readonly templateArt?: TemplateArtSpec;
  /**
   * spec 031: operator-authored text zones already paired with the customer's value. Absent or
   * empty means no text. A zone whose value is `undefined`/`""` emits no command; `"0"` does.
   */
  readonly textZones?: readonly FrameTextZoneInput[];
}

/**
 * One text zone plus the customer's current value (spec 031). The zone style is the OPERATOR's and
 * the value is the CUSTOMER's — the builder never mixes the two, and the operator's placeholder /
 * default text is not part of this input at all (Founder F-3).
 */
export interface FrameTextZoneInput {
  /** the customer's text. `undefined`/`""` = empty; `"0"` is a real value. Never trimmed. */
  readonly value: string | undefined;
  /** percent of the logical canvas. */
  readonly xPercent: number;
  readonly yPercent: number;
  /** wrap width as a percent of the logical WIDTH. NOT a clip. */
  readonly boxWidthPercent: number;
  /** font size as a percent of the logical WIDTH. */
  readonly fontSizePercent: number;
  readonly align: "left" | "center" | "right";
  readonly fontFamily: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly color: HexColor;
  readonly lineHeight: number;
  readonly letterSpacingPercent: number;
  readonly rotationDegrees: number;
  /** integer 1..200 (UTF-16 code units, matching HTML `maxLength`). */
  readonly maxChars: number;
  /** integer 1..5. Wrapping past this rejects the whole plan — it never truncates. */
  readonly maxLines: number;
}

/** What the builder asks the injected port to measure. */
export interface TextMeasureRequest {
  readonly text: string;
  readonly font: PlanFontSpec;
}

/**
 * Synchronous measurement port (spec 031 §2.3). It is INJECTED, never stored in the plan, so the
 * resulting plan stays pure and JSON-safe while the wrap is still decided exactly once.
 * A throwing, non-finite or negative measurement fails the plan closed.
 */
export type TextMeasurePort = (request: TextMeasureRequest) => number;

export interface PreviewRenderPlanOptions {
  /** required as soon as any text zone carries a non-empty value. */
  readonly measureText?: TextMeasurePort;
}

export type PreviewRenderPlanInput = CasePlanInput | FramePlanInput;

/**
 * Minimal draw-command vocabulary. `draw-image-cover` bundles save→clip→drawImage→restore, and —
 * only when a rotation is present — save→clip→translate→rotate→drawImage→restore (spec 030).
 */
export type PreviewDrawCommand =
  | {
      readonly type: "fill-rect";
      readonly layerId: string;
      readonly rect: Rect;
      readonly color: HexColor;
    }
  | {
      readonly type: "draw-image-cover";
      readonly layerId: string;
      readonly imageRef: string;
      readonly clipRect: Rect;
      /**
       * The photo's footprint ON SCREEN, after any rotation. For a quarter turn (1 or 3) the cover
       * fit is computed from the SWAPPED intrinsic size, so this rect is already the rotated
       * silhouette and `maxPan` derived from it is the rotated one (spec 030 §2).
       */
      readonly drawRect: Rect;
      /**
       * Clockwise quarter turns to apply around the centre of `drawRect` (spec 030). The field is
       * EMITTED ONLY when it is non-zero, so an unrotated plan is byte-identical to a pre-030 plan
       * and an existing executor keeps working unchanged.
       */
      readonly rotationQuarterTurns?: 1 | 2 | 3;
    }
  | {
      readonly type: "stroke-rect";
      readonly layerId: string;
      readonly rect: Rect;
      readonly color: HexColor;
      readonly width: number;
    }
  | {
      /**
       * Draw the whole source image into `destRect`, NOT preserving its aspect (spec 028). There is
       * no source rect / crop (no 9-argument drawImage), no opacity, no blend mode and no rotation.
       */
      readonly type: "draw-image-stretch";
      readonly layerId: string;
      readonly imageRef: string;
      readonly destRect: Rect;
    }
  | {
      /**
       * Draw already-wrapped customer text (spec 031). The lines are FINAL: the builder measured
       * and wrapped them through an injected port, so the executor only paints.
       *
       * Deliberately absent: the raw customer string, the zone key, the catalog/template id, the
       * operator's default text, the measurement port, and any clip. `boxWidth` is a wrap width,
       * not a clip, so it does not appear here at all — the lines already honour it.
       */
      readonly type: "draw-text";
      readonly layerId: string;
      readonly lines: readonly PlanTextLine[];
      /** first line's baseline anchor, in logical px, BEFORE the optional rotation. */
      readonly origin: { readonly x: number; readonly y: number };
      readonly align: "left" | "center" | "right";
      readonly font: PlanFontSpec;
      readonly color: HexColor;
      readonly lineHeightPx: number;
      /** extra px between adjacent glyphs; already included in each line's `width`. */
      readonly letterSpacingPx: number;
      /** arbitrary degrees, clockwise around `origin`. Unrelated to the photo quarter turns. */
      readonly rotationDegrees: number;
    };

export interface PreviewRenderPlan {
  readonly kind: "case" | "frame";
  readonly logicalCanvas: Size;
  readonly commands: readonly PreviewDrawCommand[];
}

export type RenderPlanErrorCode =
  | "INVALID_KIND"
  | "INVALID_ID"
  | "INVALID_COLOR"
  | "INVALID_ZONE"
  | "INVALID_TRANSFORM"
  | "GEOMETRY_ERROR"
  | "NON_FINITE_RESULT"
  // spec 031: the zone style or the customer's value is unusable (chars, length, lines, range).
  // The code never carries the offending text, the key or the zone.
  | "INVALID_TEXT"
  // spec 031: the injected measurement port threw, or returned a non-finite/negative width.
  | "TEXT_MEASUREMENT_FAILED";

export type RenderPlanResult =
  | { readonly ok: true; readonly plan: PreviewRenderPlan }
  // `causeCode` (identity-free geometry code) is present only when code === "GEOMETRY_ERROR".
  | {
      readonly ok: false;
      readonly code: RenderPlanErrorCode;
      readonly causeCode?: GeometryErrorCode;
    };

// --- spec 031: deterministic text ---------------------------------------------

/**
 * One already-wrapped line. Wrapping happens ONCE, at plan build time, through an injected
 * measurement port — so the plan stays deterministic and JSON-safe and the executor never re-wraps.
 * `width` is the measured logical width INCLUDING letter spacing.
 */
export interface PlanTextLine {
  readonly text: string;
  readonly width: number;
}

/** Font, as a structure. The executor assembles the CSS string and appends the fallback. */
export interface PlanFontSpec {
  /** validated family, 1..64 code units, no control/quote/semicolon/backslash. */
  readonly family: string;
  readonly sizePx: number;
  readonly weight: "normal" | "bold";
  readonly italic: boolean;
  /** generic fallback appended by the executor; never a remote or custom font. */
  readonly fallback: "sans-serif" | "serif";
}
