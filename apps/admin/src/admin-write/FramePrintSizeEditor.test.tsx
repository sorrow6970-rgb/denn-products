import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminStateBaselineValue } from "@denn/firebase/admin-write";
import type { AdminWriteSessionController, AdminWriteSessionSnapshot } from "./session-controller";
import { evaluateFramePrintSizeDraft, FramePrintSizeEditor } from "./FramePrintSizeEditor";

const baseline: AdminStateBaselineValue = {
  revision: 7,
  source: "rebuild",
  promotedLegacyPrintSizeIds: [],
  catalog: {
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameSizes: [
        { id: "a4", name: "A4", printWidthCm: 21, printHeightCm: 29.7 },
        { id: "blank", name: "Blank" },
        {
          id: "legacy",
          name: "Legacy",
          wcm: 10,
          hcm: 20,
          printWidthCm: 10,
          printHeightCm: 20,
        },
      ],
    },
  },
};

function controller(over: Partial<AdminWriteSessionSnapshot> = {}): AdminWriteSessionController {
  const snapshot: AdminWriteSessionSnapshot = {
    status: "ready-clean",
    revision: 7,
    source: "rebuild",
    errorCode: null,
    canLoad: true,
    canEdit: true,
    canSave: false,
    ...over,
  };
  return {
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    getBaseline: () => baseline,
    loadBaseline: vi.fn(async () => undefined),
    setDraftState: vi.fn(),
    save: vi.fn(async () => undefined),
    dispose: vi.fn(),
  };
}

describe("FramePrintSizeEditor isolated markup", () => {
  it("lists stable ids but auto-selects none and cannot save a clean baseline", () => {
    const html = renderToStaticMarkup(<FramePrintSizeEditor controller={controller()} />);
    expect(html).toContain('value="a4"');
    expect(html).toContain('value="blank"');
    expect(html).toMatch(
      /<option value="legacy" disabled="">Legacy \(레거시 읽기 전용\)<\/option>/,
    );
    expect(html).toContain("사이즈를 선택하세요");
    expect(html).not.toContain('option value="a4" selected');
    expect(html).toContain("변경 저장</button>");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>변경 저장<\/button>/);
  });

  // spec 086 (spec 084 F-5): the size picker carries the component's own class so its 44px
  // surface can exist without a global `select` rule. These assert the WIRING only — a computed
  // height cannot be read out of an SSR string, so the pixel contract is asserted in Chromium.
  it("labels the size picker and carries the component select class on it", () => {
    const html = renderToStaticMarkup(<FramePrintSizeEditor controller={controller()} />);
    expect(html).toContain('<label for="frame-print-size-id">액자 사이즈</label>');
    expect(html).toMatch(
      /<select class="denn-frame-print-size-editor__select" id="frame-print-size-id"/,
    );
  });

  it("puts that class on the select and on nothing else", () => {
    const html = renderToStaticMarkup(<FramePrintSizeEditor controller={controller()} />);
    expect(html.split("denn-frame-print-size-editor__select").length - 1).toBe(1);
    // the neighbouring inputs keep the shared @denn/ui class; the editor does not restyle them
    expect(html).toContain("denn-field__input");
  });

  it("keeps controls locked when auth is blocked", () => {
    const html = renderToStaticMarkup(
      <FramePrintSizeEditor
        controller={controller({
          status: "auth-blocked",
          revision: null,
          source: null,
          canLoad: false,
          canEdit: false,
        })}
      />,
    );
    expect(html).toContain("운영자 로그인이 필요합니다.");
    expect(html).toMatch(/<select[^>]*disabled=""/);
    // spec 086: the disabled picker keeps its class, so the disabled cue is styled rather than lost
    expect(html).toMatch(/<select class="denn-frame-print-size-editor__select"[^>]*disabled=""/);
    expect(html).not.toContain("abcdef");
  });

  it.each([
    ["conflict", "다른 저장이 먼저 반영됐습니다"],
    ["outcome-unknown", "저장 결과를 확인할 수 없습니다"],
  ] as const)("shows a safe %s message without identifiers", (status, message) => {
    const html = renderToStaticMarkup(
      <FramePrintSizeEditor controller={controller({ status, canEdit: false, canSave: false })} />,
    );
    expect(html).toContain(message);
    expect(html).not.toContain("rebuild-admin-state");
    expect(html).not.toContain("@denn");
  });
});

describe("evaluateFramePrintSizeDraft", () => {
  const item = baseline.catalog.data.frameSizes?.[0];
  if (item === undefined) throw new Error("missing fixture");

  it("marks a changed partial pair dirty and invalid", () => {
    expect(evaluateFramePrintSizeDraft(baseline.catalog, item, "22", "")).toEqual({
      dirty: true,
      valid: false,
      candidate: null,
    });
  });

  it("treats equivalent decimal notation as a clean valid value", () => {
    expect(evaluateFramePrintSizeDraft(baseline.catalog, item, "21.0", "29.70")).toEqual({
      dirty: false,
      valid: true,
      candidate: null,
    });
  });

  it("returns a whole-document candidate for a valid change", () => {
    const result = evaluateFramePrintSizeDraft(baseline.catalog, item, "22", "30");
    expect(result.dirty).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.candidate?.data.frameSizes?.[0]).toMatchObject({
      id: "a4",
      printWidthCm: 22,
      printHeightCm: 30,
    });
    expect(baseline.catalog.data.frameSizes?.[0]).toMatchObject({
      printWidthCm: 21,
      printHeightCm: 29.7,
    });
  });
});
