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
  readonly rect: ZoneRect;
  /** zone-specific transform; falls back to CasePlanInput.defaultTransform when absent. */
  readonly transform?: ImageTransform;
  /** explicit draw order (ascending); ties broken by original array index. */
  readonly order?: number;
  /** optional safe-area stroke drawn after all zone images. */
  readonly guide?: StrokeSpec;
}

export interface CasePlanInput {
  readonly kind: "case";
  readonly logicalCanvas: Size;
  readonly bodyColor: HexColor;
  /** shared intrinsic image size used by every zone's cover math. */
  readonly image: ImageIntrinsicSize;
  readonly defaultTransform: ImageTransform;
  readonly zones: readonly CaseImageZone[];
}

export interface FramePlanInput {
  readonly kind: "frame";
  readonly logicalCanvas: Size;
  readonly frameRect: Rect;
  readonly imageZone: Rect;
  readonly frameColor: HexColor;
  readonly matColor: HexColor;
  readonly image: ImageIntrinsicSize;
  /** single, NON-rotated transform (no rotation field in this spec). */
  readonly transform: ImageTransform;
  readonly imageRef: string;
  /** optional inner border stroke; only emitted when supplied. */
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
