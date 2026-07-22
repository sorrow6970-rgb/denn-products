import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT, MOCKUP_PORT } from "../../playwright.config";

const APPS = [
  {
    name: "mockup",
    url: `http://localhost:${MOCKUP_PORT}/`,
    title: "DENN PRODUCTS Mockup Rebuild",
    heading: "DENN PRODUCTS Mockup Rebuild",
    appId: "denn-mockup-rebuild",
    otherText: "Admin Rebuild",
  },
  {
    name: "admin",
    url: `http://localhost:${ADMIN_PORT}/`,
    title: "DENN PRODUCTS Admin Rebuild",
    heading: "DENN PRODUCTS Admin Rebuild",
    appId: "denn-admin-rebuild",
    otherText: "Mockup Rebuild",
  },
] as const;

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const app of APPS) {
  for (const vp of VIEWPORTS) {
    test(`${app.name} @ ${vp.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (m: ConsoleMessage) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(String(e)));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(app.url, { waitUntil: "networkidle" });

      // identity + status
      await expect(page).toHaveTitle(app.title);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(app.heading);
      await expect(page.getByText("Scaffold ready")).toBeVisible();
      await expect(page.getByTestId("app-id")).toHaveText(app.appId);

      // cross-app isolation: the other app's identity must not appear
      await expect(page.locator("body")).not.toContainText(app.otherText);

      // no horizontal overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${app.name} ${vp.name}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // accessibility: serious/critical incl. color-contrast (no blanket exclusion)
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        serious.map((v) => v.id),
        `${app.name} ${vp.name}: serious/critical a11y`,
      ).toEqual([]);

      // no unexpected console errors
      expect(consoleErrors, `${app.name} ${vp.name}: console errors`).toEqual([]);
    });
  }
}
