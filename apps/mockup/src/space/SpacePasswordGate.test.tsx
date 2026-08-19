import type { SpaceDocumentReadPort } from "@denn/firebase/space-read";
import type { SpaceOpenPort } from "@denn/spaces";
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
});
