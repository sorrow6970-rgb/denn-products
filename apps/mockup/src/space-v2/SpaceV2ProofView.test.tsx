import type { PreviewRenderPlan } from "@denn/render";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildFrameProductPlan } from "../canvas/productPlan";
import type { PreviewImageBindings } from "../canvas/types";
import { SpaceV2ProofView } from "./SpaceV2ProofView";

const IMAGE_REF = "user-image-1";
const drawable = { tag: "synthetic-drawable" } as unknown as CanvasImageSource;
const bindings: PreviewImageBindings = {
  get: (imageRef) => (imageRef === IMAGE_REF ? drawable : undefined),
};

function plan(): PreviewRenderPlan {
  const built = buildFrameProductPlan({
    geometry: {
      aspect: 1.5,
      borderPercentOfWidth: 4,
      matColor: "#FFFFFF",
      contentInsetPx: 8,
      textZones: [],
      clockPreview: null,
    },
    frameColor: "#9F887A",
    logicalWidth: 320,
    userImage: {
      imageRef: IMAGE_REF,
      intrinsicSize: { width: 1600, height: 2400 },
      transform: { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 },
    },
  });
  if (!built.ok) throw new Error("expected a valid synthetic plan");
  return built.plan;
}

describe("SpaceV2ProofView", () => {
  it("shows the saved proof as the single primary visual with the agreed copy", () => {
    const built = plan();
    const html = renderToStaticMarkup(<SpaceV2ProofView plan={built} imageBindings={bindings} />);

    expect(html).toContain("저장된 시안 · 열람 전용");
    expect(html).toContain("내 공간 시안");
    expect(html).toContain("저장된 액자 구성을 확인할 수 있습니다.");
    expect(html).toContain('aria-label="저장된 액자 시안"');
    expect(html).toContain('data-testid="preview-canvas"');
    // The canvas keeps the plan's own logical size.
    expect(html).toContain(`width:${built.logicalCanvas.width}px`);
    expect(html).toContain(`height:${built.logicalCanvas.height}px`);
  });

  it("offers no download, order, share or retry affordance and no placeholder image", () => {
    const html = renderToStaticMarkup(<SpaceV2ProofView plan={plan()} imageBindings={bindings} />);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("다운로드");
    expect(html).not.toContain("주문");
    expect(html).not.toContain("공유");
    expect(html).not.toContain("다시 시도");
  });

  it("prints no code, path, token or URL", () => {
    const html = renderToStaticMarkup(<SpaceV2ProofView plan={plan()} imageBindings={bindings} />);
    for (const secret of [
      "SPACE_V2",
      "rebuild-space-assets",
      "blob:",
      "https://",
      "firebasestorage",
      IMAGE_REF,
    ]) {
      expect(html).not.toContain(secret);
    }
  });

  it("names the section by its heading for assistive technology", () => {
    const html = renderToStaticMarkup(<SpaceV2ProofView plan={plan()} imageBindings={bindings} />);
    expect(html).toContain('aria-labelledby="space-v2-proof-title"');
    expect(html).toContain('id="space-v2-proof-title"');
    // spec 087: it is the page heading now, and the id the section is named by is unchanged
    expect(html).toContain('<h1 id="space-v2-proof-title">내 공간 시안</h1>');
    expect(html).not.toContain("<h2");
  });
});
