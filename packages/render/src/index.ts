// @denn/render — framework-independent render input/output interfaces + constants only.
// NO Canvas implementation, NO image load, NO print/PNG export. Real rendering is a later spec.
// Direction @denn/render -> @denn/shared is allowed.
import type { Result } from "@denn/shared";

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
