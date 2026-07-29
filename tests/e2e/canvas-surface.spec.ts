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

import { deflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, type Page, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html`;

const BODY = [17, 34, 51] as const; // #112233
const STROKE = [255, 0, 0] as const; // #FF0000
const DRAWABLE = [0, 255, 0] as const; // #00FF00
const ALT_BODY = [0, 0, 255] as const; // #0000FF
const FRAME = [102, 51, 0] as const; // #663300
const MAT = [255, 255, 0] as const; // #FFFF00

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

test("frame plan draws distinct frame band, mat ring and photo areas", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto(FIXTURE_URL);
  await waitForReady(page);
  await page.getByTestId("fx-plan-frame").click();
  // the frame plan keeps the same logical size, so poll a pixel that only it produces
  await expect.poll(async () => rgb(await pixelAt(page, 5, 5))).toEqual([...FRAME]);

  // frameRect 0,0,300,200 ⊃ matRect 20,20,260,160 ⊃ imageZone 60,50,180,100
  expect(rgb(await pixelAt(page, 5, 100))).toEqual([...FRAME]); // frame band, left
  expect(rgb(await pixelAt(page, 295, 195))).toEqual([...FRAME]); // frame band, bottom-right
  expect(rgb(await pixelAt(page, 30, 30))).toEqual([...MAT]); // mat ring, above/left of the photo
  expect(rgb(await pixelAt(page, 270, 170))).toEqual([...MAT]); // mat ring, below/right
  expect(rgb(await pixelAt(page, 55, 100))).toEqual([...MAT]); // 5px left of the photo zone
  expect(rgb(await pixelAt(page, 150, 45))).toEqual([...MAT]); // 5px above the photo zone
  expect(rgb(await pixelAt(page, 150, 100))).toEqual([...DRAWABLE]); // inside the photo zone
  expect(rgb(await pixelAt(page, 62, 52))).toEqual([...DRAWABLE]); // just inside the top-left
  expect(rgb(await pixelAt(page, 238, 148))).toEqual([...DRAWABLE]); // just inside the bottom-right
  expect(errors).toEqual([]);

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
});

// --- spec 026: a real local file, decoded by the real browser, bound and drawn ------------------
// The bytes are generated here (a solid-colour PNG built with node:zlib) — no fixture file is added
// to the repo, nothing is downloaded, and no product image is used.

const PHOTO_A = [255, 0, 255] as const; // magenta
const PHOTO_B = [0, 255, 255] as const; // cyan
const FILE_NAME_MARKER = "USERPHOTOMARKER";

const CRC_TABLE: number[] = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** Minimal valid truecolour PNG filled with one flat colour. */
function solidPng(size: number, [r, g, b]: readonly [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const photoFile = (name: string, colour: readonly [number, number, number]) => ({
  name,
  mimeType: "image/png",
  buffer: solidPng(20, colour),
});

const fileInput = (page: Page) => page.getByTestId("fx-file");
const pickState = (page: Page) => page.getByTestId("fx-file-state");

async function pick(
  page: Page,
  name: string,
  colour: readonly [number, number, number],
): Promise<void> {
  await fileInput(page).setInputFiles(photoFile(name, colour));
}

test.describe("local user image binding (spec 026)", () => {
  test("decodes a picked file, binds it and draws real pixels inside the clip", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");

    // inside the clip → the decoded photo; outside the clip but inside the draw rect → body colour
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);
    expect(rgb(await pixelAt(page, 150, 100))).toEqual([...BODY]);
    expect(rgb(await pixelAt(page, 8, 8))).toEqual([...BODY]);
    expect(errors).toEqual([]);
  });

  test("empties the input value so the same file can be picked again", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    expect(await fileInput(page).inputValue()).toBe("");

    await page.getByTestId("fx-file-clear").click();
    await expect(pickState(page)).toHaveText("idle");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);

    // the very same file again — accepted because the value was emptied
    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);
    expect(errors).toEqual([]);
  });

  test("a fast replacement draws only the latest image", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await pick(page, `${FILE_NAME_MARKER}-b.png`, PHOTO_B);
    await expect(pickState(page)).toHaveText("ready");

    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_B]);
    // and it stays B — a late completion of A must not repaint
    expect(rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_B]);
    expect(errors).toEqual([]);
  });

  test("clear, unmount and remount leave no stale draw and no console error", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);

    await page.getByTestId("fx-unmount").click();
    await expect(canvas(page)).toHaveCount(0);
    await page.getByTestId("fx-mount").click();
    await waitForReady(page);
    // the surface came back with the still-bound photo, not a stale synthetic drawable
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);

    await page.getByTestId("fx-file-clear").click();
    await expect(pickState(page)).toHaveText("idle");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);
    expect(errors).toEqual([]);
  });

  test("no blob url or file name reaches text, ARIA, data-*, storage, location or console", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    const logs: string[] = [];
    page.on("console", (m: ConsoleMessage) => logs.push(m.text()));
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");

    const leaked = await page.evaluate(() => {
      const attributes: string[] = [];
      for (const element of Array.from(document.querySelectorAll("*"))) {
        for (const attribute of Array.from(element.attributes)) {
          // the file input's own value is browser-controlled and already asserted empty elsewhere
          if (element.tagName === "INPUT" && attribute.name === "type") continue;
          attributes.push(`${attribute.name}=${attribute.value}`);
        }
      }
      return {
        text: document.body.innerText,
        attributes: attributes.join("|"),
        storage: `${JSON.stringify(Object.entries(localStorage))}${JSON.stringify(
          Object.entries(sessionStorage),
        )}`,
        location: `${location.href}${location.hash}${location.search}`,
      };
    });

    for (const haystack of [leaked.text, leaked.attributes, leaked.storage, leaked.location]) {
      expect(haystack).not.toContain("blob:");
      expect(haystack).not.toContain(FILE_NAME_MARKER);
      expect(haystack).not.toContain("base64");
    }
    expect(logs.join("|")).not.toContain("blob:");
    expect(logs.join("|")).not.toContain(FILE_NAME_MARKER);
    expect(errors).toEqual([]);
  });

  test("the picker is labelled and accessible at 320px and desktop with no overflow", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(FIXTURE_URL);
      await waitForReady(page);
      await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
      await expect(pickState(page)).toHaveText("ready");

      const accessibleName = await fileInput(page).evaluate((element) => {
        const labels = (element as HTMLInputElement).labels;
        return labels && labels.length > 0 ? (labels[0].textContent ?? "") : "";
      });
      expect(accessibleName.trim()).toBe("사용자 이미지 선택");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
      ).toEqual([]);
    }
  });

  test("decoding a local file makes no network request", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(`http://localhost:${MOCKUP_PORT}/`) && !url.startsWith("blob:")) {
        external.push(url);
      }
    });
    await page.goto(FIXTURE_URL);
    await waitForReady(page);
    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    expect(external).toEqual([]);
  });
});

// --- spec 026 보완 1: the REAL React owner lifecycle in a real browser --------------------------
// The fixture mounts/unmounts the component that owns `useLocalImageBinding` (buttons `fx-owner-*`),
// which is a different thing from unmounting only the canvas surface (`fx-unmount`). Object-URL
// bookkeeping is instrumented on the TEST side (page.addInitScript wrapping window.URL) so the
// production module keeps its private url and gains no observability hook.

interface UrlOps {
  readonly created: number;
  readonly revoked: number;
  readonly duplicates: number;
  readonly outstanding: number;
}

async function instrumentObjectUrls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const created: string[] = [];
    const revoked = new Set<string>();
    let duplicates = 0;
    const realCreate = URL.createObjectURL.bind(URL);
    const realRevoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (source: Blob | MediaSource): string => {
      const url = realCreate(source as Blob);
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url: string): void => {
      if (revoked.has(url)) duplicates += 1;
      revoked.add(url);
      realRevoke(url);
    };
    (window as unknown as { __urlOps: () => UrlOps }).__urlOps = () => ({
      created: created.length,
      revoked: revoked.size,
      duplicates,
      outstanding: created.filter((url) => !revoked.has(url)).length,
    });
  });
}

const urlOps = (page: Page): Promise<UrlOps> =>
  page.evaluate(() => (window as unknown as { __urlOps: () => UrlOps }).__urlOps());

// Chromium prints this performance advisory because THESE TESTS read pixels back repeatedly with
// getImageData; it is caused by the test side, not by the app, so it is not owner-lifecycle noise.
const TEST_SIDE_ADVISORY = "willReadFrequently";

/** Console errors AND warnings — a state update after unmount would surface here. */
function collectConsoleNoise(page: Page): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning" && !m.text().includes(TEST_SIDE_ADVISORY)) warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { errors, warnings };
}

test.describe("local image binding — real hook owner lifecycle (spec 026)", () => {
  test("survives the StrictMode mount → cleanup → remount with a live controller", async ({
    page,
  }) => {
    const noise = collectConsoleNoise(page);
    await instrumentObjectUrls(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    // the fixture root is <StrictMode>, so the owner already went through mount → cleanup → remount
    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);

    const ops = await urlOps(page);
    expect(ops.created).toBeGreaterThan(0);
    expect(ops.outstanding).toBe(0); // the url is revoked once the decode finished
    expect(ops.duplicates).toBe(0);
    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
  });

  test("unmounting the owner disposes it: url revoked, binding gone, fresh state on remount", async ({
    page,
  }) => {
    const noise = collectConsoleNoise(page);
    await instrumentObjectUrls(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await expect(pickState(page)).toHaveText("ready");
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...PHOTO_A]);

    await page.getByTestId("fx-owner-off").click();
    await expect(page.getByTestId("fx-owner-state")).toHaveText("gone");
    await expect(fileInput(page)).toHaveCount(0);
    await expect(canvas(page)).toHaveCount(0);
    const afterUnmount = await urlOps(page);
    expect(afterUnmount.outstanding).toBe(0);
    expect(afterUnmount.duplicates).toBe(0);

    await page.getByTestId("fx-owner-on").click();
    // a brand-new controller: no leftover ready state and no stale user image on the canvas
    await expect(pickState(page)).toHaveText("idle");
    await waitForReady(page);
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);

    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
  });

  test("unmounting during an in-flight load leaves no outstanding url and no late pollution", async ({
    page,
  }) => {
    const noise = collectConsoleNoise(page);
    await instrumentObjectUrls(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    // no wait for "ready": the owner goes away while the decode may still be in flight
    await pick(page, `${FILE_NAME_MARKER}-a.png`, PHOTO_A);
    await page.getByTestId("fx-owner-off").click();
    await expect(page.getByTestId("fx-owner-state")).toHaveText("gone");

    await expect.poll(async () => (await urlOps(page)).outstanding).toBe(0);
    expect((await urlOps(page)).duplicates).toBe(0);

    await page.getByTestId("fx-owner-on").click();
    await expect(pickState(page)).toHaveText("idle"); // a late onload cannot revive the old owner
    await waitForReady(page);
    await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...DRAWABLE]);
    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
  });

  test("repeated owner cycles leak no object url and stay usable", async ({ page }) => {
    const noise = collectConsoleNoise(page);
    await instrumentObjectUrls(page);
    await page.goto(FIXTURE_URL);
    await waitForReady(page);

    for (const colour of [PHOTO_A, PHOTO_B, PHOTO_A]) {
      await pick(page, `${FILE_NAME_MARKER}-cycle.png`, colour);
      await expect(pickState(page)).toHaveText("ready");
      await expect.poll(async () => rgb(await pixelAt(page, 60, 50))).toEqual([...colour]);
      await page.getByTestId("fx-owner-off").click();
      await expect(page.getByTestId("fx-owner-state")).toHaveText("gone");
      await page.getByTestId("fx-owner-on").click();
      await expect(pickState(page)).toHaveText("idle");
      await waitForReady(page);
    }

    const ops = await urlOps(page);
    expect(ops.created).toBe(3);
    expect(ops.revoked).toBe(3);
    expect(ops.outstanding).toBe(0);
    expect(ops.duplicates).toBe(0);
    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
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
  // spec 026: the local image picker is fixture-only — the customer screen gains no file input
  expect(await page.locator('input[type="file"]').count()).toBe(0);
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
