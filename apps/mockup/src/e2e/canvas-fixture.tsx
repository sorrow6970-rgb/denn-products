// E2E-ONLY harness for the preview Canvas surface (spec 022 §7). This module is NOT part of the
// customer app: it is reachable only through its own HTML entry (`/e2e-canvas-fixture.html`), the
// customer entry (`/index.html`) never imports it, links to it or branches on it, and it renders no
// product UI, no catalog data and no navigation back into the app.
//
// Everything it draws is synthetic and in-memory: fixed hex colours and a drawable painted into an
// offscreen <canvas> in this same document. No URL, token, base64, storagePath, Firebase source or
// real product image is used, so the spec 018 trust boundary and the spec 021 executor contract are
// untouched.

import type { PreviewRenderPlan } from "@denn/render";
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import type { PreviewImageBindings } from "../canvas/types";

const BODY_COLOR = "#112233";
const STROKE_COLOR = "#FF0000";
const DRAWABLE_COLOR = "#00FF00";
const ALT_BODY_COLOR = "#0000FF";

/** Synthetic same-origin drawable: a small offscreen canvas filled with one flat colour. */
function createDrawable(): CanvasImageSource {
  const source = document.createElement("canvas");
  source.width = 10;
  source.height = 10;
  const context = source.getContext("2d");
  if (context) {
    context.fillStyle = DRAWABLE_COLOR;
    context.fillRect(0, 0, source.width, source.height);
  }
  return source;
}

const PLAN_A = (): PreviewRenderPlan => ({
  kind: "case",
  logicalCanvas: { width: 300, height: 200 },
  commands: [
    {
      type: "fill-rect",
      layerId: "fixture:body",
      rect: { x: 0, y: 0, width: 300, height: 200 },
      color: BODY_COLOR,
    },
    {
      // clip is smaller than the draw rect, so the pixels outside the clip must stay body-coloured
      type: "draw-image-cover",
      layerId: "fixture:image",
      imageRef: "fixtureDrawable",
      clipRect: { x: 20, y: 20, width: 100, height: 60 },
      drawRect: { x: 0, y: 0, width: 200, height: 160 },
    },
    {
      type: "stroke-rect",
      layerId: "fixture:stroke",
      rect: { x: 200, y: 120, width: 60, height: 40 },
      color: STROKE_COLOR,
      width: 8,
    },
  ],
});

const PLAN_B = (): PreviewRenderPlan => ({
  kind: "case",
  logicalCanvas: { width: 180, height: 120 },
  commands: [
    {
      type: "fill-rect",
      layerId: "fixture:body",
      rect: { x: 0, y: 0, width: 180, height: 120 },
      color: ALT_BODY_COLOR,
    },
  ],
});

function Fixture(): React.JSX.Element {
  const [planKey, setPlanKey] = useState<"a" | "b">("a");
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(true);

  const plan = useMemo(() => (planKey === "a" ? PLAN_A() : PLAN_B()), [planKey]);
  const imageBindings = useMemo<PreviewImageBindings>(
    () => new Map<string, CanvasImageSource>([["fixtureDrawable", createDrawable()]]),
    [],
  );

  return (
    <main style={{ padding: 12 }}>
      <h1 style={{ fontSize: 16 }}>E2E canvas fixture (not a product screen)</h1>
      {/* No layout style words here on purpose: Tailwind's source scan would turn them into
          utility candidates and change the CUSTOMER stylesheet (spec 021 kept it byte-identical). */}
      <div style={{ marginBottom: 12 }}>
        <button type="button" data-testid="fx-plan-a" onClick={() => setPlanKey("a")}>
          plan A
        </button>
        <button type="button" data-testid="fx-plan-b" onClick={() => setPlanKey("b")}>
          plan B
        </button>
        <button type="button" data-testid="fx-hide" onClick={() => setHidden(true)}>
          hide
        </button>
        <button type="button" data-testid="fx-show" onClick={() => setHidden(false)}>
          show
        </button>
        <button type="button" data-testid="fx-unmount" onClick={() => setMounted(false)}>
          unmount
        </button>
        <button type="button" data-testid="fx-mount" onClick={() => setMounted(true)}>
          mount
        </button>
      </div>
      <div data-testid="fx-host" style={hidden ? { display: "none" } : undefined}>
        {mounted ? (
          <PreviewCanvasSurface
            plan={plan}
            imageBindings={imageBindings}
            accessibleName="합성 미리보기"
          />
        ) : null}
      </div>
      <p data-testid="fx-colors" style={{ fontSize: 12 }}>
        {`${BODY_COLOR}|${STROKE_COLOR}|${DRAWABLE_COLOR}|${ALT_BODY_COLOR}`}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Fixture />
    </StrictMode>,
  );
}
