import { readLegacyCatalog } from "@denn/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { PublicCatalogUiState } from "./catalog/types";
import { MockupRoot } from "./App";

const injected = vi.hoisted(() => ({ state: { status: "idle" } as PublicCatalogUiState }));
vi.mock("./catalog/usePublicCatalog", () => ({
  usePublicCatalog: () => ({ state: injected.state, retry: () => undefined }),
}));
afterEach(() => {
  injected.state = { status: "idle" };
});
const render = () => renderToStaticMarkup(<MockupRoot search="" env={{}} />);

it.each([0, 3])(
  "keeps ready without the information badge when warningCount is %s",
  (warningCount) => {
    const result = readLegacyCatalog({ models: [] });
    if (!result.ok) throw new Error("synthetic catalog must read");
    injected.state = { status: "ready", requestId: 1, document: result.document, warningCount };
    const html = render();
    expect(html).toContain("카탈로그 준비 완료");
    expect(html).not.toContain("일부 이전 데이터가 호환 처리되었습니다");
    expect(injected.state.warningCount).toBe(warningCount);
  },
);

it("keeps the loading status", () => {
  injected.state = { status: "loading", requestId: 1 };
  expect(render()).toContain("카탈로그를 불러오는 중");
});

it("keeps invalid-catalog errors visible without adding a retry", () => {
  injected.state = { status: "error", requestId: 1, code: "INVALID_CATALOG", retryable: false };
  const html = render();
  expect(html).toContain('role="alert"');
  expect(html).toContain("카탈로그 데이터에 문제가 있습니다. 관리자에게 문의해 주세요.");
  expect(html).not.toContain('data-testid="catalog-retry"');
});
