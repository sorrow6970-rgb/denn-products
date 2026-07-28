// Real Chromium Canvas verification for the preview surface (spec 022 §8 E2E).
//
// The page under test is the E2E-only harness entry (`/e2e-canvas-fixture.html`), never the customer
// screen: no test-only query, route, debug UI or global is added to `/`. Everything drawn is
// synthetic (fixed hex colours + an in-memory same-origin drawable), so nothing here proves real
// product images, CORS-clean sources, Safari/Android/Samsung/KakaoTalk behaviour or device
// sharpness — those stay NOT TESTED.
//
// `getImageData` is used ONLY inside these test-side `page.evaluate` calls; production source never
// gains it (asserted in the executor's own source scan and by the surface unit tests).

import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, type Page, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html`;

const BODY = [17, 34, 51] as const; // #112233
const STROKE = [255, 0, 0] as const; // #FF0000
const DRAWABLE = [0, 255, 0] as const; // #00FF00
const ALT_BODY = [0, 0, 255] as const; // #0000FF

const canvas = (page: Page) => page.getByTestId("preview-canvas");
const statusText = (page: Page) => page.getByTestId("canvas-status");

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

/** Wait for the surface's own readiness signal — no fixed sleep anywhere in this file. */
async function waitForReady(page: Page): Promise<void> {
  await expect.poll(async () => statusText(page).textContent()).toBe("미리보기가 준비되었습니다.");
}

interface SurfaceMetrics {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
}

async function metrics(page: Page): Promise<SurfaceMetrics> {
  return canvas(page).evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const rect = node.getBoundingClientRect();
    return {
      cssWidth: rect.width,
      cssHeight: rect.height,
      backingWidth: node.width,
      backingHeight: node.height,
    };
  });
}

/** Read one logical-coordinate pixel from the real canvas (test-side getImageData only). */
async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  return canvas(page).evaluate(
    (element, point) => {
      const node = element as HTMLCanvasElement;
      const rect = node.getBoundingClientRect();
      const context = node.getContext("2d");
      if (context === null) return [-1, -1, -1, -1];
      const scaleX = node.width / rect.width;
      const scaleY = node.height / rect.height;
      const data = context.getImageData(
        Math.round(point.x * scaleX),
        Math.round(point.y * scaleY),
        1,
        1,
      ).data;
      return [data[0], data[1], data[2], data[3]];
    },
    { x, y },
  );
}

const rgb = (pixel: number[]): readonly number[] => pixel.slice(0, 3);

test.describe("preview canvas surface @ deviceScaleFactor 1", () => {
  test("draws fill, clipped image and stroke with real pixels", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    // fill-rect body
    expect(rgb(await pixelAt(page, 8, 8))).toEqual([...BODY]);
    // draw-image-cover inside the clip → drawable colour
    expect(rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);
    // inside the DRAW rect but outside the CLIP rect → still body colour (clip really applied)
    expect(rgb(await pixelAt(page, 150, 100))).toEqual([...BODY]);
    // stroke-rect edge vs its interior
    expect(rgb(await pixelAt(page, 200, 140))).toEqual([...STROKE]);
    expect(rgb(await pixelAt(page, 230, 140))).toEqual([...BODY]);

    expect(errors).toEqual([]);
  });

  test("backing equals CSS size × devicePixelRatio (1)", async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await waitForReady(page);
    const m = await metrics(page);
    expect(m.cssWidth).toBeCloseTo(300, 1);
    expect(m.cssHeight).toBeCloseTo(200, 1);
    expect(m.backingWidth).toBe(300);
    expect(m.backingHeight).toBe(200);
  });

  test("a new plan with a new logical size updates CSS, backing and pixels", async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await waitForReady(page);
    await page.getByTestId("fx-plan-b").click();

    // poll the BACKING: it is the last step of the draw, so CSS+backing+pixels are all settled.
    await expect.poll(async () => (await metrics(page)).backingWidth).toBe(180);
    const m = await metrics(page);
    expect(m.cssWidth).toBeCloseTo(180, 1);
    expect(m.cssHeight).toBeCloseTo(120, 1);
    expect(m.backingHeight).toBe(120);
    await expect.poll(async () => rgb(await pixelAt(page, 20, 20))).toEqual([...ALT_BODY]);
  });

  test("a zero-size container waits and recovers when shown again", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await page.getByTestId("fx-hide").click();
    await expect
      .poll(async () => statusText(page).textContent())
      .toBe("미리보기를 준비하는 중입니다.");

    await page.getByTestId("fx-show").click();
    await waitForReady(page);
    expect(rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);
    expect(errors).toEqual([]);
  });

  test("unmount and remount leave no console error and redraw", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await page.getByTestId("fx-unmount").click();
    await expect(canvas(page)).toHaveCount(0);
    await page.getByTestId("fx-mount").click();
    await waitForReady(page);
    expect(rgb(await pixelAt(page, 8, 8))).toEqual([...BODY]);
    expect(errors).toEqual([]);
  });

  test("canvas is named, page does not overflow, axe finds nothing serious", async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 640 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(FIXTURE_URL);
      await waitForReady(page);

      await expect(canvas(page)).toHaveAttribute("role", "img");
      await expect(canvas(page)).toHaveAttribute("aria-label", "합성 미리보기");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious).toEqual([]);
    }
  });
});

test("the customer screen shows no canvas and no route to the fixture", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.route("**/firebasestorage.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ models: [{ id: "m1", name: "샘플" }] }),
    }),
  );
  await page.goto(`http://localhost:${MOCKUP_PORT}/`);
  await expect(page.getByTestId("catalog-status")).toHaveText("카탈로그 준비 완료");

  expect(await page.locator("canvas").count()).toBe(0);
  expect(await page.getByTestId("preview-canvas").count()).toBe(0);
  expect(await page.locator('a[href*="fixture"]').count()).toBe(0);
  expect(await page.content()).not.toContain("e2e-canvas-fixture");
  expect(errors).toEqual([]);
});

test.describe("preview canvas surface @ deviceScaleFactor 3", () => {
  test.use({ deviceScaleFactor: 3 });

  test("caps the effective DPR at 2", async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(3);
    const m = await metrics(page);
    expect(m.cssWidth).toBeCloseTo(300, 1);
    expect(m.backingWidth).toBe(600); // 300 × min(3, 2)
    expect(m.backingHeight).toBe(400);
    // pixels still addressed in logical coordinates through the surface transform
    expect(rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);
    expect(rgb(await pixelAt(page, 150, 100))).toEqual([...BODY]);
  });
});
