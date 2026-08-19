import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const MOCKUP_URL = `http://localhost:${MOCKUP_PORT}/`;

test("space link owns the screen and disabled production config performs no Firebase request", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("googleapis.com") || url.includes("firebase")) externalRequests.push(url);
  });

  await page.goto(`${MOCKUP_URL}?space=synthetic-token`);
  await expect(page.getByTestId("space-view-mode")).toBeVisible();
  await expect(page.getByTestId("catalog-status")).toHaveCount(0);
  await page.getByTestId("space-password").fill("synthetic-password");
  await page.getByTestId("space-submit").click();
  await expect(page.getByTestId("space-status")).toHaveText(
    "시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
  );
  await expect(page.getByTestId("space-password")).toHaveCount(0);
  expect(externalRequests).toEqual([]);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
});

test("duplicate space parameters fail closed without a password or network", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("googleapis.com") || url.includes("firebase")) externalRequests.push(url);
  });
  await page.goto(`${MOCKUP_URL}?space=one&space=two`);
  await expect(page.getByTestId("space-status")).toHaveText("시안 링크가 올바르지 않습니다.");
  await expect(page.getByTestId("space-password")).toHaveCount(0);
  await expect(page.getByTestId("catalog-status")).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});
