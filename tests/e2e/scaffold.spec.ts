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
      await expect(page.getByTestId("app-id")).toHaveText(app.appId);

      // @denn/ui primitives actually rendered
      await expect(page.getByRole("button", { name: "기본" })).toBeVisible();
      await expect(page.getByRole("button", { name: "카카오로 주문" })).toBeVisible();

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

      // a disabled Chip is present and actually disabled (native, not visual-only)
      const disabledChip = page.locator(".denn-chip:disabled");
      await expect(disabledChip).toHaveCount(1);
      await expect(disabledChip).toBeDisabled();

      // interactive controls meet the 44x44 CSS px minimum touch target
      // (the disabled chip is included — it must keep its size, not shrink away)
      const controls = page.locator(".denn-btn, .denn-chip");
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await controls.nth(i).boundingBox();
        expect(box, `${app.name} ${vp.name}: control ${i} has no box`).not.toBeNull();
        if (box) {
          expect(
            Math.round(box.width),
            `${app.name} ${vp.name}: control ${i} width ${box.width} < 44`,
          ).toBeGreaterThanOrEqual(44);
          expect(
            Math.round(box.height),
            `${app.name} ${vp.name}: control ${i} height ${box.height} < 44`,
          ).toBeGreaterThanOrEqual(44);
        }
      }

      // keyboard: Tab reaches an interactive control and focus-visible shows a ring
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return { tag: el.tagName, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
      });
      expect(focus, `${app.name} ${vp.name}: nothing focused on Tab`).not.toBeNull();
      expect(focus?.tag).toBe("BUTTON");
      expect(focus?.outlineStyle, `${app.name} ${vp.name}: focus-visible has no outline`).not.toBe(
        "none",
      );
      expect(focus?.outlineWidth).not.toBe("0px");

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
