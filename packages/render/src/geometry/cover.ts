// Cover-fit draw rect + legacy preview pan clamp (spec 019 §3).
// Legacy source: denn-mockup-tool.html:1543-1555 `drawImgT` (preview, single pan-clamp path) and
// :11371-11378 `drawImageT` (print, no clamp). This is the shared core for case and NON-rotated
// frame. Rotation / multi-zone / print pan-scale are intentionally NOT implemented here.
//
// baseScale = max(zone.w/img.w, zone.h/img.h)      -- cover (fill), never letterbox
// drawScale = baseScale * transform.scale
// draw size = image * drawScale
// maxPan    = abs(drawSize - zoneSize) / 2         -- legacy uses abs (kept as-is; §RISK)
// pan       = clamp(transform.x/y, -maxPan, +maxPan)   (only when clampPan)
// draw origin = zone.origin + (zoneSize - drawSize)/2 + pan   (center-anchored)

import { allFinite, clamp, err, isPositive, ok } from "./guards";
import type { CoverDrawResult, GeometryResult, ImageTransform, Rect, Size } from "./types";

export interface CoverDrawInput {
  readonly zone: Rect;
  readonly image: Size;
  readonly transform: ImageTransform;
  /** default true (legacy preview). false = apply the input pan verbatim (no clamp, no pan-scale). */
  readonly clampPan?: boolean;
}

export function computeCoverDrawRect(input: CoverDrawInput): GeometryResult<CoverDrawResult> {
  const { zone, image, transform } = input;
  const clampPan = input.clampPan ?? true;

  if (
    !allFinite([
      zone.x,
      zone.y,
      zone.width,
      zone.height,
      image.width,
      image.height,
      transform.scale,
      transform.x,
      transform.y,
    ])
  ) {
    return err("NON_FINITE_INPUT");
  }
  // zone.x/y and transform.x/y may be finite negatives; sizes must be > 0.
  if (
    !isPositive(zone.width) ||
    !isPositive(zone.height) ||
    !isPositive(image.width) ||
    !isPositive(image.height)
  ) {
    return err("NON_POSITIVE_SIZE");
  }
  if (!isPositive(transform.scale)) return err("NON_POSITIVE_SCALE");

  const baseScale = Math.max(zone.width / image.width, zone.height / image.height);
  const drawScale = baseScale * transform.scale;
  const drawWidth = image.width * drawScale;
  const drawHeight = image.height * drawScale;

  const maxPanX = Math.abs(drawWidth - zone.width) / 2;
  const maxPanY = Math.abs(drawHeight - zone.height) / 2;
  const panX = clampPan ? clamp(transform.x, -maxPanX, maxPanX) : transform.x;
  const panY = clampPan ? clamp(transform.y, -maxPanY, maxPanY) : transform.y;

  const drawX = zone.x + (zone.width - drawWidth) / 2 + panX;
  const drawY = zone.y + (zone.height - drawHeight) / 2 + panY;

  // Finite inputs can still overflow (e.g. MAX_VALUE * scale). A success Result never carries a
  // non-finite number.
  if (
    !allFinite([
      baseScale,
      drawScale,
      drawWidth,
      drawHeight,
      maxPanX,
      maxPanY,
      panX,
      panY,
      drawX,
      drawY,
    ])
  ) {
    return err("NON_FINITE_RESULT");
  }

  return ok({
    drawRect: { x: drawX, y: drawY, width: drawWidth, height: drawHeight },
    baseScale,
    drawScale,
    appliedTransform: { scale: transform.scale, x: panX, y: panY },
    maxPan: { x: maxPanX, y: maxPanY },
  });
}
