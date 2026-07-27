import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, type Page, type Route, expect, test } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { ADMIN_PORT, MOCKUP_PORT } from "../../playwright.config";

// Spec 017 — mobile-first catalog browse UI. Synthetic fixtures only (no real product data). All
// Firebase Storage requests are intercepted; any request that is not the exact fixed catalog URL
// fails the test.

const MOCKUP_URL = `http://localhost:${MOCKUP_PORT}/`;
const ADMIN_URL = `http://localhost:${ADMIN_PORT}/`;
const CATALOG_URL = buildPublicCatalogUrl();

// Secret markers that MUST NEVER reach the DOM (raw values / diagnostic codes / internal fields).
const SECRET_UNKNOWN = "SECRET_MARKER_XYZ";
const SECRET_PATH = "guides/DO_NOT_LEAK.png";

// Rich synthetic catalog: 2 models; 2 case categories (one with 0 templates → disabled) with a
// categorized + an uncategorized template; 2 visible frame sizes + 1 hidden; 2 frame categories;
// frame templates covering all / restricted / unmatched; an unmatched template drives a diagnostic.
const RICH = JSON.stringify({
  models: [
    { id: "m1", name: "모델 하나" },
    { id: "m2", name: "모델 둘", secretMarker: SECRET_UNKNOWN },
  ],
  caseCategories: [
    { id: "cc1", name: "분류 A" },
    { id: "cc2", name: "분류 B" },
  ],
  caseTemplates: [
    { id: "ct1", name: "케이스 알파", categoryId: "cc1", type: "uploaded" },
    { id: "ct2", name: "케이스 베타", type: "uploaded", storagePath: SECRET_PATH },
  ],
  frameSizes: [
    { id: "fs1", name: "사이즈 하나" },
    { id: "fs2", name: "사이즈 둘" },
    { id: "fsh", name: "숨김 사이즈", hideInMockup: true },
  ],
  frameCategories: [
    { id: "fc1", name: "액자 A" },
    { id: "fc2", name: "액자 B" },
  ],
  frameTemplates: [
    { id: "ftall", name: "전체 액자", type: "builtin" },
    { id: "ftr1", name: "제한 액자 하나", type: "uploaded", categoryId: "fc1", sizeIds: ["fs1"] },
    { id: "ftr2", name: "제한 액자 둘", type: "uploaded", categoryId: "fc2", sizeIds: ["fs2"] },
    {
      id: "ftx",
      name: "미스매치 액자",
      type: "uploaded",
      categoryId: "fc1",
      sizeIds: ["없는사이즈"],
    },
  ],
});

// Ready with no models and no sizes → empty-state notices for both product kinds.
const EMPTY_AXES = JSON.stringify({});
// Ready with a model + a size but no templates anywhere → empty-template notices.
const NO_TEMPLATES = JSON.stringify({
  models: [{ id: "m1", name: "모델 하나" }],
  frameSizes: [{ id: "fs1", name: "사이즈 하나" }],
});

const fulfillJson = (route: Route, body: string, status = 200): Promise<void> =>
  route.fulfill({ status, contentType: "application/json", body });

async function routeCatalog(
  page: Page,
  body: string,
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
    await fulfillJson(route, body);
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

const kindChip = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const btn = (page: Page, name: RegExp | string) => page.getByRole("button", { name });
const summary = (page: Page) => page.getByTestId("browse-summary");

async function gotoReady(page: Page): Promise<void> {
  await page.goto(MOCKUP_URL);
  await expect(page.getByTestId("catalog-status")).toHaveText("카탈로그 준비 완료");
}

// 1 — loading → ready → both product kinds -----------------------------------
test("ready shows the two product-kind options", async ({ page }) => {
  const route = await routeCatalog(page, RICH);
  await gotoReady(page);
  await expect(kindChip(page, "휴대폰 케이스")).toBeVisible();
  await expect(kindChip(page, "액자")).toBeVisible();
  // No sub-step before a product kind is chosen.
  await expect(page.getByText("휴대폰 모델")).toHaveCount(0);
  expect(route.unexpected()).toBe(0);
});

// 2 — case: model → category → template → summary ----------------------------
test("case flow reaches a completion summary", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "휴대폰 케이스").click();
  await kindChip(page, "모델 하나").click();
  // category defaults to 전체 → both case templates visible
  await expect(btn(page, /케이스 알파/)).toBeVisible();
  await btn(page, /케이스 알파/).click();
  await expect(summary(page)).toBeVisible();
  await expect(summary(page)).toContainText("휴대폰 케이스");
  await expect(summary(page)).toContainText("모델: 모델 하나");
  await expect(summary(page)).toContainText("템플릿: 케이스 알파");
});

// 3 — case model change keeps the template -----------------------------------
test("changing the case model keeps the selected template", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "휴대폰 케이스").click();
  await kindChip(page, "모델 하나").click();
  await btn(page, /케이스 베타/).click(); // uncategorized, in 전체
  await expect(summary(page)).toContainText("모델: 모델 하나");
  await kindChip(page, "모델 둘").click();
  // template retained (model has no template relationship)
  await expect(btn(page, /케이스 베타/)).toHaveAttribute("aria-pressed", "true");
  await expect(summary(page)).toContainText("모델: 모델 둘");
  await expect(summary(page)).toContainText("템플릿: 케이스 베타");
});

// 4 — frame: size → category → compatible template → summary -----------------
test("frame flow reaches a completion summary with a compatible template", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 하나").click();
  // fs1 templates = 전체 액자 (builtin, all) + 제한 액자 하나 (restricted fs1); NOT 제한 액자 둘
  await expect(btn(page, /제한 액자 하나/)).toBeVisible();
  await expect(btn(page, /제한 액자 둘/)).toHaveCount(0);
  await btn(page, /제한 액자 하나/).click();
  await expect(summary(page)).toContainText("액자");
  await expect(summary(page)).toContainText("사이즈: 사이즈 하나");
  await expect(summary(page)).toContainText("템플릿: 제한 액자 하나");
});

// 5 — frame size change resets category + template ---------------------------
test("changing the frame size resets category and template", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 둘").click();
  await btn(page, /액자 B/).click(); // enabled under fs2
  await btn(page, /제한 액자 둘/).click();
  await expect(summary(page)).toBeVisible();
  // switch size → category back to 전체, template cleared, summary gone
  await kindChip(page, "사이즈 하나").click();
  await expect(btn(page, /^전체 \(/)).toHaveAttribute("aria-pressed", "true");
  await expect(btn(page, /제한 액자 둘/)).toHaveCount(0);
  await expect(summary(page)).toHaveCount(0);
});

// 6 — category change resets template ----------------------------------------
test("changing the category resets the template", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "휴대폰 케이스").click();
  await kindChip(page, "모델 하나").click();
  await btn(page, /케이스 베타/).click(); // in 전체
  await expect(summary(page)).toBeVisible();
  await btn(page, /분류 A/).click(); // cc1 → only 케이스 알파
  await expect(summary(page)).toHaveCount(0);
  await expect(btn(page, /케이스 베타/)).toHaveCount(0);
});

// 7 — empty states -----------------------------------------------------------
test("empty models / sizes / templates show safe notices (no fake defaults)", async ({ page }) => {
  await routeCatalog(page, EMPTY_AXES);
  await gotoReady(page);
  await kindChip(page, "휴대폰 케이스").click();
  await expect(page.getByTestId("empty-models")).toHaveText("선택 가능한 휴대폰 모델이 없습니다.");
  await kindChip(page, "액자").click();
  await expect(page.getByTestId("empty-sizes")).toHaveText("선택 가능한 액자 사이즈가 없습니다.");

  await page.unroute("**/firebasestorage.googleapis.com/**");
  await routeCatalog(page, NO_TEMPLATES);
  await gotoReady(page);
  await kindChip(page, "휴대폰 케이스").click();
  await kindChip(page, "모델 하나").click();
  await expect(page.getByTestId("empty-templates")).toHaveText(
    "현재 조건에 맞는 템플릿이 없습니다.",
  );
});

// 8 — diagnostic generic notice + no code/path/secret in the DOM -------------
test("diagnostics surface only a generic notice; no codes/paths/secrets leak", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);
  await expect(page.getByTestId("browse-diagnostics")).toHaveText(
    "일부 카탈로그 항목은 표시되지 않을 수 있습니다.",
  );
  // Drive through a rich state so all template metadata has had a chance to render.
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 하나").click();

  const html = await page.content();
  for (const forbidden of [
    SECRET_UNKNOWN,
    SECRET_PATH,
    "DO_NOT_LEAK",
    "UNKNOWN_SIZE_REFERENCE",
    "ORPHAN_CATEGORY_REFERENCE",
    "sourceIndex",
    "sizeScope",
  ]) {
    expect(html).not.toContain(forbidden);
  }
});

// 9 — only the exact catalog URL is requested; no console errors -------------
test("no unexpected Firebase requests and no console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const route = await routeCatalog(page, RICH);
  await gotoReady(page);
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 하나").click();
  await btn(page, /제한 액자 하나/).click();
  expect(route.hits()).toBe(1);
  expect(route.unexpected()).toBe(0);
  expect(errors).toEqual([]);
});

// 10 — admin app makes zero catalog requests and is unchanged ----------------
test("admin app makes no public-catalog request", async ({ page }) => {
  let firebaseHits = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
    firebaseHits++;
    await route.abort();
  });
  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await expect(page.getByTestId("app-id")).toHaveText("denn-admin-rebuild");
  expect(firebaseHits).toBe(0);
});

// --- Responsive + accessibility matrix (mobile contract §10) ----------------
const MATRIX = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "844x390", width: 844, height: 390 },
  { name: "430x932", width: 430, height: 932 },
  { name: "932x390", width: 932, height: 390 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

for (const vp of MATRIX) {
  test(`browse matrix @ ${vp.name}: overflow 0, 44px, axe 0, console 0`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await routeCatalog(page, RICH);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoReady(page);

    // Drive to a content-rich state: frame → size → (category chips + template cards).
    await kindChip(page, "액자").click();
    await kindChip(page, "사이즈 하나").click();
    await expect(page.getByTestId("template-list")).toBeVisible();
    await btn(page, /제한 액자 하나/).click();
    await expect(summary(page)).toBeVisible();

    // no horizontal page overflow
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // every interactive control ≥ 44×44 and within the viewport width
    const controls = page.locator(".denn-chip, .denn-btn, .denn-tplcard");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
      }
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// --- keyboard-only: full case + frame flows via Enter AND Space -------------
// Focus each control with the keyboard (never a mouse click), assert its focus-visible ring, then
// activate it — alternating Enter and Space so both activations are exercised — all the way to the
// completion summary.
async function keyPick(
  page: Page,
  locator: ReturnType<Page["getByRole"]>,
  key: "Enter" | "Space",
): Promise<void> {
  await locator.focus();
  const fv = await locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
    };
  });
  expect(fv.focusVisible).toBe(true); // keyboard focus → visible ring
  expect(fv.outlineStyle).not.toBe("none");
  expect(fv.outlineWidth).not.toBe("0px");
  await page.keyboard.press(key);
}

test("keyboard-only case and frame flows reach completion (Enter + Space)", async ({ page }) => {
  await routeCatalog(page, RICH);
  await gotoReady(page);

  // Establish keyboard input modality and confirm Tab reaches the first control.
  await page.keyboard.press("Tab");
  const firstFocused = await page.evaluate(() => document.activeElement?.textContent ?? "");
  expect(firstFocused).toContain("휴대폰 케이스");

  // CASE: kind (Enter) → model (Space) → category (Enter) → template (Space) → summary
  await keyPick(page, kindChip(page, "휴대폰 케이스"), "Enter");
  await expect(kindChip(page, "휴대폰 케이스")).toHaveAttribute("aria-pressed", "true");
  await keyPick(page, kindChip(page, "모델 하나"), "Space");
  await expect(kindChip(page, "모델 하나")).toHaveAttribute("aria-pressed", "true");
  await keyPick(page, btn(page, /분류 A/), "Enter"); // cc1 → only 케이스 알파
  await keyPick(page, btn(page, /케이스 알파/), "Space");
  await expect(summary(page)).toContainText("모델: 모델 하나");
  await expect(summary(page)).toContainText("템플릿: 케이스 알파");

  // FRAME: kind (Space) → size (Enter) → category (Space) → template (Enter) → summary
  await keyPick(page, kindChip(page, "액자"), "Space");
  await expect(kindChip(page, "액자")).toHaveAttribute("aria-pressed", "true");
  await keyPick(page, kindChip(page, "사이즈 하나"), "Enter");
  await keyPick(page, btn(page, /액자 A/), "Space"); // fc1 → only 제한 액자 하나 under fs1
  await keyPick(page, btn(page, /제한 액자 하나/), "Enter");
  await expect(summary(page)).toContainText("사이즈: 사이즈 하나");
  await expect(summary(page)).toContainText("템플릿: 제한 액자 하나");
});

// --- representative screenshots (synthetic fixture only) --------------------
const SHOTS = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const shot of SHOTS) {
  test(`screenshot ${shot.name}`, async ({ page }) => {
    await routeCatalog(page, RICH);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await gotoReady(page);
    await kindChip(page, "액자").click();
    await kindChip(page, "사이즈 하나").click();
    await btn(page, /제한 액자 하나/).click();
    await expect(summary(page)).toBeVisible();
    await page.screenshot({
      path: `docs/rebuild/results/spec-017/browse-${shot.name}.png`,
      fullPage: true,
    });
  });
}
