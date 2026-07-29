// Spec 027 — the customer preview composer on the REAL customer screen (`/`), in real Chromium.
//
// Everything is synthetic: the catalog JSON is routed (any other Firebase request fails the test)
// and the photos are solid-colour PNGs generated here with node:zlib, so no product data, no real
// image and no network beyond the one intercepted catalog URL is involved. Real devices, 200% zoom,
// Safari/Android/Samsung/KakaoTalk and operational images stay NOT TESTED.

import { deflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, type Page, type Route, expect, test } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { MOCKUP_PORT } from "../../playwright.config";

const MOCKUP_URL = `http://localhost:${MOCKUP_PORT}/`;
const CATALOG_URL = buildPublicCatalogUrl();

// Case: one model (logical 300x200) with a two-zone template. Frame: one size + the builtin `full`
// template, and three colours of which only the plain solid one is supported.
const SECRET_COLOR_ID = "SECRET_COLOR_ID_MARKER";
const CATALOG = JSON.stringify({
  models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
  caseCategories: [{ id: "cc1", name: "분류 A" }],
  caseTemplates: [
    {
      id: "ct1",
      name: "케이스 알파",
      type: "uploaded",
      categoryId: "cc1",
      photoZones: [
        { x: 5, y: 5, w: 40, h: 40 },
        { x: 55, y: 5, w: 40, h: 40 },
      ],
    },
  ],
  frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 }],
  frameCategories: [{ id: "fc1", name: "액자 A" }],
  frameTemplates: [{ id: "full", name: "기본 액자", type: "builtin" }],
  frameColors: [
    { id: SECRET_COLOR_ID, name: "블랙", fill: "#1A1A1A" },
    { id: "oak", name: "원목 오크", fill: "#A07848", grain: true },
    { id: "bad", name: "이상한 색", fill: "red" },
  ],
});

const CASE_BODY = [26, 26, 26] as const; // #1A1A1A
const FRAME_BODY = [26, 26, 26] as const; // the same solid is the only supported frame colour
const MAT = [255, 255, 255] as const; // no mat colour in the fixture → #FFFFFF
const PHOTO_A = [255, 0, 255] as const;
const PHOTO_B = [0, 255, 255] as const;
const FILE_MARKER = "USERPHOTOMARKER";

// --- synthetic PNG (no fixture file is added to the repository) ---------------
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
function solidPng(size: number, [r, g, b]: readonly [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
const photo = (name: string, colour: readonly [number, number, number]) => ({
  name,
  mimeType: "image/png",
  buffer: solidPng(20, colour),
});

// --- page helpers ------------------------------------------------------------
async function routeCatalog(page: Page): Promise<{ unexpected: () => number }> {
  let unexpected = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route: Route) => {
    if (route.request().url() !== CATALOG_URL) {
      unexpected++;
      await route.abort();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: CATALOG });
  });
  return { unexpected: () => unexpected };
}

const TEST_SIDE_ADVISORY = "willReadFrequently";
function collectConsole(page: Page): { errors: string[]; warnings: string[]; all: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const all: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    all.push(m.text());
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning" && !m.text().includes(TEST_SIDE_ADVISORY)) warnings.push(m.text());
  });
  page.on("pageerror", (e) => {
    errors.push(String(e));
    all.push(String(e));
  });
  return { errors, warnings, all };
}

const canvas = (page: Page) => page.getByTestId("preview-canvas");
const canvasStatus = (page: Page) => page.getByTestId("canvas-status");
const previewStatus = (page: Page) => page.getByTestId("preview-status");
const byName = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function gotoReady(page: Page): Promise<void> {
  await page.goto(MOCKUP_URL);
  await expect(page.getByTestId("catalog-status")).toHaveText("카탈로그 준비 완료");
}

/** Template cards only — a category chip can carry the same words as a template name. */
const templateCard = (page: Page, name: RegExp) =>
  page.getByTestId("template-list").getByRole("button", { name });

async function chooseCase(page: Page): Promise<void> {
  await byName(page, "휴대폰 케이스").click();
  await byName(page, "모델 하나").click();
  await templateCard(page, /케이스 알파/).click();
}

async function chooseFrame(page: Page): Promise<void> {
  await byName(page, "액자").click();
  await byName(page, "사이즈 하나").click();
  await templateCard(page, /기본 액자/).click();
}

const openComposer = (page: Page) => page.getByTestId("preview-open").click();
const pickColour = (page: Page, hex: string) => page.getByTestId(`preview-color-${hex}`).click();
const pickPhoto = (page: Page, slot: string, colour: readonly [number, number, number]) =>
  page.getByTestId(`preview-file-${slot}`).setInputFiles(photo(`${FILE_MARKER}.png`, colour));

async function waitForCanvas(page: Page): Promise<void> {
  await expect(canvasStatus(page)).toHaveText("미리보기가 준비되었습니다.");
}

/** One logical-coordinate pixel from the real canvas (test-side getImageData only). */
async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  return canvas(page).evaluate(
    (element, point) => {
      const node = element as HTMLCanvasElement;
      const rect = node.getBoundingClientRect();
      const context = node.getContext("2d");
      if (context === null) return [-1, -1, -1, -1];
      const data = context.getImageData(
        Math.round(point.x * (node.width / rect.width)),
        Math.round(point.y * (node.height / rect.height)),
        1,
        1,
      ).data;
      return [data[0], data[1], data[2], data[3]];
    },
    { x, y },
  );
}
const rgb = (pixel: number[]): readonly number[] => pixel.slice(0, 3);
const cssSize = (page: Page): Promise<{ width: number; height: number }> =>
  canvas(page).evaluate((element) => {
    const rect = (element as HTMLCanvasElement).getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

// --- case ---------------------------------------------------------------------

test("case: selection → composer → colour → per-zone photos → real pixels", async ({ page }) => {
  const noise = collectConsole(page);
  const route = await routeCatalog(page);
  await gotoReady(page);
  await chooseCase(page);

  // completing the selection must NOT create a Canvas by itself
  await expect(page.getByTestId("browse-summary")).toBeVisible();
  expect(await canvas(page).count()).toBe(0);

  await openComposer(page);
  expect(await canvas(page).count()).toBe(0);
  await expect(previewStatus(page)).toHaveText("색상을 선택해 주세요.");

  await pickColour(page, "#1A1A1A");
  await expect(previewStatus(page)).toHaveText("사진을 선택해 주세요.");
  expect(await canvas(page).count()).toBe(0);

  // one zone is not enough: every zone owns its own photo
  await pickPhoto(page, "case-zone-0", PHOTO_A);
  await expect(page.getByTestId("preview-slot-case-zone-0")).toHaveText("선택됨");
  expect(await canvas(page).count()).toBe(0);

  await pickPhoto(page, "case-zone-1", PHOTO_B);
  await waitForCanvas(page);

  // model 300x200; zones 5/5/40/40 → (15,10,120,80) and 55/5/40/40 → (165,10,120,80)
  expect(await cssSize(page)).toEqual({ width: 300, height: 200 });
  expect(rgb(await pixelAt(page, 75, 50))).toEqual([...PHOTO_A]);
  expect(rgb(await pixelAt(page, 225, 50))).toEqual([...PHOTO_B]);
  expect(rgb(await pixelAt(page, 150, 150))).toEqual([...CASE_BODY]); // body outside both zones
  expect(noise.errors).toEqual([]);
  expect(route.unexpected()).toBe(0);
});

test("case: replace, re-pick the same file and clear", async ({ page }) => {
  const noise = collectConsole(page);
  await routeCatalog(page);
  await gotoReady(page);
  await chooseCase(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "case-zone-0", PHOTO_A);
  await pickPhoto(page, "case-zone-1", PHOTO_B);
  await waitForCanvas(page);

  // replacement: only the replaced zone changes
  await pickPhoto(page, "case-zone-0", PHOTO_B);
  await expect.poll(async () => rgb(await pixelAt(page, 75, 50))).toEqual([...PHOTO_B]);
  expect(rgb(await pixelAt(page, 225, 50))).toEqual([...PHOTO_B]);

  // the input value is emptied by the owner, so the SAME file can be picked again
  expect(await page.getByTestId("preview-file-case-zone-0").inputValue()).toBe("");
  await pickPhoto(page, "case-zone-0", PHOTO_A);
  await expect.poll(async () => rgb(await pixelAt(page, 75, 50))).toEqual([...PHOTO_A]);

  // clearing one zone removes the whole plan (no partial preview)
  await page.getByTestId("preview-clear-case-zone-0").click();
  await expect(canvas(page)).toHaveCount(0);
  await expect(previewStatus(page)).toHaveText("사진을 선택해 주세요.");
  expect(noise.errors).toEqual([]);
});

test("changing the selection closes the composer and drops the preview", async ({ page }) => {
  const noise = collectConsole(page);
  await routeCatalog(page);
  await gotoReady(page);
  await chooseCase(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "case-zone-0", PHOTO_A);
  await pickPhoto(page, "case-zone-1", PHOTO_B);
  await waitForCanvas(page);

  // switching the product kind invalidates everything the composer held
  await byName(page, "액자").click();
  await expect(canvas(page)).toHaveCount(0);
  await expect(page.getByTestId("preview-open")).toHaveCount(0); // selection is incomplete again

  await byName(page, "사이즈 하나").click();
  await templateCard(page, /기본 액자/).click();
  await expect(page.getByTestId("preview-open")).toBeVisible(); // a fresh, unopened composer step
  expect(await canvas(page).count()).toBe(0);
  expect(noise.errors).toEqual([]);
});

// --- frame --------------------------------------------------------------------

test("frame: only supported colours, measured logical width capped at 500, real pixels", async ({
  page,
}) => {
  const noise = collectConsole(page);
  await routeCatalog(page);
  await gotoReady(page);
  await chooseFrame(page);
  await openComposer(page);

  // grain and non-hex colours are not offered, and nothing is pre-selected
  await expect(page.getByTestId("preview-color-#1A1A1A")).toBeVisible();
  expect(await page.getByText("원목 오크").count()).toBe(0);
  expect(await page.getByText("이상한 색").count()).toBe(0);
  // no colour is pre-selected (browse chips have their own pressed state, so scope to swatches)
  expect(await page.locator('.denn-composer__swatch[aria-pressed="true"]').count()).toBe(0);

  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "frame-image", PHOTO_A);
  await waitForCanvas(page);

  const size = await cssSize(page);
  expect(size.width).toBeLessThanOrEqual(500);
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBe(Math.round(size.width * 1.4));

  const band = Math.max(1, Math.round((size.width * 5) / 100));
  expect(rgb(await pixelAt(page, 2, 2))).toEqual([...FRAME_BODY]); // frame band
  expect(rgb(await pixelAt(page, band + 3, band + 3))).toEqual([...MAT]); // mat inside the 8px inset
  expect(rgb(await pixelAt(page, size.width / 2, size.height / 2))).toEqual([...PHOTO_A]); // photo
  expect(noise.errors).toEqual([]);
});

test("frame: a narrower viewport produces a narrower logical width", async ({ page }) => {
  await routeCatalog(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoReady(page);
  await chooseFrame(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "frame-image", PHOTO_A);
  await waitForCanvas(page);

  const narrow = await cssSize(page);
  expect(narrow.width).toBeLessThanOrEqual(320);
  expect(narrow.height).toBe(Math.round(narrow.width * 1.4));
  // the page itself never scrolls sideways; the canvas wrapper does
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

// --- safety, accessibility, leakage -------------------------------------------

test("no file name, blob url, catalog id or failure code reaches the page", async ({ page }) => {
  const noise = collectConsole(page);
  await routeCatalog(page);
  await gotoReady(page);
  await chooseCase(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "case-zone-0", PHOTO_A);
  await pickPhoto(page, "case-zone-1", PHOTO_B);
  await waitForCanvas(page);

  const leaked = await page.evaluate(() => {
    const attributes: string[] = [];
    for (const element of Array.from(document.querySelectorAll("*"))) {
      for (const attribute of Array.from(element.attributes)) {
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
    for (const forbidden of [
      FILE_MARKER,
      "blob:",
      "base64",
      SECRET_COLOR_ID,
      "PLAN_BUILD_FAILED",
    ]) {
      expect(haystack).not.toContain(forbidden);
    }
  }
  const logged = noise.all.join("|");
  expect(logged).not.toContain(FILE_MARKER);
  expect(logged).not.toContain("blob:");
  expect(noise.errors).toEqual([]);
});

test("keyboard only: open the composer, choose a colour, reach the file inputs", async ({
  page,
}) => {
  await routeCatalog(page);
  await gotoReady(page);
  await chooseCase(page);

  await page.getByTestId("preview-open").focus();
  await page.keyboard.press("Enter");
  await expect(previewStatus(page)).toHaveText("색상을 선택해 주세요.");

  const swatch = page.getByTestId("preview-color-#1A1A1A");
  await swatch.focus();
  await page.keyboard.press("Enter");
  await expect(swatch).toHaveAttribute("aria-pressed", "true");
  await expect(previewStatus(page)).toHaveText("사진을 선택해 주세요.");

  const input = page.getByTestId("preview-file-case-zone-0");
  await input.focus();
  expect(await input.evaluate((element) => element === document.activeElement)).toBe(true);
});

for (const viewport of [
  { name: "320x568", width: 320, height: 568 },
  { name: "1280x800", width: 1280, height: 800 },
]) {
  test(`composer @ ${viewport.name}: overflow 0, 44px targets, axe 0, console 0`, async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const route = await routeCatalog(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await gotoReady(page);
    await chooseCase(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "case-zone-0", PHOTO_A);
    await pickPhoto(page, "case-zone-1", PHOTO_B);
    await waitForCanvas(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const targets = page.locator(
      ".denn-composer__swatch, .denn-composer__clear, .denn-composer__slot-input",
    );
    const count = await targets.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const box = await targets.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
    expect(route.unexpected()).toBe(0);
  });
}
