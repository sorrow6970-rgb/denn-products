import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { MOCKUP_PORT } from "../../playwright.config";

const URL = `http://localhost:${MOCKUP_PORT}/`;
const ROOT = "docs/rebuild/results/spec-096";
const sizes = [
  { id: "SECRET_A", name: "작은 크기", printWidthCm: 20, printHeightCm: 30 },
  { id: "SECRET_B", name: "큰 크기", printWidthCm: 40, printHeightCm: 50 },
  { id: "SECRET_C", name: "가로 크기", printWidthCm: 50, printHeightCm: 20 },
  { id: "SECRET_D", name: "미확인 크기" },
];
const rows: string[] = [];
test.use({ launchOptions: { args: ["--disable-partial-raster"] } });

async function open(page: Page, frameSizes: unknown = sizes) {
  const counts = { catalog: 0, external: 0, console: 0 };
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) counts.console++;
  });
  page.on("pageerror", () => counts.console++);
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === buildPublicCatalogUrl()) {
      counts.catalog++;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ frameSizes }),
      });
    }
    if (new globalThis.URL(url).origin === new globalThis.URL(URL).origin) return route.continue();
    counts.external++;
    return route.abort();
  });
  await page.goto(URL);
  await expect(page.getByTestId("catalog-status")).toHaveText("카탈로그 준비 완료");
  await page.getByRole("button", { name: "액자", exact: true }).click();
  return counts;
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`relative print comparison ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const counts = await open(page);
    const panel = page.getByTestId("print-size-comparison");
    const summary = panel.locator("summary");
    await expect(panel).not.toHaveAttribute("open", "");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    const a = panel.getByRole("combobox", { name: "비교 크기 A", exact: true });
    const b = panel.getByRole("combobox", { name: "비교 크기 B", exact: true });
    await expect(a).toBeFocused();
    expect(await a.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
    await a.selectOption("size-0");
    await expect(panel.locator("svg")).toHaveCount(0);
    // An option inside a wrapping label is retargeted to its select by toBeDisabled.
    // Inspect the native option itself, then prove keyboard navigation skips it.
    await expect(b.locator('option[value="size-0"]')).toHaveJSProperty("disabled", true);
    await b.press("ArrowDown");
    await expect(b).toHaveValue("size-1");
    const rects = panel.locator("svg rect");
    await expect(rects).toHaveCount(2);
    await expect(rects.nth(0)).toHaveAttribute("width", "32");
    await expect(rects.nth(1)).toHaveAttribute("width", "64");
    await expect(rects.nth(1)).toHaveAttribute("height", "80");
    await expect(panel.locator("select option")).toHaveCount(8);
    const metrics = await panel.evaluate((element) => ({
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      heights: [...element.querySelectorAll("summary,select,button")].map(
        (item) => item.getBoundingClientRect().height,
      ),
      leak: /SECRET_|https?:|WRITE_/.test(element.outerHTML),
    }));
    expect(metrics.overflow).toBe(0);
    expect(metrics.heights.every((height) => height >= 44)).toBe(true);
    expect(metrics.leak).toBe(false);
    await expect(page.locator("canvas")).toHaveCount(0);
    const axe = await new AxeBuilder({ page })
      .include('[data-testid="print-size-comparison"]')
      .analyze();
    expect(
      axe.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
    ).toEqual([]);
    mkdirSync(ROOT, { recursive: true });
    const file = `comparison-${viewport.width}x${viewport.height}.png`;
    await panel.screenshot({ path: `${ROOT}/${file}` });
    const hash = createHash("sha256")
      .update(readFileSync(`${ROOT}/${file}`))
      .digest("hex");
    rows.push(
      `| ${file} | ${hash} | overflow ${metrics.overflow}; 44px PASS; axe serious/critical 0 |`,
    );
    await b.selectOption("size-2");
    await expect(rects.nth(1)).toHaveAttribute("width", "80");
    await expect(rects.nth(1)).toHaveAttribute("height", "32");
    await panel.getByRole("button", { name: "비교 선택 해제" }).click();
    await expect(panel.locator("svg")).toHaveCount(0);
    await expect(a).toHaveValue("");
    await expect(b).toHaveValue("");
    await a.selectOption("size-0");
    await page.getByRole("button", { name: "휴대폰 케이스", exact: true }).click();
    await expect(panel).toHaveCount(0);
    await page.getByRole("button", { name: "액자", exact: true }).click();
    await expect(panel).not.toHaveAttribute("open", "");
    await summary.click();
    await expect(a).toHaveValue("");
    await expect(b).toHaveValue("");
    expect(counts).toEqual({ catalog: 1, external: 0, console: 0 });
  });
}
test("zero or one usable size has no comparison entry", async ({ page }) => {
  for (const entries of [[], [sizes[0]], [sizes[0], sizes[3]]]) {
    await page.unrouteAll();
    const counts = await open(page, entries);
    await expect(page.getByTestId("print-size-comparison")).toHaveCount(0);
    expect(counts.external).toBe(0);
  }
});
test.afterAll(() => {
  if (rows.length !== 3) return;
  writeFileSync(
    `${ROOT}/README.md`,
    `# Spec096 — 인쇄 크기 상대 비교 증거\n\nPRODUCT_ROUTE / ${URL}, 합성 catalog만 사용. 사용자 데이터/실제 서비스0.\n선택: 액자 → 인쇄 크기 비교 → A 작은 크기/B 큰 크기. Selector: print-size-comparison.\n3 viewport, 동일 축척 SVG. 실제 액자/방/실기기/스크린리더 NOT TESTED. 시각 판정은096검수 참조.\n\n| PNG | SHA256 | 측정 |\n|---|---|---|\n${rows.sort().join("\n")}\n`,
  );
});
