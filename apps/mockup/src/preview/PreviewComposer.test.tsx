// Component contract for the preview composer (spec 027). Rendered with react-dom/server in the
// node environment — no jsdom, no browser image API.
//
// SCOPE: a static render proves what exists BEFORE any interaction — the explicit open step, the
// absence of an auto-selected colour, and that no Canvas is created without a colour and images.
// Real picking, decoding, pixels, resize and cleanup are verified in a real browser by
// `tests/e2e/mockup-preview.spec.ts`.

import type { CatalogDocumentV1 } from "@denn/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewComposer } from "./PreviewComposer";
import { PreviewSection } from "./PreviewSection";

const CASE_DOC = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
    caseTemplates: [
      {
        id: "ct1",
        name: "케이스 알파",
        type: "uploaded",
        photoZones: [
          { x: 5, y: 5, w: 40, h: 40 },
          { x: 55, y: 5, w: 40, h: 40 },
        ],
      },
    ],
  },
} as unknown as CatalogDocumentV1;

const frameDoc = (frameColors: unknown): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 }],
      frameTemplates: [{ id: "full", name: "기본 액자", type: "builtin" }],
      frameColors,
    },
  }) as unknown as CatalogDocumentV1;

const caseComposer = (): string =>
  renderToStaticMarkup(
    <PreviewComposer
      productKind="case"
      document={CASE_DOC}
      modelId="m1"
      frameSizeId={null}
      templateId="ct1"
    />,
  );

describe("PreviewSection", () => {
  it("offers an explicit open step and builds nothing before it is used", () => {
    const markup = renderToStaticMarkup(
      <PreviewSection
        productKind="case"
        document={CASE_DOC}
        modelId="m1"
        frameSizeId={null}
        templateId="ct1"
      />,
    );
    expect(markup).toContain("미리보기 만들기");
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("색상");
  });
});

describe("PreviewComposer — before any choice", () => {
  it("shows every case colour with none pre-selected", () => {
    const markup = caseComposer();
    expect(markup).toContain("#1A1A1A");
    expect(markup).toContain("블랙");
    expect(markup).toContain("라벤더");
    expect(markup).not.toContain('aria-pressed="true"');
  });

  it("creates no Canvas until a colour and every image are ready", () => {
    const markup = caseComposer();
    expect(markup).not.toContain("<canvas");
    expect(markup).toContain("색상을 선택해 주세요.");
  });

  it("gives every case zone its own file input (no shared photo)", () => {
    const markup = caseComposer();
    expect(markup).toContain('data-testid="preview-file-case-zone-0"');
    expect(markup).toContain('data-testid="preview-file-case-zone-1"');
    expect(markup).toContain("사진 1");
    expect(markup).toContain("사진 2");
  });

  it("shows one frame input and only the supported solid colours", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameDoc([
          { id: "black", name: "블랙", fill: "#1A1A1A" },
          { id: "oak", name: "원목 오크", fill: "#A07848", grain: true },
          { id: "bad", name: "이상한", fill: "red" },
        ])}
        modelId={null}
        frameSizeId="fs1"
        templateId="full"
      />,
    );
    expect(markup).toContain('data-testid="preview-file-frame-image"');
    expect(markup).not.toContain("preview-file-case-zone-0");
    expect(markup).toContain("블랙");
    expect(markup).not.toContain("원목 오크");
    expect(markup).not.toContain("이상한");
    expect(markup).not.toContain("<canvas");
  });

  it("says so safely when no supported colour exists, and builds nothing", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameDoc([{ id: "oak", name: "원목", fill: "#A07848", grain: true }])}
        modelId={null}
        frameSizeId="fs1"
        templateId="full"
      />,
    );
    expect(markup).toContain("선택할 수 있는 색상이 없습니다.");
    expect(markup).not.toContain("<canvas");
  });

  it("closes safely when the geometry cannot be projected", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="case"
        document={CASE_DOC}
        modelId="missing-model"
        frameSizeId={null}
        templateId="ct1"
      />,
    );
    expect(markup).toContain("미리보기를 만들 수 없습니다.");
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toContain("missing-model");
  });

  it("renders ONE swatch when two catalog entries carry the same colour", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameDoc([
          { id: "a", name: "블랙 A", fill: "#1a1a1a" },
          { id: "b", name: "블랙 B", fill: "#1A1A1A" },
        ])}
        modelId={null}
        frameSizeId="fs1"
        templateId="full"
      />,
    );
    const swatches = markup.match(/data-testid="preview-color-/g) ?? [];
    expect(swatches).toHaveLength(1); // one value → one key, one test id, one pressed state
    expect(markup).toContain("블랙 A"); // the first entry's name is kept
    expect(markup).not.toContain("블랙 B");
    expect(markup).not.toContain('aria-pressed="true"'); // still nothing auto-selected
  });

  it("keeps catalog ids, codes and raw values out of the markup", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameDoc([{ id: "SECRET_COLOR_ID", name: "블랙", fill: "#1A1A1A" }])}
        modelId={null}
        frameSizeId="fs1"
        templateId="full"
      />,
    );
    for (const forbidden of [
      "SECRET_COLOR_ID",
      "ITEM_NOT_FOUND",
      "INVALID_",
      "sourceIndex",
      "schemaVersion",
      "blob:",
      "data:",
    ]) {
      expect(markup).not.toContain(forbidden);
    }
  });
});

// --- template art fail-closed (spec 028) -------------------------------------

const TRUSTED_ART =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/t.png?alt=media&token=SECRETMARKER";

const caseArtDoc = (template: Record<string, unknown>): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
      caseTemplates: [
        {
          id: "ct1",
          name: "케이스 알파",
          type: "uploaded",
          photoZones: [{ x: 5, y: 5, w: 40, h: 40 }],
          ...template,
        },
      ],
    },
  }) as unknown as CatalogDocumentV1;

const frameArtDoc = (template: Record<string, unknown>): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 }],
      frameTemplates: [{ id: "ft1", name: "액자", type: "uploaded", ...template }],
      frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
    },
  }) as unknown as CatalogDocumentV1;

const caseArtMarkup = (template: Record<string, unknown>): string =>
  renderToStaticMarkup(
    <PreviewComposer
      productKind="case"
      document={caseArtDoc(template)}
      modelId="m1"
      frameSizeId={null}
      templateId="ct1"
    />,
  );

describe("PreviewComposer — template art", () => {
  it("waits (does not claim failure) while a usable art source is still in flight", () => {
    const markup = caseArtMarkup({ dataUrl: "data:image/png;base64,QQ" });
    expect(markup).toContain("템플릿 이미지를 준비하는 중입니다.");
    expect(markup).not.toContain("<canvas");
  });

  it("blocks the preview when the art source is not trusted", () => {
    const markup = caseArtMarkup({ dataUrl: "https://untrusted.example.test/x.png" });
    expect(markup).toContain("템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.");
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toContain("untrusted.example.test");
  });

  it("blocks the preview for a legacy builder-crop frame template", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameArtDoc({ dataUrl: TRUSTED_ART, builtBy: "builder" })}
        modelId={null}
        frameSizeId="fs1"
        templateId="ft1"
      />,
    );
    expect(markup).toContain("템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.");
    expect(markup).not.toContain("<canvas");
  });

  it("keeps the normal flow for a template that simply has no art", () => {
    const markup = caseArtMarkup({});
    expect(markup).toContain("색상을 선택해 주세요.");
    expect(markup).not.toContain("템플릿 이미지");
  });

  it("keeps the normal flow for a generated detail preview", () => {
    const markup = caseArtMarkup({
      dataUrl: "data:image/png;base64,QQ",
      generatedDetailPreview: true,
    });
    expect(markup).toContain("색상을 선택해 주세요.");
    expect(markup).not.toContain("템플릿 이미지");
  });

  it("never renders the art url, token or source kind", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameArtDoc({ dataUrl: TRUSTED_ART })}
        modelId={null}
        frameSizeId="fs1"
        templateId="ft1"
      />,
    );
    for (const forbidden of [
      "SECRETMARKER",
      "firebasestorage",
      "alt=media",
      "firebase-download-image",
      "data-image",
      "https",
    ]) {
      expect(markup).not.toContain(forbidden);
    }
  });
});
