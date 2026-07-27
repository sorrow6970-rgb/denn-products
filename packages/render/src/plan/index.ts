// Public surface of the deterministic preview render-plan contract (spec 020). A render PLAN, not
// a Canvas executor: pure, JSON-safe, no ctx/DOM/image/URL. Image sources are opaque `imageRef`s.
export { buildPreviewRenderPlan } from "./build";
export type {
  CaseImageZone,
  CasePlanInput,
  FramePlanInput,
  HexColor,
  ImageIntrinsicSize,
  PreviewDrawCommand,
  PreviewRenderPlan,
  PreviewRenderPlanInput,
  RenderPlanErrorCode,
  RenderPlanResult,
  StrokeSpec,
  ZoneRect,
} from "./types";
