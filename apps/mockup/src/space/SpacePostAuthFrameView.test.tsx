import type { PublicCatalogReader } from "@denn/firebase";
import type { SpaceSceneV1 } from "@denn/spaces";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpacePostAuthFrameView } from "./SpacePostAuthFrameView";

const PROOF =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ffixture.png?alt=media";

const scene = (imgT: unknown): SpaceSceneV1 =>
  ({
    schema: "space-scene-v1",
    design: {
      tplId: "SPEC_063_TEMPLATE_ID",
      sizeId: "SPEC_063_SIZE_ID",
      colorId: "SPEC_063_COLOR_ID",
      texts: { main: "", name: "", name2: "", date: "", sub: "" },
      photoUrl: PROOF,
      imgT,
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
  }) as unknown as SpaceSceneV1;

/** Fails the test if it is ever consulted: a blocked scene must not reach the catalog at all. */
const forbiddenReader = (): { reader: PublicCatalogReader; load: ReturnType<typeof vi.fn> } => {
  const load = vi.fn(async () => {
    throw new Error("catalog must not be read for a blocked scene");
  });
  return { reader: { load } as unknown as PublicCatalogReader, load };
};

const renderBlocked = (imgT: unknown): { html: string; load: ReturnType<typeof vi.fn> } => {
  const { reader, load } = forbiddenReader();
  const html = renderToStaticMarkup(
    <SpacePostAuthFrameView
      scene={scene(imgT)}
      catalogReader={reader}
      createReadiness={() => {
        throw new Error("readiness owner must not be created for a blocked scene");
      }}
      createFontEnvironment={() => {
        throw new Error("font environment must not be created for a blocked scene");
      }}
    />,
  );
  return { html, load };
};

const IDENTITY = { scale: 1, x: 0, y: 0, rot: 0 };

describe("SpacePostAuthFrameView V1 preflight", () => {
  it("blocks the identity-looking V1 scene without reading the catalog or creating owners", () => {
    const { html, load } = renderBlocked(IDENTITY);
    expect(load).not.toHaveBeenCalled();
    expect(html).toContain("이전 버전에서 발급된 시안");
    expect(html).toContain("안전하게 중단");
    expect(html).toContain("새 시안 링크를 요청");
  });

  it.each([
    ["identity", IDENTITY],
    ["centered zoom", { scale: 2.5, x: 0, y: 0, rot: 0 }],
    ["legacy shrink", { scale: 0.3, x: 0, y: 0, rot: 0 }],
    ["absolute pan", { scale: 1, x: -42, y: 17, rot: 0 }],
    ["quarter turn", { scale: 1, x: 0, y: 0, rot: 90 }],
    ["missing rot", { scale: 1, x: 0, y: 0 }],
    ["malformed", { scale: "1", x: 0, y: 0, rot: 0 }],
    ["null transform", null],
    ["absent transform", undefined],
    ["extra field", { scale: 1, x: 0, y: 0, rot: 0, orientation: "portrait" }],
  ])("blocks %s and never renders a canvas", (_label, imgT) => {
    const { html, load } = renderBlocked(imgT);
    expect(load).not.toHaveBeenCalled();
    expect(html).toContain("이 시안은 지금 화면에 표시할 수 없습니다");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("preview-canvas");
    expect(html).not.toContain("<img");
  });

  it("blocks a scene whose transform accessor throws instead of surfacing the error", () => {
    const hostile = scene(IDENTITY);
    Object.defineProperty(hostile.design, "imgT", {
      get() {
        throw new Error("HOSTILE_ACCESSOR_MARKER");
      },
    });
    const { reader, load } = forbiddenReader();
    const html = renderToStaticMarkup(
      <SpacePostAuthFrameView scene={hostile} catalogReader={reader} />,
    );
    expect(load).not.toHaveBeenCalled();
    expect(html).toContain("이 시안은 지금 화면에 표시할 수 없습니다");
    expect(html).not.toContain("HOSTILE_ACCESSOR_MARKER");
  });

  it("offers no retry control and no automatic recovery affordance", () => {
    const { html } = renderBlocked(IDENTITY);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("다시 시도");
    expect(html).not.toContain("space-frame-retry");
  });

  it("exposes no internal code, url, token, password or catalog id", () => {
    const { html } = renderBlocked(IDENTITY);
    for (const secret of [
      "SPACE_PROOF_ORIENTATION_UNCONFIRMED",
      "SPACE_PROOF_TRANSFORM_UNSUPPORTED",
      "SPACE_PROOF_TRANSFORM_INVALID",
      "SPACE_VIEW_ORIENTATION_UNCONFIRMED",
      "SPACE_VIEW_TRANSFORM_UNSUPPORTED",
      "space-scene-v1",
      "SPEC_063_TEMPLATE_ID",
      "SPEC_063_SIZE_ID",
      "SPEC_063_COLOR_ID",
      "firebasestorage",
      "https://",
      "proofs",
    ]) {
      expect(html).not.toContain(secret);
    }
  });

  it("announces the stop and labels the section with its own heading", () => {
    const { html } = renderBlocked(IDENTITY);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-labelledby="space-frame-blocked-title"');
    expect(html).toContain('id="space-frame-blocked-title"');
  });

  // spec 087 (spec 084 F-3): the gate no longer prints a title above this notice, so the notice's
  // own heading became the page heading. Only the LEVEL moved — the text, the class and the id
  // that `aria-labelledby` resolves against are unchanged, so the section keeps its name.
  it("carries the page heading itself, with the labelling relationship intact", () => {
    const { html } = renderBlocked(IDENTITY);
    expect(html).toContain(
      '<h1 class="denn-space-blocked__title" id="space-frame-blocked-title">이 시안은 지금 화면에 표시할 수 없습니다</h1>',
    );
    expect(html).not.toContain("<h2");
    expect(html.split("<h1").length - 1).toBe(1);
  });
});
