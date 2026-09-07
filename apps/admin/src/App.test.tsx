import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => vi.unstubAllEnvs());

it("offers the preparation entry and local tools without demos or enabled remote work", () => {
  vi.stubEnv("VITE_DENN_ADMIN_FIREBASE_ENABLED", "false");
  vi.stubEnv("VITE_DENN_ADMIN_WRITE_ENABLED", "false");
  vi.stubEnv("VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED", "false");
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain("운영자 작업 준비");
  expect(html).toContain("작업에 필요한 도구와 연결 상태를 확인하세요.");
  expect(html).toContain("액자 인쇄 실물 치수");
  expect(html).toContain("운영자 원격 읽기가 아직 활성화되지 않았습니다.");
  for (const removed of ["데모", "보기 옵션", "담당자", "필수 항목입니다", "카카오로 주문"]) {
    expect(html).not.toContain(removed);
  }
  expect(html).not.toContain("<button");
  expect(html).not.toContain('data-testid="space-v2-issue-panel"');
});
