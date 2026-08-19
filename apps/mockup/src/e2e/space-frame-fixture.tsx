// Spec 060 E2E-only fixture. Every port is synthetic and in-memory: the Firebase-looking proof
// string is validated by the production projector but no browser Image or network request receives
// it. This entry is built separately and is never imported by the customer App.

import type { PublicCatalogReader } from "@denn/firebase";
import type { CatalogDocumentV1 } from "@denn/shared";
import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort, SpaceSceneV1 } from "@denn/spaces";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import type {
  TemplateArtBindingController,
  TemplateArtBindingState,
  TemplateArtSource,
} from "../canvas/templateArtBinding";
import type { PreviewImageBindings } from "../canvas/types";
import { SpaceLinkOpenController } from "../space/controller";
import type { SpaceProofImageOwner, SpaceProofImageOwnerState } from "../space/proof-image-owner";
import {
  createSourceBoundReadinessController,
  type SourceBoundReadinessController,
} from "../space/source-bound-readiness";
import { SpacePasswordGate } from "../space/SpacePasswordGate";
import { SpacePostAuthFrameView } from "../space/SpacePostAuthFrameView";
import type { SpaceFrameFontEnvironment } from "../space/use-space-frame-fonts";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fsynthetic.png?alt=media";

interface FixtureMetrics {
  gateReads: number;
  catalogLoads: number;
  readinessCreates: number;
  readinessDisposes: number;
  proofLoads: number;
  artLoads: number;
  ownerSubscriptions: number;
  fontFactories: number;
  fontChecks: string[];
}

declare global {
  interface Window {
    __DENN_SPACE_FRAME_FIXTURE__: FixtureMetrics;
  }
}

const metrics: FixtureMetrics = {
  gateReads: 0,
  catalogLoads: 0,
  readinessCreates: 0,
  readinessDisposes: 0,
  proofLoads: 0,
  artLoads: 0,
  ownerSubscriptions: 0,
  fontFactories: 0,
  fontChecks: [],
};
window.__DENN_SPACE_FRAME_FIXTURE__ = metrics;

const hasText = new URLSearchParams(window.location.search).get("text") !== "none";

const catalogDocument: CatalogDocumentV1 = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    frameThickness: 5,
    frameTemplates: [
      {
        id: "fixture-template",
        name: "합성 템플릿",
        type: "uploaded",
        targetSizeIds: ["fixture-size"],
        clockEnabled: false,
        textZones: [
          {
            key: "main",
            x: 50,
            y: 50,
            boxW: 80,
            fontSize: 8,
            align: "center",
            font: "Fixture Sans",
            bold: false,
            italic: false,
            color: "#112233",
            lineH: 1.2,
            letterSpacing: 0,
            rotation: 0,
          },
        ],
      },
    ],
    frameSizes: [{ id: "fixture-size", name: "합성 크기", aspect: 1.4 }],
    frameColors: [{ id: "fixture-color", name: "검정", fill: "#1A1A1A" }],
  },
};

const scene: SpaceSceneV1 = {
  schema: "space-scene-v1",
  design: {
    tplId: "fixture-template",
    sizeId: "fixture-size",
    colorId: "fixture-color",
    texts: { main: hasText ? "SYNTHETIC" : "", name: "", name2: "", date: "", sub: "" },
    photoUrl: PROOF,
    imgT: { scale: 1, x: 0, y: 0, rot: 0 },
    clockOn: false,
  },
  room: {
    bgId: null,
    guideIndex: null,
    pos: null,
    sunPos: null,
    controls: {},
    settings: null,
    common: null,
    gallery: [],
  },
};

const gateReader: SpaceDocumentReadPort = {
  async load(request) {
    metrics.gateReads += 1;
    return { ok: true, value: { document: {}, correlationId: String(request.correlationId) } };
  },
};
const gateOpener: SpaceOpenPort = {
  async open() {
    return {
      ok: true,
      value: { ownerLabel: "fixture-owner", createdAt: "fixture-time", scene },
    };
  },
};
const gateController = new SpaceLinkOpenController("?space=fixture-token", gateReader, gateOpener);

let catalogPromise: ReturnType<PublicCatalogReader["load"]> | null = null;
const catalogReader: PublicCatalogReader = {
  load(request) {
    if (catalogPromise === null) {
      metrics.catalogLoads += 1;
      catalogPromise = Promise.resolve({
        ok: true,
        source: "network",
        correlationId: request.correlationId,
        document: catalogDocument,
        report: {
          sourceVersion: "catalog-v1",
          defaultsApplied: [],
          warnings: [],
          unknownPaths: [],
          extensions: {},
          counts: {},
          imageReferences: { dataUrl: 0, storagePath: 0, dual: 0 },
        },
      });
    }
    const current = catalogPromise;
    if (current === null) throw new Error("unreachable");
    return current;
  },
};

function syntheticDrawable(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 120;
  canvas.height = 80;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#8A6B58";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

class SyntheticProofOwner implements SpaceProofImageOwner {
  private state: SpaceProofImageOwnerState = { status: "idle" };
  private drawable: HTMLCanvasElement | undefined;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  readonly bindings: PreviewImageBindings = {
    get: (ref) =>
      this.state.status === "ready" && this.state.imageRef === ref ? this.drawable : undefined,
  };
  readonly getSnapshot = () => this.state;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    metrics.ownerSubscriptions += 1;
    return () => {
      if (this.listeners.delete(listener)) metrics.ownerSubscriptions -= 1;
    };
  };
  readonly load = () => {
    metrics.proofLoads += 1;
    const generation = ++this.generation;
    this.state = { status: "loading" };
    this.emit();
    queueMicrotask(() => {
      if (generation !== this.generation) return;
      this.drawable = syntheticDrawable();
      this.state = {
        status: "ready",
        imageRef: "space-proof-1",
        intrinsicSize: { width: 120, height: 80 },
      };
      this.emit();
    });
  };
  readonly clear = () => {
    this.generation += 1;
    this.drawable = undefined;
    this.state = { status: "idle" };
    this.emit();
  };
  readonly dispose = () => {
    this.generation += 1;
    this.drawable = undefined;
    this.listeners.clear();
  };
  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

class SyntheticArtOwner implements TemplateArtBindingController {
  private state: TemplateArtBindingState = { status: "idle" };
  private readonly listeners = new Set<() => void>();
  readonly bindings: PreviewImageBindings = { get: () => undefined };
  readonly getSnapshot = () => this.state;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    metrics.ownerSubscriptions += 1;
    return () => {
      if (this.listeners.delete(listener)) metrics.ownerSubscriptions -= 1;
    };
  };
  readonly load = (_source: TemplateArtSource) => {
    metrics.artLoads += 1;
    this.state = { status: "failed", code: "LOAD_FAILED" };
    this.emit();
  };
  readonly clear = () => {
    this.state = { status: "idle" };
    this.emit();
  };
  readonly dispose = () => {
    this.listeners.clear();
  };
  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

const createReadiness = (): SourceBoundReadinessController => {
  metrics.readinessCreates += 1;
  const controller = createSourceBoundReadinessController({
    createProofOwner: () => new SyntheticProofOwner(),
    createTemplateArtOwner: () => new SyntheticArtOwner(),
  });
  const dispose = controller.dispose;
  controller.dispose = () => {
    if (controller.getSnapshot().status !== "disposed") metrics.readinessDisposes += 1;
    dispose();
  };
  return controller;
};

let fontsReleased = false;
const fontWaiters = new Set<() => void>();
const releaseFonts = (): void => {
  fontsReleased = true;
  for (const resolve of [...fontWaiters]) resolve();
  fontWaiters.clear();
};
const createFontEnvironment = (): SpaceFrameFontEnvironment => {
  metrics.fontFactories += 1;
  return {
    waitUntilReady: () =>
      fontsReleased
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            fontWaiters.add(resolve);
          }),
    check(value) {
      metrics.fontChecks.push(value);
      return value.includes('"Fixture Sans"');
    },
    createMeasureText:
      () =>
      ({ text, font }) =>
        text.length * font.sizePx * 0.5,
  };
};

function Fixture(): React.JSX.Element {
  const [wide, setWide] = useState(false);
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <nav aria-label="합성 검증 제어">
        <button type="button" data-testid="fixture-expand" onClick={() => setWide(true)}>
          폭 제공
        </button>
        <button type="button" data-testid="fixture-release-fonts" onClick={releaseFonts}>
          폰트 준비
        </button>
        <button type="button" data-testid="fixture-unmount" onClick={() => setMounted(false)}>
          화면 해제
        </button>
        <button type="button" data-testid="fixture-remount" onClick={() => setMounted(true)}>
          화면 다시 열기
        </button>
      </nav>
      <SpacePasswordGate
        controller={gateController}
        renderReady={(openedScene) =>
          mounted ? (
            <div style={{ width: wide ? "420px" : "0px", overflow: "hidden" }}>
              <SpacePostAuthFrameView
                scene={openedScene}
                catalogReader={catalogReader}
                createReadiness={createReadiness}
                createFontEnvironment={createFontEnvironment}
              />
            </div>
          ) : null
        }
      />
    </>
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
