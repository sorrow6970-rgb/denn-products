// Compatibility seam only (spec 082). The Canvas plan-executor boundary types moved to
// `@denn/render/src/canvas/types.ts` so the admin app can share one executor contract instead of
// importing across app boundaries or keeping a second copy that could drift.
//
// Nothing is declared here on purpose: every existing `./types` import inside this app keeps
// resolving to the SAME types the shared package owns.
export type {
  CanvasExecutionErrorCode,
  CanvasExecutionResult,
  ExecutePreviewRenderPlanArgs,
  PreviewCanvasContext,
  PreviewImageBindings,
  RotationCapableCanvasContext,
  TextCapableCanvasContext,
} from "@denn/render";
