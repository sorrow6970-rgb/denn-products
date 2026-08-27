// Compatibility seam only (spec 082). The executor implementation moved to
// `@denn/render/src/canvas/execute-preview-plan.ts`; this file re-exports that one function so the
// existing callers and unit tests in this app keep working unchanged.
//
// Deliberately NOT re-implemented here: no preflight, no error mapping, no Canvas call. A second
// copy would let the same render plan draw differently in the customer and admin apps, which is
// exactly what the shared boundary exists to prevent.
export { executePreviewRenderPlan } from "@denn/render";
