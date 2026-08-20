import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

// Spec 063: the production `?space=` route after spec 062 / FF-1=A. A `space-scene-v1` payload
// carries no capture orientation and no geometry basis, so the viewer refuses to compose it at all.
// The expectations below are the safe-stop contract, not a Canvas contract:
//   - before the password is accepted: no viewer UI, no request of any kind;
//   - after it is accepted: the Korean safe notice, zero Canvas, and STILL zero catalog/proof/art
//     requests — the block happens before any source is even derived.
// Playwright intercepts every HTTPS request with a regex catch-all (a string glob silently failed to
// match in spec 061) and only the two exact synthetic URLs are answered, so external egress is 0.
// Those two endpoints are deliberately left answerable: a request count of 0 has to prove a product
// decision, not a broken fixture endpoint.

const FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-space-production-route-fixture.html`;
const CATALOG_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/published%2Fstate.json?alt=media";
const PROOF_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fspec-061-synthetic.png?alt=media";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4ZQAAAAASUVORK5CYII=",
  "base64",
);

const BLOCKED_HEADING = "이 시안은 지금 화면에 표시할 수 없습니다";
const SECRETS = [
  "PRIVATE_OWNER_MARKER",
  "PRIVATE_CREATED_AT_MARKER",
  "SPEC_061_PRIVATE_TOKEN",
  "SYNTHETIC_PASSWORD",
  "spec-061-template",
  "spec-061-size",
  "space-scene-v1",
  "SPACE_PROOF_ORIENTATION_UNCONFIRMED",
  "SPACE_VIEW_ORIENTATION_UNCONFIRMED",
  CATALOG_URL,
  PROOF_URL,
];

const catalog = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    models: [],
    caseCategories: [],
    caseTemplates: [],
    frameCategories: [],
    guideBackgrounds: [],
    customFonts: [],
    frameThickness: 5,
    frameTemplates: [
      {
        id: "spec-061-template",
        name: "합성 템플릿",
        type: "uploaded",
        targetSizeIds: ["spec-061-size"],
        clockEnabled: false,
        textZones: [],
      },
    ],
    frameSizes: [{ id: "spec-061-size", name: "합성 크기", aspect: 1.4 }],
    frameColors: [{ id: "spec-061-color", name: "검정", fill: "#1A1A1A" }],
  },
};

interface RouteProbe {
  readonly requests: string[];
  readonly consoleMessages: string[];
  readonly consoleProblems: string[];
}

/**
 * Records every non-fixture request and every console message, then answers ONLY the two exact
 * synthetic URLs and aborts all other HTTPS. Nothing reaches a real host.
 */
async function installProbe(page: Page): Promise<RouteProbe> {
  const requests: string[] = [];
  const consoleMessages: string[] = [];
  const consoleProblems: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      requests.push(request.url());
    }
  });
  page.on("console", (message) => {
    consoleMessages.push(message.text());
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));
  await page.route(/^https:\/\//, (route) => {
    const url = route.request().url();
    if (url === CATALOG_URL) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(catalog),
      });
    }
    if (url === PROOF_URL) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: PNG,
      });
    }
    return route.abort("blockedbyclient");
  });
  return { requests, consoleMessages, consoleProblems };
}

async function authenticate(page: Page): Promise<void> {
  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
}

/** Two animation frames: anything the commit scheduled has run by the time this resolves. */
const settle = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

test("production space route blocks an unproven V1 scene with zero catalog and proof traffic", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 0,
    sceneOpens: 0,
  });

  await authenticate(page);
  const view = page.getByTestId("space-frame-view");
  await expect(view).toBeVisible();
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await expect(page.getByTestId("space-frame-status")).toContainText(
    "이 링크는 이전 버전에서 발급된 시안입니다.",
  );
  await expect(page.getByTestId("space-frame-status")).toContainText(
    "구도를 임의로 바꿔 보여드리지 않기 위해 시안 표시를 안전하게 중단했습니다.",
  );
  await expect(page.getByTestId("space-frame-next")).toContainText(
    "담당자에게 새 시안 링크를 요청해 주세요.",
  );
  await expect(page.getByTestId("space-frame-status")).toHaveAttribute("role", "alert");

  // No best-effort composition: no Canvas, no image placeholder, and no retry affordance.
  await settle(page);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(view.locator("img")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-retry")).toHaveCount(0);
  await expect(view.getByRole("button")).toHaveCount(0);

  // The scene was decrypted (that is the password gate), but nothing downstream was fetched.
  expect(probe.requests).toEqual([]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    sceneOpens: 1,
  });

  const body = await page.locator("body").innerText();
  const output = `${body}\n${probe.consoleMessages.join("\n")}`;
  for (const secret of SECRETS) {
    expect(output).not.toContain(secret);
  }
  expect(probe.consoleProblems).toEqual([]);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
});

test("the blocked state never retries on its own, on re-render or after a reload", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();

  // A resize re-renders the view; a wait covers any timer-based retry or polling.
  await page.setViewportSize({ width: 1280, height: 800 });
  await settle(page);
  await page.waitForTimeout(1500);
  expect(probe.requests).toEqual([]);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  // A second visit must not reuse a previous plan or escalate to a best-effort render.
  await page.reload();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await settle(page);
  expect(probe.requests).toEqual([]);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  expect(probe.consoleProblems).toEqual([]);
});

test("unmounting the production route leaves no view and starts no deferred work", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();

  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-view-mode")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  await settle(page);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

test("the blocked notice fits a 320px viewport without horizontal overflow", async ({ page }) => {
  await installProbe(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await settle(page);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  const box = await page.getByTestId("space-frame-view").boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(overflow.clientWidth);
});

// --- spec 063 representative screenshots (synthetic fixture only) -----------
const SHOTS = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const shot of SHOTS) {
  test(`spec063 screenshot ${shot.name}`, async ({ page }) => {
    await installProbe(page);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(FIXTURE_URL);
    await authenticate(page);
    await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
    await settle(page);
    await page.screenshot({
      path: `docs/rebuild/results/spec-063/space-v1-blocked-${shot.name}.png`,
      fullPage: true,
    });
  });
}
