import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// The admin app is unchanged by spec 015 (still the @denn/ui primitive shell) and must make
// ZERO public-catalog requests. The mockup app's catalog connection is covered separately in
// mockup-catalog.spec.ts.
const ADMIN = {
  url: `http://localhost:${ADMIN_PORT}/`,
  title: "DENN PRODUCTS Admin Rebuild",
  heading: "DENN PRODUCTS Admin Rebuild",
  appId: "denn-admin-rebuild",
  otherText: "Mockup Rebuild",
} as const;

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test(`admin @ ${vp.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    // Guard: admin must never touch the public catalog endpoint.
    let firebaseHits = 0;
    await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
      firebaseHits++;
      await route.abort();
    });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(ADMIN.url, { waitUntil: "networkidle" });

    // identity + unchanged primitive shell
    await expect(page).toHaveTitle(ADMIN.title);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ADMIN.heading);
    await expect(page.getByTestId("app-id")).toHaveText(ADMIN.appId);
    await expect(page.getByRole("button", { name: "기본" })).toBeVisible();
    await expect(page.getByRole("button", { name: "카카오로 주문" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(ADMIN.otherText);

    // no public-catalog network from admin
    expect(firebaseHits).toBe(0);

    // no horizontal overflow
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // a disabled Chip is present and disabled; interactive controls meet 44x44
    const disabledChip = page.locator(".denn-chip:disabled");
    await expect(disabledChip).toHaveCount(1);
    await expect(disabledChip).toBeDisabled();
    const controls = page.locator(".denn-btn, .denn-chip");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
      }
    }

    // keyboard focus-visible
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { tag: el.tagName, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    // spec 035 put the operator print-size card above the primitive demo, so the first tab stop is
    // now its text input. What this test pins is that the FIRST focusable shows a visible outline.
    expect(["BUTTON", "INPUT"]).toContain(focus?.tag);
    expect(focus?.outlineStyle).not.toBe("none");
    expect(focus?.outlineWidth).not.toBe("0px");

    // accessibility + console
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
