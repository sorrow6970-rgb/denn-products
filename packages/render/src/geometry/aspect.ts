// Portrait/landscape aspect resolution (spec 019 §6). Aspect is fixed as height / width.
// Legacy source: `sz.aspect = landscape ? 1/base : base` (denn-mockup-tool.html:7211). This only
// flips the aspect number; it does not swap width/height or touch any template transform, and it
// knows nothing about orientation-lock / fullscreen.
//
// portrait  -> portraitAspect
// landscape -> 1 / portraitAspect

import { err, isPositive, ok } from "./guards";
import type { GeometryResult } from "./types";

export type Orientation = "portrait" | "landscape";

export interface OrientedAspectInput {
  /** aspect (height / width) in the portrait orientation; finite > 0. */
  readonly portraitAspect: number;
  readonly orientation: Orientation;
}

export function resolveOrientedAspect(input: OrientedAspectInput): GeometryResult<number> {
  const { portraitAspect, orientation } = input;
  if (!Number.isFinite(portraitAspect)) return err("NON_FINITE_INPUT");
  if (!isPositive(portraitAspect)) return err("NON_POSITIVE_ASPECT");
  return ok(orientation === "landscape" ? 1 / portraitAspect : portraitAspect);
}
