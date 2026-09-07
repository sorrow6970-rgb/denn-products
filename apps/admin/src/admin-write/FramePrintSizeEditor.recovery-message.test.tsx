import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { AdminWriteErrorCode } from "@denn/firebase/admin-write";
import { FramePrintSizeEditor } from "./FramePrintSizeEditor";
import type { AdminWriteSessionController, AdminWriteSessionSnapshot } from "./session-controller";

function render(snapshot: AdminWriteSessionSnapshot) {
  const controller: AdminWriteSessionController = {
    getSnapshot: () => snapshot,
    getBaseline: () => ({
      revision: 3,
      source: "rebuild",
      promotedLegacyPrintSizeIds: [],
      catalog: { schemaVersion: 1, migratedFrom: "legacy-v0", data: {} },
    }),
    subscribe: () => () => undefined,
    loadBaseline: vi.fn(async () => undefined),
    save: vi.fn(async () => undefined),
    setDraftState: vi.fn(),
    dispose: vi.fn(),
  };
  const html = renderToStaticMarkup(<FramePrintSizeEditor controller={controller} />);
  expect(controller.loadBaseline).not.toHaveBeenCalled();
  expect(controller.save).not.toHaveBeenCalled();
  expect(controller.setDraftState).not.toHaveBeenCalled();
  expect(html).toContain('role="status" aria-live="polite" data-testid="frame-print-size-status"');
  expect(html).not.toMatch(/WRITE_|rebuild-admin-state|@denn|https?:\/\//);
  return html;
}

const SAVE_ERRORS: readonly AdminWriteErrorCode[] = [
  "WRITE_UPLOAD_FAILED",
  "WRITE_HEAD_FAILED",
  "WRITE_CLAIM_FAILED",
  "WRITE_AUTH_REQUIRED",
  "WRITE_FORBIDDEN",
  "WRITE_INVALID_INPUT",
];
it.each(SAVE_ERRORS)("names the allowed recovery action without exposing %s", (errorCode) => {
  const canSave = errorCode === "WRITE_UPLOAD_FAILED";
  const html = render({
    status: "save-error",
    revision: 3,
    source: "rebuild",
    errorCode,
    canLoad: true,
    canEdit: false,
    canSave,
  });
  const saveButton = html.match(/<button[^>]*>변경 저장<\/button>/)?.[0];
  expect(saveButton).toBeDefined();
  expect(saveButton?.includes('disabled=""')).toBe(!canSave);
  expect(html).toContain(
    canSave
      ? "저장하지 못했습니다. 변경 저장 버튼을 눌러 다시 시도할 수 있습니다."
      : "저장하지 못했습니다. 편집 기준 불러오기 버튼을 눌러 최신 상태를 확인하세요.",
  );
  expect(html).not.toContain("상태를 확인한 뒤 명시적으로 다시 시도하세요");
});

it.each([
  ["conflict", "다른 저장이 먼저 반영됐습니다. 최신 상태를 다시 불러오세요."],
  ["outcome-unknown", "저장 결과를 확인할 수 없습니다. 최신 상태를 다시 불러오세요."],
  ["auth-blocked", "운영자 로그인이 필요합니다."],
] as const)("preserves the existing %s message", (status, text) => {
  const html = render({
    status,
    revision: status === "auth-blocked" ? null : 3,
    source: status === "auth-blocked" ? null : "rebuild",
    errorCode: null,
    canLoad: status !== "auth-blocked",
    canEdit: false,
    canSave: false,
  });
  expect(html).toContain(text);
  expect(html).not.toContain("저장하지 못했습니다.");
});
