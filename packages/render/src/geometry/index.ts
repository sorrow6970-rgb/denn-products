// Public surface of the pure geometry contract (spec 019). Six pure functions + their types.
// No DOM/Canvas/React/Firebase/IO. Guards are internal and NOT re-exported.
export { computeCoverDrawRect } from "./cover";
export type { CoverDrawInput } from "./cover";
export { percentRectToLogical } from "./rect";
export { clientPointToLogical } from "./point";
export type { ClientPointInput } from "./point";
export { resolveOrientedAspect } from "./aspect";
export type { Orientation, OrientedAspectInput } from "./aspect";
export { computeBackingStoreSize } from "./backing";
export type { BackingSizeInput } from "./backing";
export type {
  BackingSizeResult,
  CoverDrawResult,
  GeometryErrorCode,
  GeometryResult,
  ImageTransform,
  PercentRect,
  Point,
  Rect,
  Size,
} from "./types";
