import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type {
  FrameReplayEvidenceV1,
  OpenedSpaceV2,
  SpaceOpenPort,
  SpaceSceneV1,
  SpaceV2OpenPort,
  SpaceV2OpenResult,
} from "@denn/spaces";
import { describe, expect, it, vi } from "vitest";
import type { LocalImageElementPort } from "../canvas/localImageBinding";
import {
  createSpaceV2ProofDecoderOwner,
  type SpaceV2ProofDecoderPorts,
} from "./browser-png-decoder";
import {
  safeSpaceVersionedViewMessage,
  type SpaceV2ReplayBundle,
  SpaceVersionedViewController,
} from "./production-controller";
import { createSpaceV2FrameReplayController } from "./replay-controller";

const TOKEN = "PRIVATE_TOKEN_MARKER";
const PASSWORD = "PRIVATE_PASSWORD_MARKER";
const OBJECT_PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
// base64 of 32 zero bytes — the digest the fake SHA-256 port below returns.
const ZERO_SHA256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const PROOF_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
const INTRINSIC = { width: 1600, height: 2400 };

const V2_DOCUMENT = { schema: "space-v2", enc: { salt: "s", iv: "i", ct: "c" } };
const V1_DOCUMENT = { schema: "space-v1", enc: { salt: "s", iv: "i", ct: "c" } };

const V1_SCENE: SpaceSceneV1 = {
  schema: "space-scene-v1",
  design: {
    tplId: "unit-template",
    sizeId: "unit-size",
    colorId: "unit-color",
    texts: { main: "", name: "", name2: "", date: "", sub: "" },
    photoUrl: "https://example.test/PRIVATE_PROOF_MARKER.png",
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

function evidence(over: Partial<FrameReplayEvidenceV1> = {}): FrameReplayEvidenceV1 {
  return {
    replayContract: "frame-logical-plan-v1",
    frameOrientation: "portrait",
    logicalWidth: 800,
    geometry: { aspect: 1.5, borderPercentOfWidth: 4, matColor: "#FFFFFF", contentInsetPx: 8 },
    frameColor: "#9F887A",
    transformEncoding: "normalized-max-pan-v1",
    transform: { scale: 1.25, x: -0.5, y: 0.25, rotationQuarterTurns: 1 },
    proofAsset: {
      objectPath: OBJECT_PATH,
      sha256: ZERO_SHA256,
      byteLength: PROOF_BYTES.byteLength,
      contentType: "image/png",
      intrinsicWidth: INTRINSIC.width,
      intrinsicHeight: INTRINSIC.height,
    },
    templateArt: { kind: "none" },
    textMode: "none",
    clockMode: "off",
    ...over,
  };
}

function openedV2(frameEvidence = evidence()): OpenedSpaceV2 {
  return {
    schema: "space-v2",
    scene: {
      schema: "space-scene-v2",
      productKind: "frame",
      frameEvidence,
      frameEvidenceDigest: {
        algorithm: "SHA-256",
        encoding: "denn-frame-evidence-v1",
        value: ZERO_SHA256,
      },
      roomCapability: "unsupported",
    },
  };
}

class FakeImage implements LocalImageElementPort {
  onload: ((...args: never[]) => unknown) | null = null;
  onerror: ((...args: never[]) => unknown) | null = null;
  src = "";
  naturalWidth = 0;
  naturalHeight = 0;
}

interface Harness {
  readonly calls: string[];
  readonly images: FakeImage[];
  readonly controller: SpaceVersionedViewController;
  readonly bundleFactories: number[];
  readonly clears: number[];
  readonly prepares: number[];
  /** Completes the real browser-decoder step once the fake image port exists. */
  finishDecode(width?: number, height?: number): Promise<void>;
}

interface HarnessOptions {
  readonly document?: unknown;
  readonly openResult?: SpaceV2OpenResult;
  readonly proof?: () => Promise<{ bytes: Uint8Array; contentType: "image/png" }>;
  readonly bundle?: "none" | "null" | "throws";
  readonly readResult?: Awaited<ReturnType<SpaceDocumentReadPort["load"]>>;
  readonly search?: string;
}

/**
 * Wires the REAL spec 078 replay controller and the REAL spec 080 browser decoder behind fake
 * transport ports, so the assertions below cover the actual production order rather than a stub.
 */
function harness(options: HarnessOptions = {}): Harness {
  const calls: string[] = [];
  const images: FakeImage[] = [];
  const bundleFactories: number[] = [];
  const clears: number[] = [];
  const prepares: number[] = [];
  let consumed = 0;
  const documentValue = "document" in options ? options.document : V2_DOCUMENT;

  const reader: SpaceDocumentReadPort = {
    load: async (request) => {
      calls.push("document-read");
      if (options.readResult !== undefined) return options.readResult;
      return {
        ok: true as const,
        value: {
          document: documentValue,
          correlationId: typeof request.correlationId === "string" ? request.correlationId : "",
        },
      };
    },
  };

  const opener: SpaceOpenPort = {
    open: async () => {
      calls.push("v1-open");
      return {
        ok: true as const,
        value: {
          ownerLabel: "PRIVATE_OWNER_MARKER",
          createdAt: "PRIVATE_CREATED_AT_MARKER",
          scene: V1_SCENE,
        },
      };
    },
  };

  const ports: SpaceV2ProofDecoderPorts = {
    createBlob: (bytes) => ({ bytes }) as unknown as Blob,
    createObjectUrl: () => `blob:synthetic-${images.length}`,
    revokeObjectUrl: () => undefined,
    createImage: () => {
      const image = new FakeImage();
      images.push(image);
      return image;
    },
  };

  const buildBundle = (): SpaceV2ReplayBundle => {
    bundleFactories.push(bundleFactories.length + 1);
    const owner = createSpaceV2ProofDecoderOwner({ ports });
    const v2Opener: SpaceV2OpenPort = {
      open: async () => {
        calls.push("v2-open");
        return options.openResult ?? { ok: true as const, value: openedV2() };
      },
    };
    const replay = createSpaceV2FrameReplayController({
      opener: v2Opener,
      proof: {
        read: async (request) => {
          calls.push("proof-read");
          if (options.proof !== undefined) return options.proof();
          expect(request.objectPath).toBe(OBJECT_PATH);
          return { bytes: new Uint8Array(PROOF_BYTES), contentType: "image/png" as const };
        },
      },
      sha256: {
        digest: async () => {
          calls.push("digest");
          return new Uint8Array(32);
        },
      },
      decoder: {
        decode: (bytes) => {
          calls.push("decode");
          return owner.decoder.decode(bytes);
        },
      },
    });
    return {
      controller: {
        prepare: (request) => {
          prepares.push(prepares.length + 1);
          return replay.prepare(request);
        },
      },
      imageBindings: owner.bindings,
      clear: () => {
        clears.push(clears.length + 1);
        owner.clear();
      },
    };
  };

  const factory =
    options.bundle === "none"
      ? undefined
      : options.bundle === "null"
        ? async () => null
        : options.bundle === "throws"
          ? async () => {
              throw new Error("PRIVATE_FACTORY_MARKER");
            }
          : async () => buildBundle();

  return {
    calls,
    images,
    bundleFactories,
    clears,
    prepares,
    controller: new SpaceVersionedViewController(
      options.search ?? `?space=${TOKEN}`,
      reader,
      opener,
      factory,
    ),
    finishDecode: async (width = INTRINSIC.width, height = INTRINSIC.height) => {
      const index = consumed;
      consumed += 1;
      await vi.waitFor(() => expect(images.length).toBeGreaterThan(index));
      const image = images[index];
      if (!image) throw new Error("expected an image port");
      image.naturalWidth = width;
      image.naturalHeight = height;
      image.onload?.();
    },
  };
}

const settled = (h: Harness) =>
  vi.waitFor(() => {
    const status = h.controller.getState().status;
    expect(status === "ready" || status === "error").toBe(true);
  });

describe("versioned space controller — dispatch", () => {
  it("sends a non-V2 document to the V1 opener and builds no V2 side at all", async () => {
    const h = harness({ document: V1_DOCUMENT });
    h.controller.submitPassword(PASSWORD);
    await settled(h);

    expect(h.calls).toEqual(["document-read", "v1-open"]);
    expect(h.bundleFactories).toEqual([]);
    expect(h.images).toEqual([]);
    const state = h.controller.getState();
    expect(state.status).toBe("ready");
    if (state.status !== "ready" || !("value" in state)) throw new Error("expected a V1 ready");
    expect(state.value.scene).toBe(V1_SCENE);
  });

  it.each([
    ["a document with no schema", { enc: {} }],
    ["a primitive document", "space-v2"],
    ["a null document", null],
  ])("treats %s as V1, never as V2", async (_label, document) => {
    const h = harness({ document });
    h.controller.submitPassword(PASSWORD);
    await settled(h);
    expect(h.calls).toEqual(["document-read", "v1-open"]);
    expect(h.bundleFactories).toEqual([]);
  });

  it("treats a throwing schema getter as V1 without letting the exception escape", async () => {
    const hostile = {
      get schema(): string {
        throw new Error("PRIVATE_HOSTILE_MARKER");
      },
    };
    const h = harness({ document: hostile });
    h.controller.submitPassword(PASSWORD);
    await settled(h);
    expect(h.calls).toEqual(["document-read", "v1-open"]);
  });

  it("sends an exact space-v2 marker to the V2 pipeline only", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);

    expect(h.calls).not.toContain("v1-open");
    const state = h.controller.getState();
    if (state.status !== "ready" || !("v2" in state)) throw new Error("expected a V2 ready");
    expect(state.v2.plan.kind).toBe("frame");
  });

  it("runs the exact V2 order: read → open → proof → digest → decode → plan", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);

    expect(h.calls).toEqual(["document-read", "v2-open", "proof-read", "digest", "decode"]);
    const state = h.controller.getState();
    if (state.status !== "ready" || !("v2" in state)) throw new Error("expected a V2 ready");
    // The plan is the last step and it is only reachable once every earlier gate passed.
    expect(state.v2.plan.logicalCanvas.width).toBeGreaterThan(0);
  });
});

describe("versioned space controller — V2 failures", () => {
  it("fails a malformed V2 document closed instead of retrying it as V1", async () => {
    const h = harness({
      openResult: { ok: false, code: "SPACE_V2_OPEN_INVALID_DOCUMENT" },
    });
    h.controller.submitPassword(PASSWORD);
    await settled(h);

    expect(h.calls).toEqual(["document-read", "v2-open"]);
    expect(h.images).toEqual([]);
    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_UNAVAILABLE",
      retryable: false,
    });
    // Non-retryable: a further submit is refused outright, so nothing runs again.
    h.controller.submitPassword(PASSWORD);
    expect(h.calls).toEqual(["document-read", "v2-open"]);
  });

  it("keeps the cached document for a wrong password and reads no proof bytes", async () => {
    const h = harness({ openResult: { ok: false, code: "SPACE_V2_OPEN_DECRYPT_FAILED" } });
    h.controller.submitPassword("WRONG_PASSWORD_MARKER");
    await settled(h);

    expect(h.calls).toEqual(["document-read", "v2-open"]);
    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_PASSWORD_REJECTED",
      retryable: true,
    });

    h.controller.submitPassword(PASSWORD);
    await settled(h);
    // The document is reused: exactly one read for two attempts.
    expect(h.calls.filter((call) => call === "document-read")).toHaveLength(1);
    expect(h.calls).not.toContain("proof-read");
  });

  it("offers an explicit retry for an unavailable proof and never retries on its own", async () => {
    const h = harness({
      proof: async () => {
        throw new Error("PRIVATE_STORAGE_MARKER");
      },
    });
    h.controller.submitPassword(PASSWORD);
    await settled(h);

    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_PROOF_UNAVAILABLE",
      retryable: true,
    });
    expect(h.prepares).toEqual([1]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.prepares).toEqual([1]);
    // The drawable owner is emptied on failure rather than left holding a stale binding.
    expect(h.clears).toEqual([1]);
  });

  it("closes a proof mismatch as non-retryable with no raw detail", async () => {
    const h = harness({
      proof: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" as const }),
    });
    h.controller.submitPassword(PASSWORD);
    await settled(h);

    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_UNAVAILABLE",
      retryable: false,
    });
    expect(h.images).toEqual([]);
    expect(JSON.stringify(h.controller.getState())).not.toContain("PRIVATE");
  });

  it("closes a decode failure as non-retryable", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await vi.waitFor(() => expect(h.images.length).toBe(1));
    h.images[0]?.onerror?.();
    await settled(h);

    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_UNAVAILABLE",
      retryable: false,
    });
  });

  it("closes a dimension mismatch as non-retryable", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode(4, 6);
    await settled(h);

    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_UNAVAILABLE",
      retryable: false,
    });
  });

  it("closes a plan failure as non-retryable", async () => {
    const h = harness({
      openResult: {
        ok: true,
        value: openedV2(evidence({ frameColor: "not-a-colour" })),
      },
    });
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);

    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_V2_VIEW_UNAVAILABLE",
      retryable: false,
    });
  });

  it.each(["none", "null", "throws"] as const)(
    "fails closed when the V2 side cannot be built (%s)",
    async (bundle) => {
      const h = harness({ bundle });
      h.controller.submitPassword(PASSWORD);
      await settled(h);

      expect(h.calls).toEqual(["document-read"]);
      expect(h.controller.getState()).toMatchObject({
        status: "error",
        code: "SPACE_V2_VIEW_UNAVAILABLE",
        retryable: false,
      });
      expect(JSON.stringify(h.controller.getState())).not.toContain("PRIVATE_FACTORY_MARKER");
    },
  );
});

describe("versioned space controller — lifecycle and safety", () => {
  it("keeps one submit in flight through duplicate clicks", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    h.controller.submitPassword(PASSWORD);
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);

    expect(h.calls.filter((call) => call === "document-read")).toHaveLength(1);
    expect(h.prepares).toEqual([1]);
    expect(h.images).toHaveLength(1);
  });

  it("drops a late V2 result after detach and empties the binding", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await vi.waitFor(() => expect(h.images.length).toBe(1));
    h.controller.detach();
    await h.finishDecode();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(h.controller.getState().status).toBe("loading");
    expect(h.clears.length).toBeGreaterThan(0);
  });

  it("resets to the initial state on re-attach (StrictMode remount)", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);
    expect(h.controller.getState().status).toBe("ready");

    h.controller.detach();
    h.controller.attach();
    expect(h.controller.getState()).toEqual({ status: "awaiting-password" });

    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);
    expect(h.controller.getState().status).toBe("ready");
    expect(h.calls.filter((call) => call === "document-read")).toHaveLength(2);
  });

  it("never puts the token, the password or the object path into its state", async () => {
    const h = harness();
    h.controller.submitPassword(PASSWORD);
    await h.finishDecode();
    await settled(h);

    const serialized = JSON.stringify(h.controller.getState());
    for (const secret of [TOKEN, PASSWORD, OBJECT_PATH, ZERO_SHA256, "rebuild-space-assets"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("refuses an invalid link before any read", async () => {
    const h = harness({ search: "?space=one&space=two" });
    expect(h.controller.getState()).toEqual({ status: "invalid-link" });
    h.controller.submitPassword(PASSWORD);
    expect(h.calls).toEqual([]);
  });

  it("maps a document read failure exactly as the V1 controller did", async () => {
    const h = harness({
      readResult: {
        ok: false,
        error: { code: "SPACE_READ_NOT_FOUND", retryable: false, correlationId: "safe" },
      },
    });
    h.controller.submitPassword(PASSWORD);
    await settled(h);
    expect(h.controller.getState()).toMatchObject({
      status: "error",
      code: "SPACE_VIEW_NOT_FOUND",
      retryable: false,
    });
    expect(h.bundleFactories).toEqual([]);
  });
});

describe("versioned space view messages", () => {
  it("shows a general retry line for an unavailable proof and never a code", () => {
    expect(safeSpaceVersionedViewMessage("SPACE_V2_VIEW_PROOF_UNAVAILABLE")).toBe(
      "시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
    );
    expect(safeSpaceVersionedViewMessage("SPACE_V2_VIEW_UNAVAILABLE")).toBe(
      "시안을 표시할 수 없습니다.",
    );
    expect(safeSpaceVersionedViewMessage("SPACE_V2_VIEW_PASSWORD_REJECTED")).toBe(
      "비밀번호가 올바르지 않습니다.",
    );
  });

  it("keeps the spec 063 V1 wording untouched", () => {
    expect(safeSpaceVersionedViewMessage("SPACE_VIEW_INVALID_LINK")).toBe(
      "시안 링크가 올바르지 않습니다.",
    );
    expect(safeSpaceVersionedViewMessage("SPACE_VIEW_INVALID_CONTENT")).toBe(
      "시안 내용을 안전하게 표시할 수 없습니다.",
    );
  });
});
