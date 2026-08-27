import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort, SpaceSceneV1 } from "@denn/spaces";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockupRoot } from "./App";
import { publicCatalogReader } from "./catalog/reader";
import type { PreviewImageBindings } from "./canvas/types";
import type { SpaceGateController } from "./space-v2/production-controller";
import { SpaceLinkOpenController } from "./space/controller";

const postAuthView = vi.hoisted(() => vi.fn());
vi.mock("./space/SpacePostAuthFrameView", () => ({
  SpacePostAuthFrameView: (props: unknown) => {
    postAuthView(props);
    return "POST_AUTH_FRAME_MARKER";
  },
}));

const proofView = vi.hoisted(() => vi.fn());
vi.mock("./space-v2/SpaceV2ProofView", () => ({
  SpaceV2ProofView: (props: unknown) => {
    proofView(props);
    return "V2_PROOF_VIEW_MARKER";
  },
}));

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fapp-unit.png?alt=media";
const READY_SCENE: SpaceSceneV1 = {
  schema: "space-scene-v1",
  design: {
    tplId: "unit-template",
    sizeId: "unit-size",
    colorId: "unit-color",
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

async function readyController(): Promise<SpaceLinkOpenController> {
  const reader: SpaceDocumentReadPort = {
    load: vi.fn(async (request) => ({
      ok: true as const,
      value: { document: {}, correlationId: request.correlationId },
    })),
  };
  const opener: SpaceOpenPort = {
    open: vi.fn(async () => ({
      ok: true as const,
      value: {
        ownerLabel: "PRIVATE_OWNER_MARKER",
        createdAt: "PRIVATE_CREATED_AT_MARKER",
        scene: READY_SCENE,
      },
    })),
  };
  const controller = new SpaceLinkOpenController("?space=PRIVATE_TOKEN_MARKER", reader, opener);
  controller.submitPassword("PRIVATE_PASSWORD_MARKER");
  await vi.waitFor(() => expect(controller.getState().status).toBe("ready"));
  return controller;
}

describe("MockupRoot space mode", () => {
  beforeEach(() => {
    postAuthView.mockClear();
    proofView.mockClear();
  });

  it.each([
    ["?space=token", "비밀번호"],
    ["?space=one&space=two", "시안 링크가 올바르지 않습니다."],
  ])("owns the screen without mounting catalog UI for %s", (search, message) => {
    const html = renderToStaticMarkup(<MockupRoot search={search} env={{}} />);
    expect(html).toContain(message);
    expect(html).not.toContain("catalog-status");
    expect(html).not.toContain("카탈로그를 불러오는 중");
  });

  it("mounts the production post-auth child through only the controller factory seam", async () => {
    const controller = await readyController();
    const createSpaceController = vi.fn(() => controller);

    const html = renderToStaticMarkup(
      <MockupRoot
        search="?space=PRIVATE_TOKEN_MARKER"
        env={{}}
        createSpaceController={createSpaceController}
      />,
    );

    expect(createSpaceController).toHaveBeenCalledOnce();
    expect(html).toContain("POST_AUTH_FRAME_MARKER");
    expect(html).not.toContain("시안 화면 연결은 다음 안전 검증 단계에서 제공됩니다.");
    expect(postAuthView).toHaveBeenCalledOnce();
    const childProps = postAuthView.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(childProps).sort()).toEqual(["catalogReader", "scene"]);
    expect(childProps.catalogReader).toBe(publicCatalogReader);
    expect(childProps.scene).toBe(READY_SCENE);
    for (const secret of [
      "PRIVATE_OWNER_MARKER",
      "PRIVATE_CREATED_AT_MARKER",
      "PRIVATE_TOKEN_MARKER",
      "PRIVATE_PASSWORD_MARKER",
      PROOF,
    ]) {
      expect(html).not.toContain(secret);
    }
  });

  it("mounts the V2 proof screen with only the plan and the bindings", () => {
    const plan = { kind: "frame", logicalCanvas: { width: 320, height: 480 }, commands: [] };
    const imageBindings: PreviewImageBindings = { get: () => undefined };
    const controller: SpaceGateController = {
      getState: () => ({
        status: "ready",
        requestId: 1,
        v2: { plan: plan as never, imageBindings },
      }),
      subscribe: () => () => undefined,
      attach: () => undefined,
      detach: () => undefined,
      submitPassword: () => undefined,
    };

    const html = renderToStaticMarkup(
      <MockupRoot
        search="?space=PRIVATE_TOKEN_MARKER"
        env={{}}
        createSpaceController={() => controller}
      />,
    );

    expect(html).toContain("V2_PROOF_VIEW_MARKER");
    expect(html).not.toContain("POST_AUTH_FRAME_MARKER");
    expect(postAuthView).not.toHaveBeenCalled();
    expect(proofView).toHaveBeenCalledOnce();
    const childProps = proofView.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(childProps).sort()).toEqual(["imageBindings", "plan"]);
    expect(childProps.plan).toBe(plan);
    expect(childProps.imageBindings).toBe(imageBindings);
    expect(html).not.toContain("catalog-status");
    expect(html).not.toContain("PRIVATE_TOKEN_MARKER");
  });
});
