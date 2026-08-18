import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { HOSTING_PORT } from "../../playwright.config";

const ROOT = `http://localhost:${HOSTING_PORT}`;

test("isolated Hosting stage serves rebuild customer and admin routes", async ({ page }) => {
  await page.goto(`${ROOT}/`);
  await expect(page.getByTestId("app-id")).toHaveText("denn-mockup-rebuild");
  await page.goto(`${ROOT}/admin/`);
  await expect(page.getByTestId("app-id")).toHaveText("denn-admin-rebuild");
});

test("legacy HTML exists but is never executed, and artifact has an exact allowlist", async ({
  request,
}) => {
  for (const file of ["denn-admin.html", "denn-mockup-tool.html"]) {
    const response = await request.get(`${ROOT}/${file}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).byteLength).toBeGreaterThan(100_000);
  }

  const staging = process.env.DENN_E2E_STAGING;
  expect(staging).toBeTruthy();
  const publicRoot = join(String(staging), "hosting", "public");
  expect(readdirSync(publicRoot).sort()).toEqual([
    "admin",
    "assets",
    "denn-admin.html",
    "denn-mockup-tool.html",
    "index.html",
  ]);
  expect(readdirSync(join(publicRoot, "admin")).sort()).toEqual(["assets", "index.html"]);
});
