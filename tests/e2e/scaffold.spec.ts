import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Spec 090: preparation entry, existing local tools, and unchanged default-off remote gates.
const ADMIN = {
  url: `http://localhost:${ADMIN_PORT}/`,
  title: "DENN PRODUCTS Admin Rebuild",
  heading: "운영자 작업 준비",
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

    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "localhost") {
        external.push(request.url());
      }
    });
    // Guard: admin must never touch the public catalog endpoint.
    let firebaseHits = 0;
    await page.route("**/firebasestorage.googleapis.com/**", async (route) => {
      firebaseHits++;
      await route.abort();
    });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(ADMIN.url, { waitUntil: "networkidle" });

    // Identity stays stable; the removed demo controls must not return.
    await expect(page).toHaveTitle(ADMIN.title);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ADMIN.heading);
    await expect(page.getByTestId("app-id")).toHaveText(ADMIN.appId);
    for (const removed of ["데모", "보기 옵션", "담당자", "필수 항목입니다", "카카오로 주문"]) {
      await expect(page.locator("body")).not.toContainText(removed);
    }
    await expect(page.getByRole("button")).toHaveCount(0);
    await expect(page.getByTestId("admin-read-status")).toContainText("아직 활성화되지 않았습니다");
    await expect(page.getByTestId("space-v2-issue-panel")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(ADMIN.otherText);

    // no public-catalog network from admin
    expect(firebaseHits).toBe(0);

    // no horizontal overflow
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // Keep the target-size gate on the real remaining local inputs, not removed demo buttons.
    const controls = page.locator(".denn-field__input");
    const count = await controls.count();
    expect(count).toBe(2);
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
    await page.getByTestId("print-size-width").fill("21");
    await page.getByTestId("print-size-height").fill("29.7");
    await expect(page.getByText("카탈로그 계약 통과", { exact: true })).toBeVisible();
    await page.getByTestId("print-size-width").fill("");
    await page.getByTestId("print-size-height").fill("");
    expect(external).toEqual([]);
    const { mkdirSync } = await import("node:fs");
    mkdirSync("docs/rebuild/results/spec-090", { recursive: true });
    await page.screenshot({
      path: `docs/rebuild/results/spec-090/admin-preparation-${vp.width}x${vp.height}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}
