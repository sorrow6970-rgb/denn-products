// Public surface of the catalog preview geometry projection (spec 023). Render-agnostic on purpose:
// `@denn/shared` returns plain geometry, and the spec 020 plan assembly stays in a later app layer.
export { projectCasePreviewGeometry, projectFramePreviewGeometry } from "./project";
export type {
  CasePreviewGeometry,
  CasePreviewSelection,
  CasePreviewZone,
  FramePreviewGeometry,
  FramePreviewSelection,
  PreviewPercentRect,
  PreviewProjectionCollection,
  PreviewProjectionDiagnostic,
  PreviewProjectionDiagnosticCode,
  PreviewProjectionErrorCode,
  PreviewProjectionResult,
} from "./types";
