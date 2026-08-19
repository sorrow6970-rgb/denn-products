import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MockupRoot } from "./App";

describe("MockupRoot space mode", () => {
  it.each([
    ["?space=token", "비밀번호"],
    ["?space=one&space=two", "시안 링크가 올바르지 않습니다."],
  ])("owns the screen without mounting catalog UI for %s", (search, message) => {
    const html = renderToStaticMarkup(<MockupRoot search={search} env={{}} />);
    expect(html).toContain(message);
    expect(html).not.toContain("catalog-status");
    expect(html).not.toContain("카탈로그를 불러오는 중");
  });
});
