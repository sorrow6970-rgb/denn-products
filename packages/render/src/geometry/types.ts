// Pure geometry types + Result contract (spec 019). No DOM/Canvas/React/Firebase/IO.
//
// Units are documented, not enforced by the type system:
//  - logical / CSS px : Point, Size, Rect (zones, images, draw rects, logical surface size).
//  - backing px       : the integer BackingSizeResult.backingSize (device pixels).
//  - percent          : PercentRect (0..100 nominal; finite negatives / >100 are allowed, §4).
//
// No brand / product / Firebase types belong here.

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

/** A rect whose x/y/width/height are PERCENT of a container (not logical px). */
export interface PercentRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** User image transform: `x/y` = pan offset (logical px) about the image center; `scale` multiplies the cover base scale. */
export interface ImageTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export type GeometryErrorCode =
  | "NON_FINITE_INPUT"
  // A computed value overflowed to NaN/±Infinity from otherwise-finite inputs (e.g. MAX_VALUE*2,
  // 1/MIN_VALUE). Distinct from NON_FINITE_INPUT so an input error is never confused with an
  // overflow of the math. A success Result NEVER contains a non-finite number.
  | "NON_FINITE_RESULT"
  | "NON_POSITIVE_SIZE"
  | "NON_POSITIVE_SCALE"
  | "NON_POSITIVE_ASPECT"
  | "NON_POSITIVE_DPR";

/** Explicit result — geometry never throws on ordinary bad input. Failure carries only a code. */
export type GeometryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: GeometryErrorCode };

/** Result of the cover-fit computation (§3). All numbers are logical px except the two scales. */
export interface CoverDrawResult {
  readonly drawRect: Rect;
  readonly baseScale: number;
  readonly drawScale: number;
  /** transform after pan clamping (input transform is never mutated). */
  readonly appliedTransform: ImageTransform;
  /** clamp limits: max absolute pan on each axis (0 when the image exactly covers the zone). */
  readonly maxPan: Point;
}

/** Result of the backing-store size computation (§7). */
export interface BackingSizeResult {
  readonly cssSize: Size;
  readonly effectiveDpr: number;
  /** integer device pixels. */
  readonly backingSize: Size;
}
