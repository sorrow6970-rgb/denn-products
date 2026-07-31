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
    // scoped to the COLOUR swatches: since spec 029 the active photo slot is legitimately pressed,
    // so a document-wide assertion would no longer be about colour auto-selection.
    expect(markup).not.toMatch(/aria-pressed="true" data-testid="preview-color-/);
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

// --- pan/zoom editing controls (spec 029) -----------------------------------
// A static render proves the CONTROL contract before any interaction: real buttons and a real range,
// the slot picker with an active slot, and everything disabled while no photo is ready. Dragging,
// wheel, keyboard and pixels are verified in a real browser by the E2E suite.

describe("PreviewComposer — pan/zoom controls", () => {
  it("offers a range for the scale and real buttons for zoom, reset and pan", () => {
    const markup = caseComposer();
    expect(markup).toContain('data-testid="preview-edit"');
    expect(markup).toContain('type="range" min="100" max="500" step="1"');
    expect(markup).toContain('data-testid="preview-scale-value">100%');
    for (const testId of [
      "preview-zoom-in",
      "preview-zoom-out",
      "preview-reset",
      "preview-pan-left",
      "preview-pan-right",
      "preview-pan-up",
      "preview-pan-down",
    ]) {
      expect(markup).toContain(
        `<button type="button" class="denn-composer__clear" data-testid="${testId}"`,
      );
    }
    expect(markup).toContain("원래대로");
    // exactly one reset control: the legacy "맞춤" + "↺" duplication is not reproduced (D-5)
    expect(markup.match(/원래대로/g)).toHaveLength(1);
  });

  it("disables every editing control until the active slot's photo is ready", () => {
    const markup = caseComposer();
    expect(markup).toContain("사진을 선택하면 위치와 크기를 조절할 수 있습니다.");
    const disabled = markup.match(/disabled=""/g) ?? [];
    // range + 2 zoom + reset + 2 rotate (spec 030) + 4 pan
    expect(disabled).toHaveLength(10);
  });

  it("keeps the slot picker on its own class so it never matches a colour swatch", () => {
    const markup = caseComposer();
    expect(markup).toContain('class="denn-preview-edit__slot"');
    expect(markup).not.toMatch(/denn-composer__swatch" aria-pressed="true"/);
  });

  it("marks one active slot for a multi-zone case and none for the second", () => {
    const markup = caseComposer();
    expect(markup).toContain('aria-pressed="true" data-testid="preview-edit-slot-case-zone-0"');
    expect(markup).toContain('aria-pressed="false" data-testid="preview-edit-slot-case-zone-1"');
    expect(markup).toContain("편집 중");
    expect(markup.match(/편집 중/g)).toHaveLength(1);
  });

  it("shows no slot picker for the single frame slot", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="frame"
        document={frameDoc([{ id: "black", name: "블랙", fill: "#1A1A1A" }])}
        modelId={null}
        frameSizeId="fs1"
        templateId="full"
      />,
    );
    expect(markup).toContain('data-testid="preview-edit"');
    expect(markup).not.toContain("preview-edit-slot-");
    expect(markup).not.toContain("편집할 사진");
  });

  it("adds no touch-action, gesture capture or pointer surface before a canvas exists", () => {
    const markup = caseComposer();
    expect(markup).not.toContain("touch-action");
    expect(markup).not.toContain('data-testid="preview-edit-area"');
    expect(markup).not.toContain("<canvas");
  });

  it("keeps the editing controls out of a product with no slots", () => {
    const markup = renderToStaticMarkup(
      <PreviewComposer
        productKind="case"
        document={CASE_DOC}
        modelId={null}
        frameSizeId={null}
        templateId="ct1"
      />,
    );
    expect(markup).not.toContain('data-testid="preview-edit"');
  });
});

// --- spec 030: rotation controls --------------------------------------------
//
// SCOPE: a static render proves the controls EXIST, are real buttons, are named exactly as the
// approved copy and share the pan/zoom disabled gate. Actual rotated pixels, the modulo-4 stepping
// through real clicks and the per-slot independence are asserted in the real browser by
// `tests/e2e/mockup-preview.spec.ts`.

describe("PreviewComposer — rotation controls (spec 030)", () => {
  it("offers exactly one left and one right quarter-turn button", () => {
    const markup = caseComposer();
    expect(markup).toContain('data-testid="preview-rotate-left"');
    expect(markup).toContain('data-testid="preview-rotate-right"');
    // quarter turns only: no free-angle input of any kind reaches the customer (R-1/R-2)
    expect(markup).not.toContain('data-testid="preview-rotation-angle"');
    expect(markup).not.toContain("45°");
  });

  it("names them with the approved copy and nothing else", () => {
    const markup = caseComposer();
    expect(markup).toContain("왼쪽으로 90°");
    expect(markup).toContain("오른쪽으로 90°");
    expect(markup).toContain("사진 회전");
  });

  it("uses real buttons, not a canvas gesture or a div", () => {
    const markup = caseComposer();
    for (const testId of ["preview-rotate-left", "preview-rotate-right"]) {
      const index = markup.indexOf(`data-testid="${testId}"`);
      expect(index).toBeGreaterThan(-1);
      // the tag that owns the testid is a <button type="button">
      const open = markup.lastIndexOf("<", index);
      expect(markup.slice(open, index)).toContain("button");
      expect(markup.slice(open, index)).toContain('type="button"');
    }
  });

  it("shares the same disabled gate as every other editing control", () => {
    const markup = caseComposer();
    const left = markup.indexOf('data-testid="preview-rotate-left"');
    const right = markup.indexOf('data-testid="preview-rotate-right"');
    // no photo is ready in a static render, so both are disabled like the pan/zoom controls
    expect(markup.slice(left, left + 200)).toContain("disabled");
    expect(markup.slice(right, right + 200)).toContain("disabled");
  });
});

// --- spec 031: text inputs and the physical clock overlay ---------------------
//
// SCOPE: a static render proves the controls EXIST with the approved copy and caps. Typing, IME,
// caps enforcement, real pixels and the clock's ticking are asserted in the Chromium E2E.

const frameTextDoc = (template: Record<string, unknown>): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 }],
      frameTemplates: [{ id: "ft1", name: "액자", type: "uploaded", ...template }],
      frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
    },
  }) as unknown as CatalogDocumentV1;

const textZoneFixture = (over: Record<string, unknown> = {}) => ({
  key: "main",
  x: 50,
  y: 20,
  boxW: 80,
  fontSize: 6,
  align: "center",
  font: "DM Sans",
  bold: false,
  italic: false,
  color: "#111111",
  lineH: 1.25,
  letterSpacing: 0,
  rotation: 0,
  ...over,
});

const frameTextMarkup = (template: Record<string, unknown>): string =>
  renderToStaticMarkup(
    <PreviewComposer
      productKind="frame"
      document={frameTextDoc(template)}
      modelId={null}
      frameSizeId="fs1"
      templateId="ft1"
    />,
  );

describe("PreviewComposer — customer text (spec 031)", () => {
  it("offers an input only for the keys THIS template defines", () => {
    const markup = frameTextMarkup({
      textZones: [textZoneFixture({ key: "main" }), textZoneFixture({ key: "date" })],
    });
    expect(markup).toContain('data-testid="preview-text-main"');
    expect(markup).toContain('data-testid="preview-text-date"');
    // keys the template does not define are not rendered at all
    expect(markup).not.toContain('data-testid="preview-text-name"');
    expect(markup).not.toContain('data-testid="preview-text-sub"');
  });

  it("says so plainly when the template takes no text", () => {
    const markup = frameTextMarkup({ textZones: [] });
    expect(markup).toContain("이 템플릿은 문구를 받지 않습니다.");
    expect(markup).not.toContain('data-testid="preview-text-main"');
  });

  it("applies the approved default caps to the input itself", () => {
    const markup = frameTextMarkup({ textZones: [textZoneFixture()] });
    const index = markup.indexOf('data-testid="preview-text-main"');
    const tag = markup.slice(markup.lastIndexOf("<", index), markup.indexOf(">", index));
    expect(tag).toContain('maxLength="80"');
    expect(markup).toContain("0 / 80");
  });

  it("honours a zone's own cap", () => {
    const markup = frameTextMarkup({ textZones: [textZoneFixture({ maxChars: 12 })] });
    const index = markup.indexOf('data-testid="preview-text-main"');
    const tag = markup.slice(markup.lastIndexOf("<", index), markup.indexOf(">", index));
    expect(tag).toContain('maxLength="12"');
    expect(markup).toContain("0 / 12");
  });

  it("starts EMPTY even when the operator authored a default text (Founder F-3)", () => {
    const markup = frameTextMarkup({
      textZones: [textZoneFixture()],
      defaultTexts: { main: "WEDDING" },
    });
    // the operator's sample must never become the customer's value
    expect(markup).not.toContain('value="WEDDING"');
    expect(markup).toContain("0 / 80");
  });

  it("labels every input and links its hint for assistive tech", () => {
    const markup = frameTextMarkup({ textZones: [textZoneFixture()] });
    expect(markup).toContain('for="denn-preview-text-main"');
    expect(markup).toContain('id="denn-preview-text-main"');
    expect(markup).toContain('aria-describedby="denn-preview-text-main-hint"');
    expect(markup).toContain("메인 문구");
  });

  it("offers no colour or shadow control for the customer (Founder F-2)", () => {
    const markup = frameTextMarkup({ textZones: [textZoneFixture()] });
    expect(markup).not.toContain('data-testid="preview-text-color"');
    expect(markup).not.toContain('data-testid="preview-text-shadow"');
    expect(markup).not.toContain('type="color"');
  });

  it("keeps the case product free of text inputs (Founder F-1)", () => {
    const markup = caseComposer();
    expect(markup).not.toContain('data-testid="preview-text-main"');
    expect(markup).not.toContain("문구 입력");
  });

  it("shows no clock overlay before a canvas exists", () => {
    const markup = frameTextMarkup({ textZones: [textZoneFixture()] });
    // no colour or photo is chosen in a static render, so there is no surface to overlay
    expect(markup).not.toContain('data-testid="preview-clock"');
  });
});

// --- spec 031 보완 라운드 1 -----------------------------------------------

describe("PreviewComposer — requested font availability (보완 1 §3)", () => {
  it("still renders the text inputs when no font can be checked yet", () => {
    // `document.fonts` does not exist in this node render; the INPUTS are unaffected because the
    // availability gate only decides whether a PLAN may be measured, never whether the customer
    // may type.
    const markup = frameTextMarkup({ textZones: [textZoneFixture()] });
    expect(markup).toContain('data-testid="preview-text-main"');
    expect(markup).not.toContain("<canvas");
  });

  it("keeps a text-free frame working with no font check at all", () => {
    const markup = frameTextMarkup({ textZones: [] });
    expect(markup).toContain("이 템플릿은 문구를 받지 않습니다.");
    expect(markup).not.toContain("<canvas");
  });
});

// --- spec 033: local print download -----------------------------------------

/** A frame size that declares the operator-authored centimetres (spec 032). */
const printDoc = (size: Record<string, unknown>): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5, ...size }],
      frameTemplates: [{ id: "ft1", name: "액자", type: "uploaded" }],
      frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
    },
  }) as unknown as CatalogDocumentV1;

const printMarkup = (size: Record<string, unknown>): string =>
  renderToStaticMarkup(
    <PreviewComposer
      productKind="frame"
      document={printDoc(size)}
      modelId={null}
      frameSizeId="fs1"
      templateId="ft1"
    />,
  );

describe("PreviewComposer — local print download (spec 033)", () => {
  it("shows the download button in its own area", () => {
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    expect(markup).toContain('data-testid="print-export"');
    expect(markup).toContain("인쇄용 파일 내려받기");
  });

  it("always states that the print settings are provisional, without the numbers (E-6)", () => {
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    expect(markup).toContain("인쇄 설정은 인쇄소 확인 전 임시값입니다.");
    // the provisional constants are never shown to the customer
    for (const value of ["300", "3000", "36000000", "36,000,000", "dpi", "DPI"]) {
      expect(markup.includes(value), value).toBe(false);
    }
  });

  it("never calls the download an order (P-4a)", () => {
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    const printBlock = markup.slice(markup.indexOf('data-testid="print-export"'));
    expect(printBlock).not.toContain("주문");
    expect(printBlock).not.toContain("카카오");
  });

  it("disables the button and explains why when the size declares no centimetres", () => {
    const markup = printMarkup({});
    expect(markup).toContain("이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다.");
    expect(markup).toContain('aria-describedby="denn-print-reason"');
    expect(markup).toContain("disabled");
  });

  it("reuses the existing preview reason when the plan is not ready", () => {
    // centimetres are declared, but no colour or photo is chosen in a static render
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    expect(markup).toContain("미리보기를 만들 수 없습니다.");
    expect(markup).toContain('aria-describedby="denn-print-reason"');
    // the cm reason is NOT shown at the same time — one reason at a time
    expect(markup).not.toContain("이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다.");
  });

  it("ties the disabled reason to the button for assistive tech (E-5)", () => {
    const markup = printMarkup({});
    expect(markup).toContain('id="denn-print-reason"');
    expect(markup).toContain('aria-describedby="denn-print-reason"');
  });

  it("shows no failure message before anything was attempted", () => {
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    expect(markup).not.toContain("인쇄용 파일을 만들지 못했습니다.");
    expect(markup).not.toContain("다시 시도");
  });

  it("offers no download for the case product (P-1)", () => {
    expect(caseComposer()).not.toContain('data-testid="print-export"');
    expect(caseComposer()).not.toContain("인쇄용 파일 내려받기");
  });

  it("leaks no code, URL, pixel size or customer word into the DOM", () => {
    const markup = printMarkup({ printWidthCm: 21, printHeightCm: 29.7 });
    const printBlock = markup.slice(markup.indexOf('data-testid="print-export"'));
    for (const leak of ["blob:", "INVALID_", "ENCODE_FAILED", "denn-frame-", ".png", "2480"]) {
      expect(printBlock.includes(leak), leak).toBe(false);
    }
  });
});
