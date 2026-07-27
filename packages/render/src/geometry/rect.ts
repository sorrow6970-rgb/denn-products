// Percent zone → logical rect (spec 019 §4).
// Legacy source: case zone `zx=zone.x/100*W …` (denn-mockup-tool.html:1664) and frame uploaded
// zone `x=IX+z.x/100*IW …` (:3074). The caller chooses the container: full logical surface for
// case, or the frame inner rect (IX/IY/IW/IH) for frame. No kind branching, no new clamp here.
//
// x = container.x + percent.x/100 * container.width
// y = container.y + percent.y/100 * container.height
// width  = percent.width /100 * container.width
// height = percent.height/100 * container.height

import { allFinite, err, isPositive, ok } from "./guards";
import type { GeometryResult, PercentRect, Rect } from "./types";

export function percentRectToLogical(container: Rect, percent: PercentRect): GeometryResult<Rect> {
  if (
    !allFinite([
      container.x,
      container.y,
      container.width,
      container.height,
      percent.x,
      percent.y,
      percent.width,
      percent.height,
    ])
  ) {
    return err("NON_FINITE_INPUT");
  }
  // percent.x/y may be finite negative or > 100 (no clamp). Sizes must be > 0.
  if (
    !isPositive(container.width) ||
    !isPositive(container.height) ||
    !isPositive(percent.width) ||
    !isPositive(percent.height)
  ) {
    return err("NON_POSITIVE_SIZE");
  }

  return ok({
    x: container.x + (percent.x / 100) * container.width,
    y: container.y + (percent.y / 100) * container.height,
    width: (percent.width / 100) * container.width,
    height: (percent.height / 100) * container.height,
  });
}
