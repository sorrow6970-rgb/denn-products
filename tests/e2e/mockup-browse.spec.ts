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

// --- spec 018 image fixtures (synthetic only) -------------------------------
// A 1×1 transparent PNG, used both as a data: image and as the routed Firebase image body.
const SMALL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const SMALL_PNG_BUFFER = Buffer.from(SMALL_PNG_B64, "base64");
const DATA_IMG = `data:image/png;base64,${SMALL_PNG_B64}`;
// Token marker: allowed ONLY inside the thumbnail img[src]; forbidden everywhere else.
const IMG_TOKEN = "SYNTH_TOKEN_MARKER";
const FB_O = "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o";
const FB_OK = `${FB_O}/templates%2Fsynthetic.png?alt=media&token=${IMG_TOKEN}`;
const FB_FAIL = `${FB_O}/templates%2Ffail.png?alt=media&token=T2`;
const UNTRUSTED_IMG = "https://untrusted.example.test/x.png";

// One frame size; six builtin frame templates exercising every projection/trust outcome.
const IMAGES = JSON.stringify({
  frameSizes: [{ id: "fs1", name: "사이즈 하나" }],
  frameTemplates: [
    { id: "t-data", name: "데이터 이미지", type: "builtin", dataUrl: DATA_IMG },
    { id: "t-fb", name: "파이어베이스 이미지", type: "builtin", dataUrl: FB_OK },
    { id: "t-untrusted", name: "미신뢰 이미지", type: "builtin", dataUrl: UNTRUSTED_IMG },
    { id: "t-none", name: "이미지 없음 템플릿", type: "builtin" },
    {
      id: "t-preview",
      name: "프리뷰 템플릿",
      type: "builtin",
      dataUrl: DATA_IMG,
      generatedDetailPreview: true,
    },
    { id: "t-fail", name: "로드 실패", type: "builtin", dataUrl: FB_FAIL },
  ],
});

// Matrix fixture: same shapes but WITHOUT the aborted "fail" image, so there is no browser
// network-error console noise. The load-failure path is covered by its own scenario test.
const IMAGES_MATRIX = JSON.stringify({
  frameSizes: [{ id: "fs1", name: "사이즈 하나" }],
  frameTemplates: [
    { id: "t-data", name: "데이터 이미지", type: "builtin", dataUrl: DATA_IMG },
    { id: "t-fb", name: "파이어베이스 이미지", type: "builtin", dataUrl: FB_OK },
    { id: "t-untrusted", name: "미신뢰 이미지", type: "builtin", dataUrl: UNTRUSTED_IMG },
    { id: "t-none", name: "이미지 없음 템플릿", type: "builtin" },
  ],
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

interface ImageRouteCounters {
  catalog: () => number;
  image: () => number;
  fail: () => number;
  unexpected: () => number;
  untrusted: () => number;
}

// Route the catalog JSON + the ONE allowed synthetic Firebase image, fail the synthetic "fail"
// image, and abort/track anything else. A separate route counts (and blocks) the untrusted host,
// which must never be requested because the trust boundary drops it before it becomes an img src.
async function routeCatalogWithImages(page: Page, body: string): Promise<ImageRouteCounters> {
  let catalog = 0;
  let image = 0;
  let fail = 0;
  let unexpected = 0;
  let untrusted = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
    const url = route.request().url();
    if (url === CATALOG_URL) {
      catalog++;
      await fulfillJson(route, body);
      return;
    }
    if (url.includes("templates%2Fsynthetic.png")) {
      image++;
      await route.fulfill({ status: 200, contentType: "image/png", body: SMALL_PNG_BUFFER });
      return;
    }
    if (url.includes("templates%2Ffail.png")) {
      fail++;
      await route.abort();
      return;
    }
    unexpected++;
    await route.abort();
  });
  await page.route("**/untrusted.example.test/**", async (route) => {
    untrusted++;
    await route.abort();
  });
  return {
    catalog: () => catalog,
    image: () => image,
    fail: () => fail,
    unexpected: () => unexpected,
    untrusted: () => untrusted,
  };
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

// --- spec 018: thumbnails, trust boundary, leak checks ----------------------
async function openFrameImages(page: Page): Promise<void> {
  await gotoReady(page);
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 하나").click();
  await expect(page.getByTestId("template-list")).toBeVisible();
}

test("data: image renders as a lazy/async thumbnail", async ({ page }) => {
  await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const img = btn(page, /데이터 이미지/).locator("img");
  await expect(img).toHaveAttribute("src", DATA_IMG);
  await expect(img).toHaveAttribute("loading", "lazy");
  await expect(img).toHaveAttribute("decoding", "async");
  await expect(img).toHaveAttribute("alt", "");
});

test("template with no image shows a neutral placeholder", async ({ page }) => {
  await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const card = btn(page, /이미지 없음 템플릿/);
  await expect(card.locator(".denn-tplthumb--empty")).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
});

test("generated-preview template shows a placeholder (not exposed as art)", async ({ page }) => {
  await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const card = btn(page, /프리뷰 템플릿/);
  await expect(card.locator(".denn-tplthumb--empty")).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
});

test("untrusted HTTPS is blocked before request — placeholder, 0 external hits", async ({
  page,
}) => {
  const c = await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const card = btn(page, /미신뢰 이미지/);
  await expect(card.locator(".denn-tplthumb--empty")).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  await expect.poll(() => c.untrusted()).toBe(0);
});

test("allowed Firebase image is served by the route and loads", async ({ page }) => {
  const c = await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const img = btn(page, /파이어베이스 이미지/).locator("img");
  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  expect(c.image()).toBe(1);
  expect(c.unexpected()).toBe(0);
});

test("image load failure falls back to placeholder; card stays selectable", async ({ page }) => {
  await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const card = btn(page, /로드 실패/);
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".denn-tplthumb--empty")).toBeVisible(); // onError → placeholder
  await card.click();
  await expect(summary(page)).toContainText("템플릿: 로드 실패");
});

test("a failing image is requested exactly once (no retry loop)", async ({ page }) => {
  // The route counts every hit to the fail image; a second request would make fail() === 2 and
  // fail the assertion. `routeCatalogWithImages`'s counters are the deterministic gate — no sleep.
  const c = await routeCatalogWithImages(page, IMAGES);
  await openFrameImages(page);
  const failCard = btn(page, /로드 실패/);
  await failCard.scrollIntoViewIfNeeded();
  await expect(failCard.locator(".denn-tplthumb--empty")).toBeVisible(); // first failure → placeholder
  expect(c.fail()).toBe(1);
  // Deterministic network gate: complete a full round-trip on the served image AFTER the failure.
  // If the failed thumbnail were re-requesting, that request would land during this round-trip and
  // push fail() past 1. The keyed child + failed boolean removed the <img>, so it stays exactly 1.
  const okImg = btn(page, /파이어베이스 이미지/).locator("img");
  await okImg.scrollIntoViewIfNeeded();
  await expect.poll(() => c.image()).toBe(1);
  await expect
    .poll(() => okImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  expect(c.fail()).toBe(1);
});

test("thumbnail unmounts cleanly while its image is still in flight (gated, no sleep)", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  // Hold the served image response open with a test-controlled gate so it is in flight at unmount.
  let releaseImage!: () => void;
  const imageGate = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  let imageHits = 0;
  let unexpected = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
    const url = route.request().url();
    if (url === CATALOG_URL) {
      await fulfillJson(route, IMAGES_MATRIX);
      return;
    }
    if (url.includes("templates%2Fsynthetic.png")) {
      imageHits++;
      await imageGate; // stay pending until the test releases it
      await route.fulfill({ status: 200, contentType: "image/png", body: SMALL_PNG_BUFFER });
      return;
    }
    unexpected++;
    await route.abort();
  });
  await page.route("**/untrusted.example.test/**", (route) => route.abort());

  await openFrameImages(page);
  const okImg = btn(page, /파이어베이스 이미지/).locator("img");
  await okImg.scrollIntoViewIfNeeded();
  await expect.poll(() => imageHits).toBe(1); // request is in flight (deterministic, not a sleep)

  // Unmount all frame thumbnails while that image is still pending.
  await kindChip(page, "휴대폰 케이스").click();
  await expect(page.getByTestId("empty-models")).toBeVisible();
  await expect(page.getByTestId("template-list")).toHaveCount(0);

  // Now settle the in-flight response onto the detached node — no React callback should fire.
  releaseImage();

  // Deterministic flush: remount thumbnails and observe the list before asserting cleanliness.
  await kindChip(page, "액자").click();
  await kindChip(page, "사이즈 하나").click();
  await expect(page.getByTestId("template-list")).toBeVisible();
  await expect(btn(page, /데이터 이미지/).locator("img")).toBeVisible();
  expect(unexpected).toBe(0);
  expect(errors).toEqual([]);
});

test("image url/token leaks only into img[src] — not text/aria/data/console/storage/location", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  // IMAGES_MATRIX carries the token-bearing t-fb but no aborted image → no browser network noise.
  await routeCatalogWithImages(page, IMAGES_MATRIX);
  await openFrameImages(page);
  // The token is present in exactly one thumbnail's img[src].
  await expect(page.locator(`img[src*="${IMG_TOKEN}"]`)).toHaveCount(1);
  const leak = await page.evaluate((marker) => {
    const readStore = (s: Storage): string => {
      let out = "";
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k) out += `${k}=${s.getItem(k)};`;
      }
      return out;
    };
    const inText = (document.body.innerText || "").includes(marker);
    const inAttrs = Array.from(document.querySelectorAll("*")).some((el) =>
      Array.from(el.attributes).some(
        (a) => a.name.toLowerCase() !== "src" && a.value.includes(marker),
      ),
    );
    const store = (readStore(localStorage) + readStore(sessionStorage)).includes(marker);
    const loc = (location.href + location.hash + location.search).includes(marker);
    return { inText, inAttrs, store, loc };
  }, IMG_TOKEN);
  expect(leak).toEqual({ inText: false, inAttrs: false, store: false, loc: false });
  expect(errors).toEqual([]);
});

const IMAGE_VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "390x844", width: 390, height: 844 },
  { name: "844x390", width: 844, height: 390 },
  { name: "932x390", width: 932, height: 390 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

for (const vp of IMAGE_VIEWPORTS) {
  test(`image matrix @ ${vp.name}: overflow 0, 44px, boxes in-frame, axe 0, console 0`, async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await routeCatalogWithImages(page, IMAGES_MATRIX);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await openFrameImages(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // thumbnail boxes stay within the viewport width
    const thumbs = page.locator(".denn-tplthumb");
    const tcount = await thumbs.count();
    expect(tcount).toBeGreaterThan(0);
    for (let i = 0; i < tcount; i++) {
      const box = await thumbs.nth(i).boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
      }
    }

    const controls = page.locator(".denn-chip, .denn-btn, .denn-tplcard");
    const count = await controls.count();
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) {
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
      }
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

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

// --- spec 018 representative screenshots (synthetic fixture only) -----------
// Uses the IMAGES fixture so thumbnails + placeholders are visible. Written to a spec-018 folder;
// the spec-017 screenshots are NOT regenerated here and stay byte-identical.
const SHOTS = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const shot of SHOTS) {
  test(`spec018 screenshot ${shot.name}`, async ({ page }) => {
    const c = await routeCatalogWithImages(page, IMAGES);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await openFrameImages(page);
    await btn(page, /데이터 이미지/).click();
    await expect(summary(page)).toBeVisible();
    // Ensure the routed Firebase thumbnail has actually painted before the snapshot.
    const fbImg = btn(page, /파이어베이스 이미지/).locator("img");
    await fbImg.scrollIntoViewIfNeeded();
    await expect.poll(() => c.image()).toBe(1);
    await expect
      .poll(() => fbImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
    await page.screenshot({
      path: `docs/rebuild/results/spec-018/browse-${shot.name}.png`,
      fullPage: true,
    });
  });
}
