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
import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RoomBackgroundFileFixture } from "./room-background-file-fixture";
import "@denn/ui/theme.css";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import type { PreviewImageBindings } from "../canvas/types";
import { useLocalImageBinding } from "../canvas/useLocalImageBinding";
import { executePreviewRenderPlan } from "../canvas/executePreviewPlan";
import {
  createFrameSnapshotCapturer,
  type FrameSnapshotLease,
} from "../room-placement/frame-snapshot";

const BODY_COLOR = "#112233";
const STROKE_COLOR = "#FF0000";
const DRAWABLE_COLOR = "#00FF00";
const ALT_BODY_COLOR = "#0000FF";
// spec 024: frame band / mat area / photo must be three visually distinct areas
const FRAME_COLOR = "#663300";
const MAT_COLOR = "#FFFF00";

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

/**
 * Frame plan with three DISTINCT rects: frameRect > matRect > imageZone (spec 024 §7).
 *
 * Written as a literal plan, exactly like the case plans above, so this harness stays free of the
 * spec 020 INPUT field names. Tailwind's source scan reads every word in this file as a utility
 * candidate, and words that happen to match Tailwind utilities end up in the CUSTOMER stylesheet;
 * the builder import pulled two such words in. The mapping from a plan input to these very commands
 * is pinned by the plan unit tests instead (`packages/render/src/plan/build.test.ts`).
 *
 * cover math for the numbers below: a 10x10 drawable into a 180x100 zone scales by max(18,10)=18,
 * so the drawn box is 180x180 centred on the zone -> y = 50 + (100 - 180) / 2 = 10.
 */
const PLAN_FRAME = (): PreviewRenderPlan => ({
  kind: "frame",
  logicalCanvas: { width: 300, height: 200 },
  commands: [
    {
      type: "fill-rect",
      layerId: "frame:body",
      rect: { x: 0, y: 0, width: 300, height: 200 },
      color: FRAME_COLOR,
    },
    {
      type: "fill-rect",
      layerId: "frame:mat",
      rect: { x: 20, y: 20, width: 260, height: 160 },
      color: MAT_COLOR,
    },
    {
      type: "draw-image-cover",
      layerId: "frame:user-image",
      imageRef: "fixtureDrawable",
      clipRect: { x: 60, y: 50, width: 180, height: 100 },
      drawRect: { x: 60, y: 10, width: 180, height: 180 },
    },
  ],
});

/**
 * Plan for a picked LOCAL image (spec 026). `imageRef` is the synthetic key the binding owner
 * created — never a file name, never a url. The clip is smaller than the draw rect, so the pixels
 * outside it must stay body-coloured even when a real decoded photo is bound.
 */
const PLAN_USER = (imageRef: string): PreviewRenderPlan => ({
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
      type: "draw-image-cover",
      layerId: "fixture:user",
      imageRef,
      clipRect: { x: 20, y: 20, width: 100, height: 60 },
      drawRect: { x: 0, y: 0, width: 200, height: 160 },
    },
  ],
});

/**
 * The component that OWNS `useLocalImageBinding` (spec 026 보완 라운드 1). It is mounted and
 * unmounted as a whole by the fixture, so the E2E can exercise the real hook-owner lifecycle —
 * unmounting only the canvas surface (`fx-unmount`) proves nothing about this owner.
 */
function PickerOwner({
  planKey,
  hidden,
  surfaceMounted,
}: {
  planKey: "a" | "b" | "frame";
  hidden: boolean;
  surfaceMounted: boolean;
}): React.JSX.Element {
  const picked = useLocalImageBinding();

  // a decoded local image takes over the surface; otherwise the synthetic plans are shown
  const pickedRef = picked.state.status === "ready" ? picked.state.imageState.imageRef : null;
  const plan = useMemo(() => {
    if (pickedRef !== null) return PLAN_USER(pickedRef);
    if (planKey === "b") return PLAN_B();
    if (planKey === "frame") return PLAN_FRAME();
    return PLAN_A();
  }, [planKey, pickedRef]);

  const pickedBindings = picked.bindings;
  const imageBindings = useMemo<PreviewImageBindings>(() => {
    const synthetic = createDrawable();
    return {
      get: (imageRef: string) =>
        imageRef === "fixtureDrawable" ? synthetic : pickedBindings.get(imageRef),
    };
  }, [pickedBindings]);

  return (
    <>
      {/* Local image pick (spec 026). The owner keeps the object url private; this harness only
          hands it a File and reads the safe snapshot back. */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fx-file">사용자 이미지 선택</label>{" "}
        <input
          id="fx-file"
          data-testid="fx-file"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            // the UI owner (not the controller) empties the input so the SAME file can be
            // picked again — spec 026 §5, legacy denn-mockup-tool.html:1408
            event.target.value = "";
            if (chosen) picked.load(chosen);
          }}
        />{" "}
        <button type="button" data-testid="fx-file-clear" onClick={() => picked.clear()}>
          clear picked image
        </button>
        <span data-testid="fx-file-state">{picked.state.status}</span>
      </div>
      <div data-testid="fx-host" style={hidden ? { display: "none" } : undefined}>
        {surfaceMounted ? (
          <PreviewCanvasSurface
            plan={plan}
            imageBindings={imageBindings}
            accessibleName="합성 미리보기"
          />
        ) : null}
      </div>
    </>
  );
}

function Fixture(): React.JSX.Element {
  const [planKey, setPlanKey] = useState<"a" | "b" | "frame">("a");
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [ownerLive, setOwnerLive] = useState(true);

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
        <button type="button" data-testid="fx-plan-frame" onClick={() => setPlanKey("frame")}>
          plan frame
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
        <button type="button" data-testid="fx-owner-off" onClick={() => setOwnerLive(false)}>
          owner off
        </button>
        <button type="button" data-testid="fx-owner-on" onClick={() => setOwnerLive(true)}>
          owner on
        </button>
      </div>
      <p data-testid="fx-owner-state">{ownerLive ? "live" : "gone"}</p>
      {ownerLive ? (
        <PickerOwner planKey={planKey} hidden={hidden} surfaceMounted={mounted} />
      ) : null}
      <p data-testid="fx-colors" style={{ fontSize: 12 }}>
        {`${BODY_COLOR}|${STROKE_COLOR}|${DRAWABLE_COLOR}|${ALT_BODY_COLOR}|${FRAME_COLOR}|${MAT_COLOR}`}
      </p>
    </main>
  );
}

// Spec102 synthetic-only ports. Never imported by the customer entry.
function runSnapshotCase(mode: string, scale: number, host: HTMLDivElement) {
  const counters = { creates: 0, copies: 0, releases: 0, execute: 0 };
  const codes: string[] = [];
  const makeCanvas = (id: string, width: number, height: number) => {
    const c = document.createElement("canvas");
    c.dataset.testid = id;
    c.width = width;
    c.height = height;
    return c;
  };
  const borrowed = makeCanvas("rs-borrowed", 12, 8);
  const art = borrowed.getContext("2d");
  if (!art) return { setup: false };
  art.fillStyle = "#EE4422";
  art.fillRect(0, 0, 12, 8);
  art.fillStyle = "#2277CC";
  art.fillRect(0, 0, 5, 8);
  const plan: PreviewRenderPlan = {
    kind: "frame",
    logicalCanvas: { width: 100.5, height: 80.25 },
    commands: [
      {
        type: "fill-rect",
        layerId: "rs-body",
        rect: { x: 0, y: 0, width: 100.5, height: 80.25 },
        color: "#DDBB88",
      },
      {
        type: "draw-image-cover",
        layerId: "rs-photo",
        imageRef: "rs-art",
        clipRect: { x: 8, y: 9, width: 70, height: 45 },
        drawRect: { x: 5, y: 4, width: 80, height: 60 },
        rotationQuarterTurns: 1,
      },
      {
        type: "draw-text",
        layerId: "rs-text",
        lines: [{ text: "DENN", width: 35 }],
        origin: { x: 12, y: 65 },
        align: "left",
        font: {
          family: "Arial",
          sizePx: 12,
          weight: "normal",
          italic: false,
          fallback: "sans-serif",
        },
        color: "#112233",
        lineHeightPx: 14,
        letterSpacingPx: 0,
        rotationDegrees: 0,
      },
    ],
  };
  const imageBindings = { get: () => borrowed };
  const identity = {};
  let currentIdentity = identity;
  const contentWidth = 100.5 * scale;
  const contentHeight = 80.25 * scale;
  const referenceSurface = makeCanvas(
    "rs-reference-surface",
    Math.ceil(contentWidth),
    Math.ceil(contentHeight),
  );
  const reference = makeCanvas("rs-reference", 220, 185);
  const output = makeCanvas("rs-output", 220, 185);
  const after = makeCanvas("rs-after", 220, 185);
  const referenceContext = referenceSurface.getContext("2d");
  const target = output.getContext("2d");
  const laterTarget = after.getContext("2d");
  const refTarget = reference.getContext("2d");
  if (!referenceContext || !target || !laterTarget || !refTarget) return { setup: false };
  referenceContext.setTransform(scale, 0, 0, scale, 0, 0);
  const referenceResult = executePreviewRenderPlan({
    context: referenceContext,
    plan,
    imageBindings,
  });
  // Independent two-stage reference; no snapshot helper in this branch.
  refTarget.drawImage(referenceSurface, 0, 0, contentWidth, contentHeight, 4, 7, 201, 160.5);
  let lease: FrameSnapshotLease | undefined;
  const paintRequest = { target, rect: { x: 4, y: 7, width: 201, height: 160.5 } };
  const made = createFrameSnapshotCapturer({
    readSource: () => ({
      identity: currentIdentity,
      kind: "frame",
      projectionOk: true,
      planReady: true,
      clockPreview: null,
      plan,
      imageBindings,
    }),
    createSurface: ({ width, height }: { width: number; height: number }) => {
      counters.creates++;
      if (mode === "create-failure") throw new Error("synthetic");
      let c: HTMLCanvasElement | undefined = makeCanvas("rs-private", width, height);
      const context = c.getContext("2d");
      return {
        release() {
          counters.releases++;
          const old = c;
          c = undefined;
          if (old) {
            old.width = 1;
            old.height = 1;
          }
          if (mode === "reentry") {
            const r = lease?.paint(paintRequest);
            if (r && !r.ok) codes.push(r.code);
          }
        },
        context: mode === "context-failure" ? null : context,
        copyTo(
          destination: CanvasRenderingContext2D,
          crop: { x: number; y: number; width: number; height: number },
          rect: { x: number; y: number; width: number; height: number },
        ) {
          counters.copies++;
          if (mode === "reentry") {
            const r = lease?.paint(paintRequest);
            if (r && !r.ok) codes.push(r.code);
          }
          if (!c) throw new Error("synthetic");
          destination.drawImage(
            c,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
          );
        },
      };
    },
    execute: (args: Parameters<typeof executePreviewRenderPlan>[0]) => {
      counters.execute++;
      if (mode === "execute-failure") return { ok: false };
      return executePreviewRenderPlan(args);
    },
  });
  if (!made.ok) return { setup: false };
  const request = {
    sourceIdentity: identity,
    scale,
    budget: { maxEdge: mode === "budget" ? 1 : 1024, maxPixels: 1024 * 1024 },
  };
  const result = made.capturer.capture(request);
  if (result.ok) {
    lease = result.lease;
    const busy = made.capturer.capture(request);
    if (!busy.ok) codes.push(busy.code);
    if (mode === "source-change") currentIdentity = {};
    if (mode === "release") {
      lease.release();
      lease.release();
    }
    if (mode === "dispose") made.capturer.dispose();
    const painted = lease.paint(paintRequest);
    if (!painted.ok) codes.push(painted.code);
    if (mode === "pixels") {
      art.fillStyle = "#00FF00";
      art.fillRect(0, 0, 12, 8);
      const later = lease.paint({ ...paintRequest, target: laterTarget });
      if (!later.ok) codes.push(later.code);
    }
    lease.release();
  } else codes.push(result.code);
  made.capturer.dispose();
  host.replaceChildren(reference, output, after, borrowed);
  return {
    setup: true,
    referenceOk: referenceResult.ok,
    captured: result.ok,
    ...counters,
    codes,
    originalSize: [borrowed.width, borrowed.height],
  };
}

function SnapshotFixture(): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState("idle");
  return (
    <main>
      <h1>Spec102 synthetic Canvas</h1>
      {[1, 1.25].map((scale) =>
        [
          "pixels",
          "release",
          "dispose",
          "source-change",
          "reentry",
          "budget",
          "create-failure",
          "context-failure",
          "execute-failure",
        ].map((mode) => (
          <button
            key={`${mode}-${scale}`}
            type="button"
            data-testid={`rs-${mode}-${scale}`}
            onClick={() => {
              if (host.current)
                setReport(JSON.stringify(runSnapshotCase(mode, scale, host.current)));
            }}
          >
            {mode} {scale}
          </button>
        )),
      )}
      <pre data-testid="rs-report">{report}</pre>
      <div ref={host} />
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      {window.location.search === "?roomBackgroundFile=1" ? (
        <RoomBackgroundFileFixture />
      ) : window.location.search === "?roomSnapshot=1" ? (
        <SnapshotFixture />
      ) : (
        <Fixture />
      )}
    </StrictMode>,
  );
}
