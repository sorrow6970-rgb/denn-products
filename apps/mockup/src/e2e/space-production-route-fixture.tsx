// Spec 061 E2E-only route fixture. It mounts the production MockupRoot and replaces only the
// controller factory. Catalog and Image ownership remain the production defaults; Playwright
// intercepts their exact fixed URLs before any request can leave the browser.

import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort, SpaceSceneV1 } from "@denn/spaces";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import { MockupRoot, type SpaceControllerFactory } from "../App";
import { SpaceLinkOpenController } from "../space/controller";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fspec-061-synthetic.png?alt=media";

const scene: SpaceSceneV1 = {
  schema: "space-scene-v1",
  design: {
    tplId: "spec-061-template",
    sizeId: "spec-061-size",
    colorId: "spec-061-color",
    texts: { main: "", name: "", name2: "", date: "", sub: "" },
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

interface FixtureMetrics {
  controllerFactories: number;
  documentReads: number;
  sceneOpens: number;
}

declare global {
  interface Window {
    __DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__: FixtureMetrics;
  }
}

const metrics: FixtureMetrics = {
  controllerFactories: 0,
  documentReads: 0,
  sceneOpens: 0,
};
window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__ = metrics;

const reader: SpaceDocumentReadPort = {
  async load(request) {
    metrics.documentReads += 1;
    const correlationId =
      typeof request.correlationId === "string" ? request.correlationId : "invalid-correlation";
    return { ok: true, value: { document: {}, correlationId } };
  },
};

const opener: SpaceOpenPort = {
  async open() {
    metrics.sceneOpens += 1;
    return {
      ok: true,
      value: {
        ownerLabel: "PRIVATE_OWNER_MARKER",
        createdAt: "PRIVATE_CREATED_AT_MARKER",
        scene,
      },
    };
  },
};

const createSpaceController: SpaceControllerFactory = (search) => {
  metrics.controllerFactories += 1;
  return new SpaceLinkOpenController(search, reader, opener);
};

function Fixture(): React.JSX.Element {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <nav aria-label="합성 검증 제어">
        <button type="button" data-testid="fixture-unmount" onClick={() => setMounted(false)}>
          화면 해제
        </button>
      </nav>
      {mounted ? (
        <MockupRoot
          search="?space=SPEC_061_PRIVATE_TOKEN"
          env={{}}
          createSpaceController={createSpaceController}
        />
      ) : null}
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
