import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const fixture = (text: "present" | "none") =>
  `http://localhost:${MOCKUP_PORT}/e2e-space-frame-fixture.html?text=${text}`;

test("post-auth frame view is gated, source-bound and StrictMode-clean", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      externalRequests.push(request.url());
    }
  });
  await page.goto(fixture("present"));

  expect(await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__)).toMatchObject({
    gateReads: 0,
    catalogLoads: 0,
    readinessCreates: 0,
    proofLoads: 0,
    artLoads: 0,
  });
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);

  await page.getByTestId("space-password").fill("synthetic-password");
  await page.getByTestId("space-submit").click();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(1);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-status")).toHaveText("시안 화면을 준비하는 중입니다.");

  await page.getByTestId("fixture-expand").click();
  await expect
    .poll(() => page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__.fontFactories))
    .toBeGreaterThan(0);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  await page.getByTestId("fixture-release-fonts").click();
  await expect(page.getByTestId("preview-canvas")).toBeVisible();
  await expect(page.getByRole("img", { name: "저장된 액자 시안" })).toHaveCount(1);
  const active = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(active.catalogLoads).toBe(1);
  expect(active.proofLoads).toBe(1);
  expect(active.artLoads).toBe(0);
  expect(active.fontChecks).toEqual(['33.6px "Fixture Sans", sans-serif']);
  expect(active.readinessCreates).toBe(2);
  expect(active.readinessDisposes).toBe(1);
  expect(externalRequests).toEqual([]);

  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__.ownerSubscriptions))
    .toBe(0);
  const unmounted = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(unmounted.readinessDisposes).toBe(unmounted.readinessCreates);

  await page.getByTestId("fixture-remount").click();
  await expect(page.getByTestId("preview-canvas")).toBeVisible();
  const remounted = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(remounted.readinessCreates).toBe(4);
  expect(remounted.readinessDisposes).toBe(3);
  expect(remounted.proofLoads).toBe(2);

  await page.getByTestId("fixture-unmount").click();
  await expect
    .poll(() => page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__.ownerSubscriptions))
    .toBe(0);
  const finished = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(finished.readinessDisposes).toBe(finished.readinessCreates);
});

test("an image-only frame bypasses font readiness without fallback or network", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      externalRequests.push(request.url());
    }
  });
  await page.goto(fixture("none"));
  await page.getByTestId("space-password").fill("synthetic-password");
  await page.getByTestId("space-submit").click();
  await page.getByTestId("fixture-expand").click();
  await expect(page.getByTestId("preview-canvas")).toBeVisible();
  const metrics = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(metrics.fontFactories).toBe(0);
  expect(metrics.fontChecks).toEqual([]);
  expect(metrics.artLoads).toBe(0);
  expect(externalRequests).toEqual([]);
});
