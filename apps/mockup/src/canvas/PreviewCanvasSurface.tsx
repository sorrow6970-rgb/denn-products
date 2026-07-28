// Reusable preview Canvas surface (spec 022 §2, §6). It renders a real <canvas> whose CSS size is
// exactly `plan.logicalCanvas`, runs the spec 021 executor through the surface engine, and exposes
// a safe accessible state. It decides NOTHING about product content: the plan and the drawable
// bindings come from the caller and are never cloned, mutated or disposed here.

import { VisuallyHidden } from "@denn/ui";
import type { PreviewRenderPlan } from "@denn/render";
import "./surface.css";
import type { PreviewImageBindings } from "./types";
import { usePreviewCanvasSurface } from "./usePreviewCanvasSurface";

export interface PreviewCanvasSurfaceProps {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
  readonly accessibleName: string;
  readonly className?: string;
}

// Fixed, general wording — never a code, a command index or an original exception (spec 022 §2).
const MESSAGE = {
  "waiting-for-size": "미리보기를 준비하는 중입니다.",
  ready: "미리보기가 준비되었습니다.",
  failed: "미리보기를 표시할 수 없습니다.",
} as const;

export function PreviewCanvasSurface(props: PreviewCanvasSurfaceProps): React.JSX.Element {
  const name = props.accessibleName.trim();
  // A blank accessible name would leave the canvas unnamed, so no canvas is mounted at all.
  if (name.length === 0) return <SurfaceFailure className={props.className} />;
  return <NamedPreviewCanvasSurface {...props} accessibleName={name} />;
}

function SurfaceFailure({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={["denn-canvas-surface", className].filter(Boolean).join(" ")}>
      <p className="denn-canvas-surface__message" role="status" data-testid="canvas-status">
        {MESSAGE.failed}
      </p>
    </div>
  );
}

function NamedPreviewCanvasSurface({
  plan,
  imageBindings,
  accessibleName,
  className,
}: PreviewCanvasSurfaceProps): React.JSX.Element {
  const { ref, state } = usePreviewCanvasSurface({ plan, imageBindings });
  const { width, height } = plan.logicalCanvas;

  return (
    // tabIndex makes the horizontally scrollable wrapper reachable by keyboard (WCAG 2.1.1); it
    // carries no name of its own so the canvas keeps the single accessible name.
    // biome-ignore lint/a11y/noNoninteractiveTabindex: scroll container must be keyboard reachable
    <div className={["denn-canvas-surface", className].filter(Boolean).join(" ")} tabIndex={0}>
      {/* CSS size == plan.logicalCanvas is the surface invariant; the backing store is set by the
          engine from the OBSERVED size, never from these style values. */}
      <canvas
        ref={ref}
        role="img"
        aria-label={accessibleName}
        className="denn-canvas-surface__canvas"
        style={{ width: `${width}px`, height: `${height}px` }}
        data-testid="preview-canvas"
      />
      {state === "failed" ? (
        <p className="denn-canvas-surface__message" role="status" data-testid="canvas-status">
          {MESSAGE.failed}
        </p>
      ) : (
        // Success/waiting stay out of the visual product UI but remain announced.
        <VisuallyHidden>
          <span role="status" data-testid="canvas-status">
            {MESSAGE[state]}
          </span>
        </VisuallyHidden>
      )}
    </div>
  );
}
