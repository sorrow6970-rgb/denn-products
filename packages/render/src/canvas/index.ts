// Public surface of the Canvas 2D plan executor (spec 021, moved here by spec 082).
//
// This is the framework-independent execution half of the render engine: `./plan` produces a pure,
// JSON-safe plan and this executes it against a context the CALLER injects. It creates no canvas,
// no context, no image and no URL, so living in a shared package widens nothing.
export { executePreviewRenderPlan } from "./execute-preview-plan";
export type {
  CanvasExecutionErrorCode,
  CanvasExecutionResult,
  ExecutePreviewRenderPlanArgs,
  PreviewCanvasContext,
  PreviewImageBindings,
  RotationCapableCanvasContext,
  TextCapableCanvasContext,
} from "./types";
