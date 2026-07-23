import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, type Page, type Route, expect, test } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { MOCKUP_PORT } from "../../playwright.config";

const MOCKUP_URL = `http://localhost:${MOCKUP_PORT}/`;
const CATALOG_URL = buildPublicCatalogUrl();

// Synthetic minimal fixtures only — no real product names / ids / images.
const LEGACY = JSON.stringify({ models: [{ id: "m1", name: "샘플" }] });
const LEGACY_WARN = JSON.stringify({
  models: [{ id: "m1", name: "샘플" }],
  experimentalFlag: true,
});
const INVALID_CATALOG = JSON.stringify({ models: "invalid" });
const INVALID_JSON = "{not json";

const fulfillJson = (route: Route, body: string, status = 200): Promise<void> =>
  route.fulfill({ status, contentType: "application/json", body });

/**
 * Route the fixed catalog URL to `responder` (called with the 1-based hit index). Any request to
 * the firebasestorage host that is NOT the exact fixed URL is aborted and flagged, so an
 * endpoint miss fails the test. Returns accessors for hit count and unexpected count.
 */
async function routeCatalog(
  page: Page,
  responder: (route: Route, hit: number) => Promise<void>,
): Promise<{ hits: () => number; unexpected: () => number }> {
  let hits = 0;
  let unexpected = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
    if (route.request().url() !== CATALOG_URL) {
      unexpected++;
      await route.abort();
      return;
    }
    hits++;
    await responder(route, hits);
  });
  return { hits: () => hits, unexpected: () => unexpected };
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

const status = (page: Page) => page.getByTestId("catalog-status");

test("gated response shows loading then ready (production initial mount request is exactly once)", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  // Hold the response open with a test-controlled gate instead of a fixed sleep.
  let releaseGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const route = await routeCatalog(page, async (r) => {
    await gate;
    await fulfillJson(r, LEGACY);
  });

  await page.goto(MOCKUP_URL);
  await expect(status(page)).toHaveText("카탈로그를 불러오는 중…"); // loading while gated
  releaseGate(); // release the response
  await expect(status(page)).toHaveText("카탈로그 준비 완료"); // then ready

  expect(route.hits()).toBe(1); // production build: one mount → one underlying request
  expect(route.unexpected()).toBe(0);
  expect(errors).toEqual([]);
});

test("warning fixture surfaces the safe compatibility notice", async ({ page }) => {
  await routeCatalog(page, (r) => fulfillJson(r, LEGACY_WARN));
  await page.goto(MOCKUP_URL);
  await expect(status(page)).toHaveText("카탈로그 준비 완료");
  await expect(page.getByText("일부 이전 데이터가 호환 처리되었습니다")).toBeVisible();
});

test("500 → safe error + retry → 200 → ready (2 requests total)", async ({ page }) => {
  // Note: a 500 response makes the browser log an automatic "Failed to load resource" network
  // entry; that is browser noise, not an app console error. App-console cleanliness is asserted
  // by the 200-based ready/error viewport tests below.
  const route = await routeCatalog(page, async (r, hit) => {
    if (hit === 1) await r.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    else await fulfillJson(r, LEGACY);
  });
  await page.goto(MOCKUP_URL);

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(status(page)).toContainText("잠시 후 다시 시도해 주세요");
  const retry = page.getByTestId("catalog-retry");
  await expect(retry).toBeVisible();
  await retry.click();

  await expect(status(page)).toHaveText("카탈로그 준비 완료");
  expect(route.hits()).toBe(2);
});

test("invalid catalog → admin-contact error with no retry button", async ({ page }) => {
  await routeCatalog(page, (r) => fulfillJson(r, INVALID_CATALOG));
  await page.goto(MOCKUP_URL);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(status(page)).toHaveText(
    "카탈로그 데이터에 문제가 있습니다. 관리자에게 문의해 주세요.",
  );
  await expect(page.getByTestId("catalog-retry")).toHaveCount(0);
});

test("invalid JSON → admin-contact error with no retry button", async ({ page }) => {
  await routeCatalog(page, (r) => fulfillJson(r, INVALID_JSON));
  await page.goto(MOCKUP_URL);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("catalog-retry")).toHaveCount(0);
});

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  for (const kind of ["ready", "error"] as const) {
    test(`${kind} @ ${vp.name}: overflow 0, axe 0, console 0`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await routeCatalog(page, (r) => fulfillJson(r, kind === "ready" ? LEGACY : INVALID_CATALOG));
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(MOCKUP_URL);
      if (kind === "ready") {
        await expect(status(page)).toHaveText("카탈로그 준비 완료");
      } else {
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(status(page)).toHaveText(/관리자에게 문의/);
      }

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious.map((v) => v.id)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
