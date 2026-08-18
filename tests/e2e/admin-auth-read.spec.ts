import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Operator remote-read card in a real browser (spec 036 §8). The default build is UNCONFIGURED, so
// the whole point of this suite is proving that nothing Firebase-shaped happens: no request, no
// controls, and no trace of the SDK in the customer bundle.

const URL = `http://localhost:${ADMIN_PORT}/`;

const FIREBASE_HOST = /firebaseio|firebasestorage|googleapis|identitytoolkit|firebaseapp/i;

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test(`operator remote read (spec 036) @ ${vp.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(URL, { waitUntil: "networkidle" });

    // the feature is off unless explicitly configured at build time
    const status = page.getByTestId("admin-read-status");
    await expect(status).toContainText("운영자 원격 읽기가 아직 활성화되지 않았습니다.");

    // no login form, no load button, nothing to click
    await expect(page.getByTestId("admin-read-email")).toHaveCount(0);
    await expect(page.getByTestId("admin-read-password")).toHaveCount(0);
    await expect(page.getByTestId("admin-read-load")).toHaveCount(0);
    await expect(page.getByTestId("frame-print-size-editor")).toHaveCount(0);

    // no save / publish / order affordance anywhere in the card
    const card = page
      .getByTestId("admin-read-status")
      .locator("xpath=ancestor::div[@class='denn-card']");
    await expect(card.locator("button, a, [role='button']")).toHaveCount(0);
    await expect(card).not.toContainText("주문");

    // give an unwanted lazy import a chance to appear, then prove it did not
    await page.waitForTimeout(500);
    const firebaseRequests = requests.filter((u) => FIREBASE_HOST.test(u));
    expect(firebaseRequests).toEqual([]);
    const external = requests.filter((u) => !u.startsWith(`http://localhost:${ADMIN_PORT}/`));
    expect(external).toEqual([]);

    // keyboard focus stays visible with the new card present
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    expect(focus?.outlineStyle).not.toBe("none");
    expect(focus?.outlineWidth).not.toBe("0px");

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(consoleErrors).toEqual([]);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("the customer bundle contains no Firebase SDK and no admin-read code", () => {
  const staging = process.env.DENN_E2E_STAGING;
  expect(staging, "DENN_E2E_STAGING").toBeTruthy();
  const assets = join(String(staging), "mockup", "assets");
  const js = readdirSync(assets).filter((f) => f.endsWith(".js"));
  expect(js.length).toBeGreaterThan(0);

  const bundle = js.map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
  for (const marker of [
    "firebase/auth",
    "firebase/storage",
    "admin-read",
    "ADMIN_STATE_OBJECT_PATH",
    "admin/state.json",
    "onAuthStateChanged",
    "signInWithEmailAndPassword",
  ]) {
    expect(bundle.includes(marker), marker).toBe(false);
  }
});
