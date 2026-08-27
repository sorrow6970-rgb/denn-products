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

export const RENDER_NOT_IMPLEMENTED =
  "the Canvas executor (ctx draw) + print/PNG export are implemented in a later spec (geometry + preview render plan are done)" as const;
