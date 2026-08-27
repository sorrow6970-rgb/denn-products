import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort } from "@denn/spaces";
import type { SpaceSceneV1 } from "@denn/spaces";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PreviewImageBindings } from "../canvas/types";
import type { SpaceGateController } from "../space-v2/production-controller";
import { SpaceLinkOpenController } from "./controller";
import { SpacePasswordGate } from "./SpacePasswordGate";

/** A controller pinned to one state: the gate is a pure projection of whatever it reports. */
function pinned(state: ReturnType<SpaceGateController["getState"]>): SpaceGateController {
  return {
    getState: () => state,
    subscribe: () => () => undefined,
    attach: () => undefined,
    detach: () => undefined,
    submitPassword: () => undefined,
  };
}

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

  it("routes a V2 ready state to the V2 seam with only the plan and the bindings", () => {
    const plan = { kind: "frame", logicalCanvas: { width: 320, height: 480 }, commands: [] };
    const imageBindings: PreviewImageBindings = { get: () => undefined };
    const renderReady = vi.fn(() => <p>V1_CHILD_MARKER</p>);
    const renderReadyV2 = vi.fn(() => <p>V2_CHILD_MARKER</p>);

    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={pinned({
          status: "ready",
          requestId: 1,
          v2: { plan: plan as never, imageBindings },
        })}
        renderReady={renderReady}
        renderReadyV2={renderReadyV2}
      />,
    );

    expect(html).toContain("V2_CHILD_MARKER");
    expect(html).not.toContain("V1_CHILD_MARKER");
    expect(renderReady).not.toHaveBeenCalled();
    expect(renderReadyV2).toHaveBeenCalledOnce();
    expect(renderReadyV2).toHaveBeenCalledWith({ plan, imageBindings });
  });

  it("routes a V1 ready state to the V1 seam even when both are supplied", () => {
    const renderReady = vi.fn(() => <p>V1_CHILD_MARKER</p>);
    const renderReadyV2 = vi.fn(() => <p>V2_CHILD_MARKER</p>);

    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={pinned({
          status: "ready",
          requestId: 1,
          value: {
            ownerLabel: "PRIVATE_OWNER_MARKER",
            createdAt: "PRIVATE_CREATED_AT_MARKER",
            scene: readyScene,
          },
        })}
        renderReady={renderReady}
        renderReadyV2={renderReadyV2}
      />,
    );

    expect(html).toContain("V1_CHILD_MARKER");
    expect(renderReadyV2).not.toHaveBeenCalled();
    expect(renderReady).toHaveBeenCalledWith(readyScene);
    expect(html).not.toContain("PRIVATE_OWNER_MARKER");
  });

  it("shows the safe V2 failure wording without a code", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={pinned({
          status: "error",
          requestId: 1,
          code: "SPACE_V2_VIEW_UNAVAILABLE",
          retryable: false,
        })}
      />,
    );
    expect(html).toContain("시안을 표시할 수 없습니다.");
    expect(html).not.toContain("SPACE_V2_VIEW_UNAVAILABLE");
    expect(html).not.toContain('type="password"');
  });

  it("asks for the password again for a retryable V2 proof failure", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={pinned({
          status: "error",
          requestId: 1,
          code: "SPACE_V2_VIEW_PROOF_UNAVAILABLE",
          retryable: true,
        })}
      />,
    );
    expect(html).toContain("시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
    expect(html).toContain('type="password"');
    expect(html).toContain("시안 보기");
  });

  it("submits through a real form whose button is the submit control", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={new SpaceLinkOpenController("?space=private-token", reader, opener)}
      />,
    );
    expect(html).toContain('data-testid="space-password-form"');
    expect(html).toMatch(/<form[^>]*data-testid="space-password-form"/);
    // Enter in the field must submit the form, so the only button inside it is type="submit".
    expect(html).toMatch(/<button type="submit"[^>]*data-testid="space-submit"/);
    expect(html).not.toMatch(/<button type="button"[^>]*data-testid="space-submit"/);
    // The password input lives INSIDE that form; otherwise implicit submission cannot work.
    const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
    expect(form).toContain('type="password"');
    expect(form).toContain('data-testid="space-submit"');
  });

  it("renders no form at all when there is nothing to submit", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={pinned({
          status: "error",
          requestId: 1,
          code: "SPACE_V2_VIEW_UNAVAILABLE",
          retryable: false,
        })}
      />,
    );
    expect(html).not.toContain("<form");
    expect(html).not.toContain('data-testid="space-submit"');
  });

  it("keeps the card layout rhythm when the controls move into the form", () => {
    const html = renderToStaticMarkup(
      <SpacePasswordGate
        controller={new SpaceLinkOpenController("?space=private-token", reader, opener)}
      />,
    );
    expect(html).toMatch(/<form class="denn-stack"/);
  });
});
