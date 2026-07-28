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
  /** explicit draw order (ascending); ties broken by original array index. */
  readonly order?: number;
  /** optional safe-area stroke drawn after all zone images. */
  readonly guide?: StrokeSpec;
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
  /** single, NON-rotated transform (no rotation field in this spec). */
  readonly transform: ImageTransform;
  readonly imageRef: string;
  /**
   * optional inner border stroke; only emitted when supplied. Drawn on `imageZone`. This is NOT
   * equivalent to the legacy 4-band fill, so a product adapter must not supply it until that
   * geometry is decided (spec 024 §2).
   */
  readonly innerBorder?: StrokeSpec;
}

export type PreviewRenderPlanInput = CasePlanInput | FramePlanInput;

/** Minimal draw-command vocabulary. `draw-image-cover` bundles save→clip→drawImage→restore. */
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
      readonly drawRect: Rect;
    }
  | {
      readonly type: "stroke-rect";
      readonly layerId: string;
      readonly rect: Rect;
      readonly color: HexColor;
      readonly width: number;
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
  | "NON_FINITE_RESULT";

export type RenderPlanResult =
  | { readonly ok: true; readonly plan: PreviewRenderPlan }
  // `causeCode` (identity-free geometry code) is present only when code === "GEOMETRY_ERROR".
  | {
      readonly ok: false;
      readonly code: RenderPlanErrorCode;
      readonly causeCode?: GeometryErrorCode;
    };
