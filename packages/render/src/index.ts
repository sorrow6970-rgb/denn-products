// @denn/render — framework-independent render input/output interfaces + constants, plus the pure
// geometry contract (spec 019). NO Canvas implementation, NO image load, NO print/PNG export — the
// real renderer is still a later spec. Direction @denn/render -> @denn/shared is allowed.
import type { Result } from "@denn/shared";

// Pure geometry contract (spec 019): cover-fit, pan clamp, percent rect, client->logical point,
// oriented aspect, backing-store size. Pure math only — see ./geometry.
export * from "./geometry";

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
  "canvas render math + print export are implemented in a later spec" as const;
