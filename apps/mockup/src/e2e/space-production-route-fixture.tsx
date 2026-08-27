// Spec 061 / spec 080 E2E-only route fixture. It mounts the production MockupRoot and replaces only
// the controller factory. Catalog and Image ownership remain the production defaults; Playwright
// intercepts their exact fixed URLs before any request can leave the browser.
//
// The V2 modes below use the REAL spec 078 replay controller, the REAL spec 080 browser PNG decoder
// and the REAL Web Crypto digest. Only the transport is synthetic: the proof PNG is drawn by this
// fixture into an in-memory canvas and handed straight to the reader, so nothing is fetched.

import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type {
  FrameReplayEvidenceV1,
  SpaceOpenPort,
  SpaceSceneV1,
  SpaceV2OpenPort,
} from "@denn/spaces";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "@denn/ui/theme.css";
import { MockupRoot, type SpaceControllerFactory } from "../App";
import { createSpaceV2ProofDecoderOwner } from "../space-v2/browser-png-decoder";
import {
  type SpaceV2ReplayFactory,
  SpaceVersionedViewController,
} from "../space-v2/production-controller";
import { createSpaceV2FrameReplayController } from "../space-v2/replay-controller";
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
  v2Bundles: number;
  v2Opens: number;
  proofReads: number;
  decodes: number;
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
  v2Bundles: 0,
  v2Opens: 0,
  proofReads: 0,
  decodes: 0,
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

// --- spec 080 V2 modes ------------------------------------------------------

type Mode = "v1" | "v2" | "v2-wrong-password" | "v2-proof-unavailable" | "v2-mismatch";

const MODES: readonly Mode[] = [
  "v1",
  "v2",
  "v2-wrong-password",
  "v2-proof-unavailable",
  "v2-mismatch",
];

function readMode(): Mode {
  const raw = new URLSearchParams(window.location.search).get("mode");
  return MODES.find((mode) => mode === raw) ?? "v1";
}

const V2_OBJECT_PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const V2_DOCUMENT = { schema: "space-v2", enc: { salt: "s", iv: "i", ct: "c" } };
const CORRECT_PASSWORD = "SYNTHETIC_PASSWORD";
const PROOF_SIZE = { width: 900, height: 1200 };

/** Draws a recognisable proof photo in memory. No network, no file, no external asset. */
async function syntheticPng(width: number, height: number, tint: string): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("fixture canvas unavailable");
  context.fillStyle = tint;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#FFFFFF";
  context.fillRect(width * 0.18, height * 0.24, width * 0.64, height * 0.52);
  context.fillStyle = "#191A1D";
  context.fillRect(width * 0.28, height * 0.36, width * 0.44, height * 0.28);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob === null) throw new Error("fixture PNG unavailable");
  return new Uint8Array(await blob.arrayBuffer());
}

async function sha256Base64(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
  );
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function evidence(sha256: string, byteLength: number): FrameReplayEvidenceV1 {
  return {
    replayContract: "frame-logical-plan-v1",
    frameOrientation: "portrait",
    logicalWidth: 320,
    geometry: { aspect: 1.5, borderPercentOfWidth: 4, matColor: "#FFFFFF", contentInsetPx: 8 },
    frameColor: "#9F887A",
    transformEncoding: "normalized-max-pan-v1",
    transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 },
    proofAsset: {
      objectPath: V2_OBJECT_PATH,
      sha256,
      byteLength,
      contentType: "image/png",
      intrinsicWidth: PROOF_SIZE.width,
      intrinsicHeight: PROOF_SIZE.height,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
  };
}

function createV2Replay(mode: Mode): SpaceV2ReplayFactory {
  // Memoised exactly like the production composition, so a retry reuses the one decoder owner
  // instead of leaving an earlier drawable behind.
  let bundle: ReturnType<SpaceV2ReplayFactory> | null = null;
  const build = async () => {
    metrics.v2Bundles += 1;
    const png = await syntheticPng(PROOF_SIZE.width, PROOF_SIZE.height, "#C9BBB0");
    const proofEvidence = evidence(await sha256Base64(png), png.byteLength);
    const owner = createSpaceV2ProofDecoderOwner();

    const v2Opener: SpaceV2OpenPort = {
      async open(_document, password) {
        metrics.v2Opens += 1;
        if (mode === "v2-wrong-password" && password !== CORRECT_PASSWORD) {
          return { ok: false, code: "SPACE_V2_OPEN_DECRYPT_FAILED" };
        }
        return {
          ok: true,
          value: {
            schema: "space-v2",
            scene: {
              schema: "space-scene-v2",
              productKind: "frame",
              frameEvidence: proofEvidence,
              frameEvidenceDigest: {
                algorithm: "SHA-256",
                encoding: "denn-frame-evidence-v1",
                value: proofEvidence.proofAsset.sha256,
              },
              roomCapability: "unsupported",
            },
          },
        };
      },
    };

    const controller = createSpaceV2FrameReplayController({
      opener: v2Opener,
      proof: {
        async read() {
          metrics.proofReads += 1;
          if (mode === "v2-proof-unavailable") throw new Error("PRIVATE_STORAGE_MARKER");
          if (mode === "v2-mismatch") {
            // Same declared length, different bytes: the digest gate is what must catch this.
            const other = new Uint8Array(png);
            other[other.length - 1] = other[other.length - 1] === 0 ? 1 : 0;
            return { bytes: other, contentType: "image/png" };
          }
          return { bytes: new Uint8Array(png), contentType: "image/png" };
        },
      },
      sha256: {
        async digest(bytes) {
          return new Uint8Array(
            await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
          );
        },
      },
      decoder: {
        decode(bytes) {
          metrics.decodes += 1;
          return owner.decoder.decode(bytes);
        },
      },
    });

    return { controller, imageBindings: owner.bindings, clear: owner.clear };
  };
  return () => {
    bundle ??= build();
    return bundle;
  };
}

const mode = readMode();

const createSpaceController: SpaceControllerFactory = (search) => {
  metrics.controllerFactories += 1;
  if (mode === "v1") return new SpaceLinkOpenController(search, reader, opener);
  return new SpaceVersionedViewController(
    search,
    {
      async load(request) {
        metrics.documentReads += 1;
        const correlationId =
          typeof request.correlationId === "string" ? request.correlationId : "invalid-correlation";
        return { ok: true, value: { document: V2_DOCUMENT, correlationId } };
      },
    },
    {
      async open() {
        // A V2 marker must never reach the V1 opener; this counter proves it.
        metrics.sceneOpens += 1;
        return { ok: false, code: "SPACE_OPEN_INVALID_INPUT" };
      },
    },
    createV2Replay(mode),
  );
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
