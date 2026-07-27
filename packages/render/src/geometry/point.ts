// Client/CSS point → logical surface point (spec 019 §5).
// Legacy source: `cPos` (denn-mockup-tool.html:1535) mapped client px to canvas.width; there the
// backing store equalled the logical size (no DPR). Here we take `logicalSize` explicitly so the
// mapping stays in CSS/logical px and NEVER uses backing pixels or DPR — DPR only affects the
// backing store, not pointer logic.
//
// x = (client.x - clientRect.x) * logicalSize.width  / clientRect.width
// y = (client.y - clientRect.y) * logicalSize.height / clientRect.height

import { allFinite, err, isPositive, ok } from "./guards";
import type { GeometryResult, Point, Rect, Size } from "./types";

export interface ClientPointInput {
  /** the pointer position in client/CSS px. */
  readonly client: Point;
  /** the surface's bounding rect in client/CSS px. */
  readonly clientRect: Rect;
  /** the surface's logical (CSS) size — NOT its backing size. */
  readonly logicalSize: Size;
}

export function clientPointToLogical(input: ClientPointInput): GeometryResult<Point> {
  const { client, clientRect, logicalSize } = input;
  if (
    !allFinite([
      client.x,
      client.y,
      clientRect.x,
      clientRect.y,
      clientRect.width,
      clientRect.height,
      logicalSize.width,
      logicalSize.height,
    ])
  ) {
    return err("NON_FINITE_INPUT");
  }
  // client/rect origins may be negative; the divisor sizes must be > 0. Out-of-rect points are not clamped.
  if (
    !isPositive(clientRect.width) ||
    !isPositive(clientRect.height) ||
    !isPositive(logicalSize.width) ||
    !isPositive(logicalSize.height)
  ) {
    return err("NON_POSITIVE_SIZE");
  }

  const x = ((client.x - clientRect.x) * logicalSize.width) / clientRect.width;
  const y = ((client.y - clientRect.y) * logicalSize.height) / clientRect.height;
  // Finite inputs can overflow (e.g. huge client delta × huge logical size). Never return non-finite.
  if (!allFinite([x, y])) return err("NON_FINITE_RESULT");
  return ok({ x, y });
}
