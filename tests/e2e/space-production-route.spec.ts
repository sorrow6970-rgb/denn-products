import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-space-production-route-fixture.html`;
const CATALOG_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/published%2Fstate.json?alt=media";
const PROOF_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fspec-061-synthetic.png?alt=media";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4ZQAAAAASUVORK5CYII=",
  "base64",
);

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

test("production space route opens catalog and proof only after authentication", async ({
  page,
}) => {
  const requests: string[] = [];
  const consoleMessages: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      requests.push(request.url());
    }
  });
  page.on("console", (message) => consoleMessages.push(message.text()));
  await page.route(/^https:\/\//, (route) => {
    if (route.request().url() === CATALOG_URL) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(catalog),
      });
    }
    if (route.request().url() === PROOF_URL) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: PNG,
      });
    }
    return route.abort("blockedbyclient");
  });

  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 0,
    sceneOpens: 0,
  });

  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
  await expect(page.getByTestId("space-frame-view")).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toBeVisible();
  await expect(page.getByRole("img", { name: "저장된 액자 시안" })).toHaveCount(1);

  expect(requests).toEqual([CATALOG_URL, PROOF_URL]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    sceneOpens: 1,
  });
  const body = await page.locator("body").innerText();
  const output = `${body}\n${consoleMessages.join("\n")}`;
  for (const secret of [
    "PRIVATE_OWNER_MARKER",
    "PRIVATE_CREATED_AT_MARKER",
    "SPEC_061_PRIVATE_TOKEN",
    "SYNTHETIC_PASSWORD",
    CATALOG_URL,
    PROOF_URL,
  ]) {
    expect(output).not.toContain(secret);
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
});

test("production space route fails closed for an invalid catalog without loading proof", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      requests.push(request.url());
    }
  });
  await page.route(/^https:\/\//, (route) => {
    if (route.request().url() === CATALOG_URL) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ schemaVersion: 2, data: {} }),
      });
    }
    return route.abort("blockedbyclient");
  });

  await page.goto(FIXTURE_URL);
  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
  await expect(page.getByTestId("space-frame-status")).toHaveText("시안을 표시할 수 없습니다.");
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-retry")).toHaveCount(0);
  expect(requests).toEqual([CATALOG_URL]);
});

test("unmounting the production route prevents a late proof result from restoring canvas", async ({
  page,
}) => {
  let releaseProof: (() => void) | undefined;
  const proofRequested = new Promise<void>((resolve) => {
    releaseProof = resolve;
  });
  let fulfillProof: (() => Promise<void>) | undefined;

  await page.route(/^https:\/\//, (route) => {
    if (route.request().url() === CATALOG_URL) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(catalog),
      });
    }
    if (route.request().url() === PROOF_URL) {
      fulfillProof = () =>
        route.fulfill({
          status: 200,
          contentType: "image/png",
          headers: { "access-control-allow-origin": "*" },
          body: PNG,
        });
      releaseProof?.();
      return;
    }
    return route.abort("blockedbyclient");
  });

  await page.goto(FIXTURE_URL);
  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
  await proofRequested;
  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-view-mode")).toHaveCount(0);
  expect(fulfillProof).toBeDefined();
  await fulfillProof?.();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
});
