// @denn/render — framework-independent render input/output interfaces + constants, the pure
// geometry contract (spec 019), the deterministic preview render-PLAN contract (spec 020), and
// since spec 082 the Canvas 2D executor for that plan (spec 021). Still NO image load and NO
// print/PNG export — those remain later specs. Direction @denn/render -> @denn/shared is allowed.
import type { Result } from "@denn/shared";

// Pure geometry contract (spec 019): cover-fit, pan clamp, percent rect, client->logical point,
// oriented aspect, backing-store size. Pure math only — see ./geometry.
export * from "./geometry";

// Deterministic preview render-plan contract (spec 020): a pure, JSON-safe plan of draw commands
// (fill/clip-image/stroke) for case/frame previews. NOT a Canvas executor — see ./plan.
export * from "./plan";

// Canvas 2D execution of that plan (spec 021, relocated by spec 082). The context and the decoded
// drawables are injected by the caller; nothing here creates a canvas, an image or a URL.
export * from "./canvas";

export interface RenderInput {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly dpr: number;
}

export interface RenderOutput {
  readonly widthPx: number;
  readonly heightPx: number;
}

export type RenderResult = Result<RenderOutput, "not-implemented">;

/**
 * What is STILL missing from this package: only the generic `RenderInput -> RenderOutput` facade
 * above. The geometry contract, the preview render plan and — since spec 082 — the Canvas 2D
 * executor for that plan are all implemented and exported here; image loading and print/PNG export
 * belong to the apps, not to this package.
 */
export const RENDER_NOT_IMPLEMENTED =
  "the generic RenderInput -> RenderOutput facade is implemented in a later spec (geometry, preview render plan and the Canvas plan executor are done)" as const;
