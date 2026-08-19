import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort } from "@denn/spaces";
import type { SpaceSceneV1 } from "@denn/spaces";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpaceLinkOpenController } from "./controller";
import { SpacePasswordGate } from "./SpacePasswordGate";

const reader: SpaceDocumentReadPort = {
  load: async () => ({
    ok: false,
    error: { code: "SPACE_READ_UNEXPECTED", retryable: false, correlationId: "safe" },
  }),
};
const opener: SpaceOpenPort = {
  open: async () => ({ ok: false, code: "SPACE_OPEN_INVALID_INPUT" }),
};

const readyScene: SpaceSceneV1 = {
  schema: "space-scene-v1",
  design: {
    tplId: "fixture-template",
    sizeId: "fixture-size",
    colorId: "fixture-color",
    texts: { main: "", name: "", name2: "", date: "", sub: "" },
    photoUrl:
      "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ffixture.png?alt=media",
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

describe("SpacePasswordGate", () => {
  it("renders a view-only password form without token output", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={new SpaceLinkOpenController("?space=private-token", reader, opener)}
      />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain("시안 보기");
    expect(html).toContain("열람 전용");
    expect(html).not.toContain("private-token");
  });

  it("renders invalid links without a password field", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={new SpaceLinkOpenController("?space=one&space=two", reader, opener)}
      />,
    );
    expect(html).toContain("시안 링크가 올바르지 않습니다.");
    expect(html).not.toContain('type="password"');
  });

  it("offers explicit input again only for a retryable failure", async () => {
    const retryReader: SpaceDocumentReadPort = {
      load: async () => ({
        ok: false,
        error: {
          code: "SPACE_READ_NETWORK_UNAVAILABLE",
          retryable: true,
          correlationId: "safe",
        },
      }),
    };
    const controller = new SpaceLinkOpenController("?space=token", retryReader, opener);
    controller.submitPassword("secret");
    await vi.waitFor(() => expect(controller.getState().status).toBe("error"));
    const html = renderToStaticMarkup(<SpacePasswordGate controller={controller} />);
    expect(html).toContain('type="password"');
    expect(html).toContain("시안을 불러오지 못했습니다.");
    expect(html).not.toContain("secret");
  });

  it("mounts an injected child only after ready and passes only the validated scene", async () => {
    const successReader: SpaceDocumentReadPort = {
      load: async () => ({
        ok: true,
        value: { correlationId: "safe", document: {} },
      }),
    };
    const successOpener: SpaceOpenPort = {
      open: async () => ({
        ok: true,
        value: {
          ownerLabel: "private-owner",
          createdAt: "private-created-at",
          scene: readyScene,
        },
      }),
    };
    const controller = new SpaceLinkOpenController(
      "?space=private-token",
      successReader,
      successOpener,
    );
    const renderReady = vi.fn(() => <p>합성 준비 화면</p>);

    renderToStaticMarkup(<SpacePasswordGate controller={controller} renderReady={renderReady} />);
    expect(renderReady).not.toHaveBeenCalled();
    controller.submitPassword("secret");
    await vi.waitFor(() => expect(controller.getState().status).toBe("ready"));

    const html = renderToStaticMarkup(
      <SpacePasswordGate controller={controller} renderReady={renderReady} />,
    );
    expect(renderReady).toHaveBeenCalledOnce();
    expect(renderReady).toHaveBeenCalledWith(readyScene);
    expect(html).toContain("합성 준비 화면");
    expect(html).not.toContain("private-owner");
    expect(html).not.toContain("private-created-at");
    expect(html).not.toContain("private-token");
  });
});
