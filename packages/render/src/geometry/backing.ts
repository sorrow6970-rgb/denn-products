// Backing-store size from a logical CSS size + explicit device DPR + explicit cap (spec 019 §7).
// Precedent: POC useCanvasDpr (poc/platform-compatibility/src/App.tsx:126-128) —
//   dpr = min(deviceDpr, cap); backing = max(1, round(css * dpr)).
// The cap is a REQUIRED input: this function invents no default cap and fixes no product DPR
// policy (2 vs 4 is deferred, §9). It never reads the device DPR itself, sizes a real surface, or
// applies a context transform.
//
// effectiveDpr  = min(deviceDpr, dprCap)
// backingWidth  = max(1, round(cssWidth  * effectiveDpr))
// backingHeight = max(1, round(cssHeight * effectiveDpr))

import { allFinite, err, isPositive, ok } from "./guards";
import type { BackingSizeResult, GeometryResult, Size } from "./types";

export interface BackingSizeInput {
  /** logical size in CSS px. */
  readonly cssSize: Size;
  /** the caller-supplied device pixel ratio; finite > 0. */
  readonly deviceDpr: number;
  /** the caller-supplied DPR cap; finite > 0. NO default — the caller owns the policy. */
  readonly dprCap: number;
}

export function computeBackingStoreSize(
  input: BackingSizeInput,
): GeometryResult<BackingSizeResult> {
  const { cssSize, deviceDpr, dprCap } = input;
  if (!allFinite([cssSize.width, cssSize.height, deviceDpr, dprCap])) {
    return err("NON_FINITE_INPUT");
  }
  if (!isPositive(cssSize.width) || !isPositive(cssSize.height)) return err("NON_POSITIVE_SIZE");
  if (!isPositive(deviceDpr) || !isPositive(dprCap)) return err("NON_POSITIVE_DPR");

  const effectiveDpr = Math.min(deviceDpr, dprCap);
  return ok({
    cssSize: { width: cssSize.width, height: cssSize.height },
    effectiveDpr,
    backingSize: {
      width: Math.max(1, Math.round(cssSize.width * effectiveDpr)),
      height: Math.max(1, Math.round(cssSize.height * effectiveDpr)),
    },
  });
}
