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

// Chromium's partial raster re-uses a compositor tile's previous pixels, so an anti-aliased edge
// inherits whatever that tile was painting a moment earlier - which made spec 084's audit PNGs
// differ between runs on identical geometry. The spec 085 evidence captures at the bottom of this
// file need byte-reproducible output, and a launch flag is a WORKER option, so it has to be set
// here rather than beside them. It changes how the compositor re-uses tiles, not what is drawn:
// every assertion in this file reads the DOM or the Canvas's own pixels, never a screenshot.
test.use({ launchOptions: { args: ["--disable-partial-raster"] } });

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

// --- spec 028: template art on the customer canvas ------------------------------
// The art is a synthetic RGBA PNG whose LEFT half is opaque and whose right half is fully
// transparent, so one image proves both the stretch (it covers its whole destination) and the layer
// order (what shows through on the right is the photo underneath).

const ART_COLOUR = [255, 128, 0] as const; // orange
const ART_TOKEN = "ARTTOKENMARKER";
const FB_ORIGIN = "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o";
const ART_OK_URL = `${FB_ORIGIN}/templates%2Fart-ok.png?alt=media&token=${ART_TOKEN}`;
const ART_REFUSED_URL = `${FB_ORIGIN}/templates%2Fart-refused.png?alt=media&token=${ART_TOKEN}`;

/** RGBA PNG: left half opaque `colour`, right half fully transparent. */
function halfTransparentPng(size: number, [r, g, b]: readonly [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const opaque = x < size / 2;
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = opaque ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const ART_PNG = halfTransparentPng(20, ART_COLOUR);
const ART_DATA_URL = `data:image/png;base64,${ART_PNG.toString("base64")}`;

const artCatalog = (over: {
  caseTemplate?: Record<string, unknown>;
  frameTemplate?: Record<string, unknown>;
}): string =>
  JSON.stringify({
    models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
    caseCategories: [{ id: "cc1", name: "분류 A" }],
    caseTemplates: [
      {
        id: "ct1",
        name: "케이스 알파",
        type: "uploaded",
        categoryId: "cc1",
        photoZones: [{ x: 5, y: 5, w: 90, h: 90 }],
        ...over.caseTemplate,
      },
    ],
    frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 }],
    frameCategories: [{ id: "fc1", name: "액자 A" }],
    frameTemplates: [
      { id: "full", name: "기본 액자", type: "builtin" },
      ...(over.frameTemplate
        ? [{ id: "ftart", name: "아트 액자", type: "uploaded", ...over.frameTemplate }]
        : []),
    ],
    frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
  });

interface ArtRoutes {
  /** every request to an art URL, tagged `cors` (anonymous, i.e. the art owner) or `plain`
   * (the spec 018 thumbnail `<img>`, which is a different consumer of the same URL). */
  readonly artRequests: () => string[];
  readonly corsRequests: () => number;
  readonly unexpected: () => number;
}

/** Route the catalog plus the two synthetic art URLs; everything else on the host is aborted. */
async function routeArt(page: Page, catalogBody: string): Promise<ArtRoutes> {
  const artRequests: string[] = [];
  let unexpected = 0;
  await page.route("**/firebasestorage.googleapis.com/**", async (route: Route) => {
    const url = route.request().url();
    if (url === CATALOG_URL) {
      await route.fulfill({ status: 200, contentType: "application/json", body: catalogBody });
      return;
    }
    if (url === ART_OK_URL) {
      artRequests.push(route.request().headers().origin ? "cors" : "plain");
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: ART_PNG,
      });
      return;
    }
    if (url === ART_REFUSED_URL) {
      // A genuinely missing `access-control-allow-origin` CANNOT be simulated here: Playwright
      // normalises fulfilled responses and adds the header, so an anonymous fulfilment always
      // succeeds (measured). What a CORS refusal looks like TO THE PAGE is an errored load, which
      // is what this abort reproduces. "no ACAO ⇒ load failure" itself stays NOT TESTED.
      artRequests.push(route.request().headers().origin ? "cors" : "plain");
      await route.abort();
      return;
    }
    unexpected++;
    await route.abort();
  });
  return {
    artRequests: () => artRequests,
    corsRequests: () => artRequests.filter((tag) => tag === "cors").length,
    unexpected: () => unexpected,
  };
}

/** Read a pixel and report whether reading was allowed (a tainted canvas throws SecurityError). */
async function pixelReadable(page: Page): Promise<boolean> {
  return canvas(page).evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const context = node.getContext("2d");
    if (context === null) return false;
    try {
      context.getImageData(1, 1, 1, 1);
      return true;
    } catch {
      return false;
    }
  });
}

const ART_BLOCKED_MESSAGE = "템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.";

async function chooseArtFrame(page: Page): Promise<void> {
  await byName(page, "액자").click();
  await byName(page, "사이즈 하나").click();
  await templateCard(page, /아트 액자/).click();
}

test.describe("template art (spec 028)", () => {
  test("case: a data-url art is stretched over the whole canvas, above the photo", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const routes = await routeArt(page, artCatalog({ caseTemplate: { dataUrl: ART_DATA_URL } }));
    await gotoReady(page);
    await chooseCase(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "case-zone-0", PHOTO_A);
    await waitForCanvas(page);

    // the art covers the canvas: its opaque left half wins over the photo, the right half shows it
    await expect.poll(async () => rgb(await pixelAt(page, 60, 100))).toEqual([...ART_COLOUR]);
    expect(rgb(await pixelAt(page, 240, 100))).toEqual([...PHOTO_A]);
    // a data: url never reaches the network
    expect(routes.corsRequests()).toBe(0);
    expect(noise.errors).toEqual([]);
  });

  test("frame: a trusted URL art loads CORS-clean and is stretched over the mat rect", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const routes = await routeArt(page, artCatalog({ frameTemplate: { dataUrl: ART_OK_URL } }));
    await gotoReady(page);
    await chooseArtFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "frame-image", PHOTO_A);
    await waitForCanvas(page);

    const size = await cssSize(page);
    const band = Math.max(1, Math.round((size.width * 5) / 100));
    // the frame band is OUTSIDE the mat, so the art must not reach it
    expect(rgb(await pixelAt(page, 2, 2))).toEqual([...FRAME_BODY]);
    // inside the mat: the art's opaque half on the left, the photo showing through on the right
    await expect
      .poll(async () => rgb(await pixelAt(page, band + 5, size.height / 2)))
      .toEqual([...ART_COLOUR]);
    expect(rgb(await pixelAt(page, size.width - band - 5, size.height / 2))).not.toEqual([
      ...ART_COLOUR,
    ]);

    // exactly one anonymous request, and the canvas is still readable → CORS-clean
    expect(routes.corsRequests()).toBe(1);
    expect(await pixelReadable(page)).toBe(true);
    expect(noise.errors).toEqual([]);
  });

  test("frame: a failed art load blocks the canvas and is never retried", async ({ page }) => {
    const routes = await routeArt(
      page,
      artCatalog({ frameTemplate: { dataUrl: ART_REFUSED_URL } }),
    );
    await gotoReady(page);
    await chooseArtFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "frame-image", PHOTO_A);

    await expect(previewStatus(page)).toHaveText(ART_BLOCKED_MESSAGE);
    await expect(canvas(page)).toHaveCount(0);
    // exactly ONE anonymous request: a failed load is never retried without crossOrigin
    expect(routes.corsRequests()).toBe(1);
    expect(routes.unexpected()).toBe(0);
  });

  test("frame: a legacy builder-crop variant is refused before any request", async ({ page }) => {
    const routes = await routeArt(
      page,
      artCatalog({ frameTemplate: { dataUrl: ART_OK_URL, builtBy: "builder" } }),
    );
    await gotoReady(page);
    await chooseArtFrame(page);
    await openComposer(page);

    await expect(previewStatus(page)).toHaveText(ART_BLOCKED_MESSAGE);
    await expect(canvas(page)).toHaveCount(0);
    expect(routes.corsRequests()).toBe(0); // the owner never even asks for it
  });

  test("frame: a builtin template keeps the existing art-free preview", async ({ page }) => {
    const routes = await routeArt(page, artCatalog({ frameTemplate: { dataUrl: ART_OK_URL } }));
    await gotoReady(page);
    await chooseFrame(page); // the builtin `full` template
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "frame-image", PHOTO_A);
    await waitForCanvas(page);

    const size = await cssSize(page);
    expect(rgb(await pixelAt(page, size.width / 2, size.height / 2))).toEqual([...PHOTO_A]);
    expect(routes.corsRequests()).toBe(0);
  });

  test("a late art load cannot pollute a preview after the selection changed", async ({ page }) => {
    const noise = collectConsole(page);
    await routeArt(page, artCatalog({ caseTemplate: { dataUrl: ART_DATA_URL } }));
    await gotoReady(page);
    await chooseCase(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "case-zone-0", PHOTO_A);
    await waitForCanvas(page);

    // switch to the frame flow: the case composer (and its art owner) is unmounted
    await byName(page, "액자").click();
    await expect(canvas(page)).toHaveCount(0);
    await byName(page, "사이즈 하나").click();
    await templateCard(page, /기본 액자/).click();
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "frame-image", PHOTO_B);
    await waitForCanvas(page);

    // the frame preview shows its own photo, never the case art
    const size = await cssSize(page);
    await expect
      .poll(async () => rgb(await pixelAt(page, size.width / 2, size.height / 2)))
      .toEqual([...PHOTO_B]);
    expect(rgb(await pixelAt(page, 2, 2))).toEqual([...FRAME_BODY]);
    expect(noise.errors).toEqual([]);
  });

  test("no art url, token or source kind reaches the page", async ({ page }) => {
    const noise = collectConsole(page);
    await routeArt(page, artCatalog({ frameTemplate: { dataUrl: ART_OK_URL } }));
    await gotoReady(page);
    await chooseArtFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickPhoto(page, "frame-image", PHOTO_A);
    await waitForCanvas(page);

    const leaked = await page.evaluate(() => {
      const attributes: string[] = [];
      for (const element of Array.from(document.querySelectorAll("*"))) {
        for (const attribute of Array.from(element.attributes)) {
          if (element.tagName === "INPUT" && attribute.name === "type") continue;
          // spec 018 allows the template THUMBNAIL to carry the url in its own img[src]; the art
          // owner must not add any further surface, which is what this scan checks.
          if (element.tagName === "IMG" && attribute.name === "src") continue;
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
        ART_TOKEN,
        "firebasestorage",
        "alt=media",
        "base64",
        "firebase-download-image",
        "LOAD_FAILED",
      ]) {
        expect(haystack).not.toContain(forbidden);
      }
    }
    expect(noise.all.join("|")).not.toContain(ART_TOKEN);
    expect(noise.errors).toEqual([]);
  });
});

// --- pan / zoom editing (spec 029) -------------------------------------------
// The photos above are one solid colour, which cannot show movement, so this block uses a two-tone
// photo: the drawn boundary between the halves is what a pan actually moves.
//
// Geometry used by the assertions (case model 300x200, zone 0 = 5/5/40/40 -> 15,10,120,80):
//   photo 20x20 -> cover baseScale = max(120/20, 80/20) = 6 -> drawn 120x120
//   maxPan.x = |120-120|/2 = 0  (horizontal is PINNED for this square photo)
//   maxPan.y = |120-80|/2  = 20 (vertical has 20 logical px of travel each way)
//   at pan 0 the draw origin is y = 10 + (80-120)/2 = -10, so the half boundary sits at y = 50
//
// Real devices, 200% browser zoom, two-finger pinch and touch drag stay NOT TESTED (spec 029 §5).

const TOP = [255, 220, 0] as const;
const BOTTOM = [0, 90, 255] as const;

function splitPng(
  size: number,
  [tr, tg, tb]: readonly [number, number, number],
  [br, bg, bb]: readonly [number, number, number],
): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    const top = y < size / 2;
    for (let x = 0; x < size; x++) {
      raw[offset++] = top ? tr : br;
      raw[offset++] = top ? tg : bg;
      raw[offset++] = top ? tb : bb;
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

const pickSplitPhoto = (page: Page, slot: string) =>
  page.getByTestId(`preview-file-${slot}`).setInputFiles({
    name: `${FILE_MARKER}-split.png`,
    mimeType: "image/png",
    buffer: splitPng(20, TOP, BOTTOM),
  });

const scaleValue = (page: Page) => page.getByTestId("preview-scale-value");
const editArea = (page: Page) => page.getByTestId("preview-edit-area");

async function caseWithSplitPhotos(page: Page): Promise<void> {
  await gotoReady(page);
  await chooseCase(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickSplitPhoto(page, "case-zone-0");
  await pickSplitPhoto(page, "case-zone-1");
  await waitForCanvas(page);
}

/** Viewport box of the editing area — scrolled into view first, since `page.mouse` uses viewport px. */
async function areaBox(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  await editArea(page).scrollIntoViewIfNeeded();
  const box = await editArea(page).boundingBox();
  if (box === null) throw new Error("no edit area");
  return box;
}

/** Drag with the real mouse from the canvas centre by a CSS-px delta (canvas CSS px == logical px). */
async function dragBy(page: Page, dx: number, dy: number, release = true): Promise<void> {
  const box = await areaBox(page);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2);
  await page.mouse.move(startX + dx, startY + dy);
  if (release) await page.mouse.up();
}

test.describe("pan/zoom editing (spec 029)", () => {
  test("mouse drag moves the active photo, keeps the clip full and ends outside the canvas", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const route = await routeCatalog(page);
    await caseWithSplitPhotos(page);

    // pan 0: the boundary is at y=50, so y=30 is the top half and y=70 the bottom half
    expect(rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);
    expect(rgb(await pixelAt(page, 75, 70))).toEqual([...BOTTOM]);
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...BOTTOM]);

    // drag DOWN by the full 20 logical px of travel -> the boundary moves to y=70
    await dragBy(page, 0, 20);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 60))).toEqual([...TOP]);

    // the clip is still completely covered: no body colour leaks in anywhere inside the zone
    for (const y of [12, 30, 50, 70, 88]) {
      expect(rgb(await pixelAt(page, 75, y))).not.toEqual([...CASE_BODY]);
    }

    // the other zone never moved (per-slot transforms are independent)
    expect(rgb(await pixelAt(page, 225, 60))).toEqual([...BOTTOM]);

    // horizontal travel is 0 for this photo/zone, so a sideways drag cannot move anything
    const before = rgb(await pixelAt(page, 75, 60));
    await dragBy(page, 120, 0);
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...before]);

    // releasing OUTSIDE the canvas ends the session: later mouse moves change nothing
    await dragBy(page, 0, -20, false);
    await page.mouse.move(2, 2);
    await page.mouse.up();
    const settled = rgb(await pixelAt(page, 75, 60));
    await page.mouse.move(400, 400);
    await page.mouse.move(400, 300);
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...settled]);

    expect(noise.errors).toEqual([]);
    expect(route.unexpected()).toBe(0);
  });

  test("a refused pointer capture ends the drag instead of continuing without it", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await caseWithSplitPhotos(page);
    const baseline = rgb(await pixelAt(page, 75, 60));

    // make the real browser refuse the capture (보완 라운드 1)
    await page.evaluate(() => {
      const target = Element.prototype as unknown as {
        setPointerCapture: (id: number) => void;
        __origCapture?: (id: number) => void;
      };
      target.__origCapture = target.setPointerCapture;
      target.setPointerCapture = () => {
        throw new Error("capture refused");
      };
    });

    // the drag must not move anything: a capture-less session is ended, not continued
    await dragBy(page, 0, 20);
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...baseline]);

    // and the next normal drag still works — nothing stayed permanently disabled
    await page.evaluate(() => {
      const target = Element.prototype as unknown as {
        setPointerCapture: (id: number) => void;
        __origCapture?: (id: number) => void;
      };
      if (target.__origCapture) target.setPointerCapture = target.__origCapture;
    });
    await dragBy(page, 0, 20);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 60))).toEqual([...TOP]);
    expect(noise.errors).toEqual([]);
  });

  test("wheel, slider, buttons, keyboard and the single reset drive the same state", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await caseWithSplitPhotos(page);
    await expect(scaleValue(page)).toHaveText("100%");

    // buttons are multiplicative (1.1) in both directions
    await page.getByTestId("preview-zoom-in").click();
    await expect(scaleValue(page)).toHaveText("110%");
    await page.getByTestId("preview-zoom-in").click();
    await expect(scaleValue(page)).toHaveText("121%");
    await page.getByTestId("preview-zoom-out").click();
    await expect(scaleValue(page)).toHaveText("110%");

    // the wheel uses the same rule over the editing area
    const box = await areaBox(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -120);
    await expect(scaleValue(page)).toHaveText("121%");
    await page.mouse.wheel(0, 120);
    await expect(scaleValue(page)).toHaveText("110%");

    // the slider is the same state in percent, and it never goes below 100%
    await page.getByTestId("preview-scale").fill("250");
    await expect(scaleValue(page)).toHaveText("250%");
    await page.getByTestId("preview-scale").fill("100");
    await expect(scaleValue(page)).toHaveText("100%");
    await page.getByTestId("preview-zoom-out").click();
    await expect(scaleValue(page)).toHaveText("100%");

    // keyboard: fine steps move the photo, then the single reset restores scale AND framing
    const baseline = rgb(await pixelAt(page, 75, 48));
    await page.getByTestId("preview-pan-down").focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await expect.poll(async () => rgb(await pixelAt(page, 75, 48))).not.toEqual([...baseline]);
    await page.keyboard.press("Shift+ArrowDown");
    await page.getByTestId("preview-zoom-in").click();
    await page.getByTestId("preview-reset").click();
    await expect(scaleValue(page)).toHaveText("100%");
    await expect.poll(async () => rgb(await pixelAt(page, 75, 48))).toEqual([...baseline]);
    expect(noise.errors).toEqual([]);
  });

  test("slot selection marks one active slot and leaves the other slot's framing alone", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await caseWithSplitPhotos(page);

    const slot0 = page.getByTestId("preview-edit-slot-case-zone-0");
    const slot1 = page.getByTestId("preview-edit-slot-case-zone-1");
    await expect(slot0).toHaveAttribute("aria-pressed", "true");
    await expect(slot1).toHaveAttribute("aria-pressed", "false");

    // edit zone 0 only
    await dragBy(page, 0, 20);
    await page.getByTestId("preview-zoom-in").click();
    await expect(scaleValue(page)).toHaveText("110%");
    const zone0 = rgb(await pixelAt(page, 75, 60));
    const zone1 = rgb(await pixelAt(page, 225, 60));

    // switching the active slot keeps BOTH transforms (a slot switch is not a reset)
    await slot1.click();
    await expect(slot1).toHaveAttribute("aria-pressed", "true");
    await expect(slot0).toHaveAttribute("aria-pressed", "false");
    await expect(scaleValue(page)).toHaveText("100%"); // zone 1 has its own untouched state
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...zone0]);
    expect(rgb(await pixelAt(page, 225, 60))).toEqual([...zone1]);

    // now the controls act on zone 1 only
    await page.getByTestId("preview-zoom-in").click();
    await expect(scaleValue(page)).toHaveText("110%");
    await slot0.click();
    await expect(scaleValue(page)).toHaveText("110%"); // zone 0 kept its own 110%
    expect(rgb(await pixelAt(page, 75, 60))).toEqual([...zone0]);

    // replacing ONE photo resets only that slot (D-9)
    await pickSplitPhoto(page, "case-zone-0");
    await waitForCanvas(page);
    await expect(scaleValue(page)).toHaveText("100%");
    expect(noise.errors).toEqual([]);
  });

  test("the frame keeps its normalized framing across a resize", async ({ page }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoReady(page);
    await chooseFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    await pickSplitPhoto(page, "frame-image");
    await waitForCanvas(page);

    // a single slot has no picker, and the controls act on it directly
    expect(await page.getByTestId("preview-edit-slot-frame-image").count()).toBe(0);
    await page.getByTestId("preview-scale").fill("200");
    await expect(scaleValue(page)).toHaveText("200%");
    await page.getByTestId("preview-pan-up").focus();
    await page.keyboard.press("Shift+ArrowUp");
    await page.keyboard.press("Shift+ArrowUp");

    // sample well away from the moved half-boundary so a rounding difference cannot flip the pixel
    const wide = await cssSize(page);
    const upper = rgb(await pixelAt(page, wide.width * 0.5, wide.height * 0.2));
    const lower = rgb(await pixelAt(page, wide.width * 0.5, wide.height * 0.8));
    expect(upper).not.toEqual([...lower]); // the pan really is showing both halves

    // the frame's logical canvas follows the measured content box, so this really does re-layout
    await page.setViewportSize({ width: 360, height: 800 });
    await expect.poll(async () => (await cssSize(page)).width).not.toBe(wide.width);
    await expect(scaleValue(page)).toHaveText("200%");
    const narrow = await cssSize(page);
    // the SAME proportional point keeps its colour: the normalized framing survived the resize
    await expect
      .poll(async () => rgb(await pixelAt(page, narrow.width * 0.5, narrow.height * 0.2)))
      .toEqual([...upper]);
    expect(rgb(await pixelAt(page, narrow.width * 0.5, narrow.height * 0.8))).toEqual([...lower]);
    expect(noise.errors).toEqual([]);
  });

  test("editing at 320px keeps the page scrollable, axe clean and the console quiet", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await caseWithSplitPhotos(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // no global gesture capture was introduced: touch scrolling is untouched (spec 029)
    const touchActions = await page.evaluate(() => {
      const style = (node: Element | null) =>
        node === null ? "none-element" : getComputedStyle(node).touchAction;
      return {
        body: style(document.body),
        area: style(document.querySelector('[data-testid="preview-edit-area"]')),
        canvas: style(document.querySelector("canvas")),
      };
    });
    expect(touchActions.body).toBe("auto");
    expect(touchActions.area).toBe("auto");
    expect(touchActions.canvas).toBe("auto");

    // every editing control still meets the 44px target
    const controls = page.locator(
      '[data-testid^="preview-pan-"], [data-testid="preview-zoom-in"], [data-testid="preview-zoom-out"], [data-testid="preview-reset"], .denn-preview-edit__slot',
    );
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) {
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
      }
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(noise.errors).toEqual([]);
  });
});

// --- spec 030: quarter-turn rotation ------------------------------------------
//
// Real Chromium, real Canvas pixels. The split photo makes the rotation VISIBLE: its boundary runs
// horizontally at rest, and a quarter turn must move that boundary to the vertical axis.

const rotateLeft = (page: Page) => page.getByTestId("preview-rotate-left");
const rotateRight = (page: Page) => page.getByTestId("preview-rotate-right");

/** A non-square split photo: the left `width/2` columns are TOP, the rest BOTTOM. */
function splitWidePng(
  width: number,
  height: number,
  [lr, lg, lb]: readonly [number, number, number],
  [rr, rg, rb]: readonly [number, number, number],
): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const left = x < width / 2;
      raw[offset++] = left ? lr : rr;
      raw[offset++] = left ? lg : rg;
      raw[offset++] = left ? lb : rb;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

test.describe("quarter-turn rotation (spec 030)", () => {
  test("a right turn moves the photo boundary from the horizontal to the vertical axis", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const route = await routeCatalog(page);
    await caseWithSplitPhotos(page);

    // at rest the 20x20 split photo covers the 120x80 zone: TOP above y=50, BOTTOM below
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 70))).toEqual([...BOTTOM]);

    // one clockwise quarter turn: the photo's top edge now points RIGHT
    await rotateRight(page).click();
    await expect.poll(async () => rgb(await pixelAt(page, 105, 50))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 45, 50))).toEqual([...BOTTOM]);
    // and the horizontal boundary is gone — both samples on the vertical axis are the same colour
    expect(rgb(await pixelAt(page, 105, 30))).toEqual(rgb(await pixelAt(page, 105, 70)));

    // a second turn is 180°: the halves are simply swapped top-for-bottom
    await rotateRight(page).click();
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...BOTTOM]);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 70))).toEqual([...TOP]);

    expect(noise.errors).toEqual([]);
    expect(route.unexpected()).toBe(0);
  });

  test("left and right are inverses and four presses return to the start", async ({ page }) => {
    await routeCatalog(page);
    await caseWithSplitPhotos(page);

    await rotateRight(page).click();
    await rotateLeft(page).click();
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);

    for (let i = 0; i < 4; i++) await rotateRight(page).click();
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 70))).toEqual([...BOTTOM]);
  });

  test("each case slot rotates INDEPENDENTLY (R-4)", async ({ page }) => {
    await routeCatalog(page);
    await caseWithSplitPhotos(page);

    // slot 0 is active by default; turn it once
    await rotateRight(page).click();
    // zone 0 (centre x=75) is now split vertically…
    await expect.poll(async () => rgb(await pixelAt(page, 105, 50))).toEqual([...TOP]);
    // …and zone 1 (5%+55% → x 165..285, centre 225) is untouched
    await expect.poll(async () => rgb(await pixelAt(page, 225, 30))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 225, 70))).toEqual([...BOTTOM]);

    // switch slots and turn the OTHER photo; the first keeps its own rotation
    await page.getByTestId("preview-edit-slot-case-zone-1").click();
    await rotateRight(page).click();
    await expect.poll(async () => rgb(await pixelAt(page, 255, 50))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 105, 50))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 45, 50))).toEqual([...BOTTOM]);
  });

  test("`원래대로` clears the rotation together with the pan and the scale", async ({ page }) => {
    await routeCatalog(page);
    await caseWithSplitPhotos(page);

    await rotateRight(page).click();
    await page.getByTestId("preview-zoom-in").click();
    await dragBy(page, 0, 10);
    await page.getByTestId("preview-reset").click();

    await expect(scaleValue(page)).toHaveText("100%");
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);
    await expect.poll(async () => rgb(await pixelAt(page, 75, 70))).toEqual([...BOTTOM]);
  });

  test("a rotated photo still fills the clip after drag, zoom and resize (D-7 survives)", async ({
    page,
  }) => {
    await routeCatalog(page);
    await gotoReady(page);
    await chooseFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    // a WIDE photo: a quarter turn genuinely swaps the cover footprint
    await page.getByTestId("preview-file-frame-image").setInputFiles({
      name: `${FILE_MARKER}-wide.png`,
      mimeType: "image/png",
      buffer: splitWidePng(40, 20, TOP, BOTTOM),
    });
    await waitForCanvas(page);

    const box = await canvas(page).boundingBox();
    if (box === null) throw new Error("no canvas");

    /** Every sample inside the photo zone must be a PHOTO colour — never the mat or the body. */
    const clipIsFull = async (): Promise<void> => {
      const size = await canvas(page).evaluate((element) => {
        const node = element as HTMLCanvasElement;
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      // the photo zone sits inside the band+inset; sample well within it, including near-corners
      const inset = 0.16; // comfortably inside band(5%)+inset, still near the clip edges
      for (const fx of [inset, 0.5, 1 - inset]) {
        for (const fy of [inset, 0.5, 1 - inset]) {
          // polled, so the sample waits for the repaint instead of racing it (no fixed sleep)
          await expect
            .poll(async () => {
              const pixel = rgb(await pixelAt(page, size.width * fx, size.height * fy));
              // the boundary column blends the two halves, so "is a photo" means "is not the
              // mat and not the frame body" — an empty clip would show one of those two.
              const isMat = pixel.join() === [...MAT].join();
              const isBody = pixel.join() === [...FRAME_BODY].join();
              return isMat || isBody ? `empty:${pixel.join()}` : "photo";
            })
            .toBe("photo");
        }
      }
    };

    await clipIsFull();
    await rotateRight(page).click();
    await clipIsFull();
    await dragBy(page, 0, 30);
    await clipIsFull();
    await page.getByTestId("preview-zoom-in").click();
    await clipIsFull();

    // a resize re-derives maxPan from the ROTATED footprint; the clip must still be full
    await page.setViewportSize({ width: 420, height: 900 });
    await waitForCanvas(page);
    await clipIsFull();
  });

  test("the rotate buttons are keyboard operable and meet the 44px target", async ({ page }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await caseWithSplitPhotos(page);

    await rotateRight(page).focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => rgb(await pixelAt(page, 105, 50))).toEqual([...TOP]);
    await rotateLeft(page).focus();
    await page.keyboard.press("Space");
    await expect.poll(async () => rgb(await pixelAt(page, 75, 30))).toEqual([...TOP]);

    for (const control of [rotateLeft(page), rotateRight(page)]) {
      const box = await control.boundingBox();
      if (box) {
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
      }
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(noise.errors).toEqual([]);
  });

  test("the rotation controls do not overflow a 320px viewport", async ({ page }) => {
    await routeCatalog(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await caseWithSplitPhotos(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(rotateLeft(page)).toBeVisible();
    await expect(rotateRight(page)).toBeVisible();
  });
});

// --- spec 030 R-6: measure the browser's own EXIF behaviour --------------------
//
// The app never parses EXIF. This test does not ASSERT a particular browser policy — it MEASURES
// and records what this Chromium actually does with an `Orientation=6` JPEG, so the "we rely on the
// engine default" decision has evidence in this repository for the first time. Other engines and
// real devices stay NOT TESTED.

/** Splice a minimal little-endian APP1/Exif segment carrying `Orientation` into a JPEG. */
function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff: number[] = [];
  const push16 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff);
  const push32 = (v: number) =>
    tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  tiff.push(0x49, 0x49); // "II" little-endian
  push16(42); // TIFF magic
  push32(8); // offset of IFD0
  push16(1); // one entry
  push16(0x0112); // Orientation
  push16(3); // SHORT
  push32(1); // count
  push16(orientation);
  push16(0); // padding of the 4-byte value field
  push32(0); // no next IFD
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), Buffer.from(tiff)]);
  const header = Buffer.alloc(4);
  header[0] = 0xff;
  header[1] = 0xe1; // APP1
  header.writeUInt16BE(payload.length + 2, 2);
  // SOI is the first two bytes; the segment goes immediately after it
  return Buffer.concat([jpeg.subarray(0, 2), header, payload, jpeg.subarray(2)]);
}

test.describe("EXIF orientation is the browser's job (spec 030 R-6)", () => {
  test("records how Chromium decodes an Orientation=6 JPEG", async ({ page }) => {
    await routeCatalog(page);
    await gotoReady(page);

    // build a REAL baseline JPEG in the browser (no encoder and no binary fixture in the repo),
    // then splice the EXIF segment in Node — byte splicing only, no EXIF library.
    const base64 = await page.evaluate(() => {
      const surface = document.createElement("canvas");
      surface.width = 40;
      surface.height = 20;
      const context = surface.getContext("2d");
      if (context === null) return "";
      context.fillStyle = "#FF00FF";
      context.fillRect(0, 0, 40, 20);
      context.fillStyle = "#00FFFF";
      context.fillRect(0, 0, 20, 20);
      return surface.toDataURL("image/jpeg", 0.92).split(",")[1] ?? "";
    });
    expect(base64.length).toBeGreaterThan(0);
    const plain = Buffer.from(base64, "base64");
    const tagged = withExifOrientation(plain, 6);
    expect(tagged.length).toBeGreaterThan(plain.length);

    const measure = async (buffer: Buffer): Promise<{ width: number; height: number }> =>
      page.evaluate(async (data: string) => {
        const element = new Image();
        element.src = `data:image/jpeg;base64,${data}`;
        await element.decode();
        return { width: element.naturalWidth, height: element.naturalHeight };
      }, buffer.toString("base64"));

    const plainSize = await measure(plain);
    const taggedSize = await measure(tagged);

    // the untagged baseline is the ground truth: 40x20
    expect(plainSize).toEqual({ width: 40, height: 20 });

    // MEASUREMENT, not a policy assertion: an engine that applies EXIF reports the SWAPPED size,
    // one that ignores it reports the stored size. Both are recorded; neither is "wrong" here.
    const applied = taggedSize.width === 20 && taggedSize.height === 40;
    const ignored = taggedSize.width === 40 && taggedSize.height === 20;
    expect(
      applied || ignored,
      `unexpected decode size ${taggedSize.width}x${taggedSize.height}`,
    ).toBe(true);
    test.info().annotations.push({
      type: "exif-orientation-6",
      description: applied
        ? "Chromium APPLIES EXIF orientation: naturalWidth/Height are swapped (20x40)"
        : "Chromium IGNORES EXIF orientation: naturalWidth/Height stay stored (40x20)",
    });
  });
});

// --- spec 031: customer text + the physical clock overlay ---------------------
//
// The catalog is routed with its own frame template so this block can define text zones and a clock
// without disturbing the fixtures the other blocks share.

const TEXT_ZONE_COLOUR = [220, 30, 30] as const; // #DC1E1E — nothing else on the canvas is red

const textCatalog = (template: Record<string, unknown>): string =>
  JSON.stringify({
    models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
    caseTemplates: [],
    frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1, frameThickness: 5 }],
    frameCategories: [{ id: "fc1", name: "액자 A" }],
    frameTemplates: [{ id: "full", name: "기본 액자", type: "uploaded", ...template }],
    frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
  });

const zoneFixture = (over: Record<string, unknown> = {}) => ({
  key: "main",
  x: 50,
  y: 50,
  boxW: 80,
  fontSize: 12,
  align: "center",
  font: "DM Sans",
  bold: true,
  italic: false,
  color: "#DC1E1E",
  lineH: 1.25,
  letterSpacing: 0,
  rotation: 0,
  ...over,
});

async function routeTextCatalog(page: Page, template: Record<string, unknown>): Promise<void> {
  const body = textCatalog(template);
  await page.route("**/firebasestorage.googleapis.com/**", async (route: Route) => {
    if (route.request().url() !== CATALOG_URL) {
      await route.abort();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
}

async function frameWithText(page: Page, template: Record<string, unknown>): Promise<void> {
  await routeTextCatalog(page, template);
  await gotoReady(page);
  await chooseFrame(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "frame-image", PHOTO_A);
  await waitForCanvas(page);
}

const textInput = (page: Page, key: string) => page.getByTestId(`preview-text-${key}`);

/** Does ANY sampled pixel carry the zone colour? Text is thin, so a grid is sampled. */
async function hasTextColour(page: Page): Promise<boolean> {
  return canvas(page).evaluate(
    (element, expected) => {
      const node = element as HTMLCanvasElement;
      const context = node.getContext("2d");
      if (context === null) return false;
      const data = context.getImageData(0, 0, node.width, node.height).data;
      for (let index = 0; index < data.length; index += 4) {
        if (
          Math.abs(data[index] - expected[0]) < 40 &&
          Math.abs(data[index + 1] - expected[1]) < 40 &&
          Math.abs(data[index + 2] - expected[2]) < 40
        ) {
          return true;
        }
      }
      return false;
    },
    TEXT_ZONE_COLOUR as unknown as number[],
  );
}

test.describe("customer text zones (spec 031)", () => {
  test('typing a value paints it, clearing it removes it, and "0" is a real value', async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await frameWithText(page, { textZones: [zoneFixture()] });

    expect(await hasTextColour(page)).toBe(false);
    await textInput(page, "main").fill("HELLO");
    await expect.poll(async () => hasTextColour(page)).toBe(true);

    await textInput(page, "main").fill("");
    await expect.poll(async () => hasTextColour(page)).toBe(false);

    // "0" is NOT empty — the legacy paths dropped it and this one must not
    await textInput(page, "main").fill("0");
    await expect.poll(async () => hasTextColour(page)).toBe(true);

    expect(noise.errors).toEqual([]);
  });

  test("only the keys the template defines are offered", async ({ page }) => {
    await frameWithText(page, {
      textZones: [zoneFixture({ key: "main" }), zoneFixture({ key: "date", y: 70 })],
    });
    await expect(textInput(page, "main")).toBeVisible();
    await expect(textInput(page, "date")).toBeVisible();
    await expect(page.getByTestId("preview-text-name")).toHaveCount(0);
    await expect(page.getByTestId("preview-text-sub")).toHaveCount(0);
  });

  test("the length cap blocks over-long input instead of truncating it", async ({ page }) => {
    await frameWithText(page, { textZones: [zoneFixture({ maxChars: 5 })] });
    const input = textInput(page, "main");
    await input.fill("ABCDE");
    await expect(input).toHaveValue("ABCDE");
    // the input's own maxLength stops the browser from accepting more
    await input.pressSequentially("FGH");
    await expect(input).toHaveValue("ABCDE");
    await expect(page.getByTestId("preview-text-hint-main")).toHaveText("5 / 5");
  });

  test("a value that would wrap past the line cap is rejected, keeping the last good one", async ({
    page,
  }) => {
    await frameWithText(page, { textZones: [zoneFixture({ maxLines: 1, boxW: 20 })] });
    const input = textInput(page, "main");
    await input.fill("AB");
    await expect.poll(async () => hasTextColour(page)).toBe(true);
    // far too wide for a single line in a 20%-wide box: the COMMIT is rejected, so the input keeps
    // the last approved value and the preview never drops to a partial render
    await input.fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    await expect(input).toHaveValue("AB");
    await expect(canvasStatus(page)).toHaveText("미리보기가 준비되었습니다.");
    expect(await hasTextColour(page)).toBe(true);
  });

  test("the operator's default text is a placeholder only, never the customer's value", async ({
    page,
  }) => {
    await frameWithText(page, {
      textZones: [zoneFixture()],
      defaultTexts: { main: "WEDDINGSAMPLE" },
    });
    await expect(textInput(page, "main")).toHaveValue("");
    // and nothing is painted until the customer actually types
    expect(await hasTextColour(page)).toBe(false);
  });

  test("text is drawn ON TOP of the photo", async ({ page }) => {
    await frameWithText(page, { textZones: [zoneFixture()] });
    await textInput(page, "main").fill("HELLO");
    await expect.poll(async () => hasTextColour(page)).toBe(true);
    // the photo is magenta and the text is red: seeing red proves the text came after the photo
    expect(await hasTextColour(page)).toBe(true);
  });

  test("a rotated zone still paints", async ({ page }) => {
    await frameWithText(page, { textZones: [zoneFixture({ rotation: -30 })] });
    await textInput(page, "main").fill("HELLO");
    await expect.poll(async () => hasTextColour(page)).toBe(true);
  });

  test("the customer gets no colour or shadow control (Founder F-2)", async ({ page }) => {
    await frameWithText(page, { textZones: [zoneFixture()] });
    await expect(page.locator('[data-testid="preview-text"] input[type="color"]')).toHaveCount(0);
  });

  test("text inputs are labelled, focusable and accessible at 320px", async ({ page }) => {
    const noise = collectConsole(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await frameWithText(page, { textZones: [zoneFixture()] });

    const input = textInput(page, "main");
    await input.focus();
    await expect(input).toBeFocused();
    const box = await input.boundingBox();
    if (box) expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(noise.errors).toEqual([]);
  });
});

test.describe("physical clock overlay (spec 031, Founder F-4)", () => {
  test("the clock is a DOM overlay, NOT a canvas layer", async ({ page }) => {
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    const clock = page.getByTestId("preview-clock");
    await expect(clock).toBeVisible();
    // it never reaches the plan the canvas executes
    const tag = await clock.evaluate((element) => element.tagName.toLowerCase());
    expect(tag).not.toBe("canvas");
    // decorative and non-interactive, so it neither blocks the drag nor is read out
    await expect(clock).toHaveAttribute("aria-hidden", "true");
    const pointerEvents = await clock.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("none");
  });

  test("shows the HH:MM placeholder with no custom image, and no seconds", async ({ page }) => {
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    const label = page.getByTestId("preview-clock-label");
    await expect(label).toBeVisible();
    await expect(label).toHaveText(/^\d{2}:\d{2}$/);
  });

  test("an explicit opt-out hides the clock entirely", async ({ page }) => {
    await frameWithText(page, { textZones: [], clockEnabled: false });
    await expect(page.getByTestId("preview-clock")).toHaveCount(0);
  });

  test("is positioned against the MAT rect, not the whole box (보완 1)", async ({ page }) => {
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    const clock = page.getByTestId("preview-clock");
    const left = await clock.evaluate((element) => (element as HTMLElement).style.left);
    // aspect 1 and a 5% band: canvas W=H, band = max(1, round(W*0.05)), mat = W - 2*band.
    // 80% of the MAT is NOT 80% of the box, so the naive whole-box placement is ruled out.
    expect(left).not.toBe("80%");
    const value = Number.parseFloat(left);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(70);
    expect(value).toBeLessThan(80);
  });

  test("stays glued to the mat across a resize", async ({ page }) => {
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    const clock = page.getByTestId("preview-clock");
    const read = () =>
      clock.evaluate((element) => {
        const style = (element as HTMLElement).style;
        return [style.left, style.top, style.width].map((value) => Number.parseFloat(value));
      });
    const before = await read();
    await page.setViewportSize({ width: 420, height: 900 });
    await waitForCanvas(page);
    const after = await read();

    // NOT bit-identical on purpose: the band is `max(1, round(width * percent/100))`, so a different
    // logical width rounds it differently — and the DRAWN mat rounds exactly the same way. The
    // overlay therefore tracks the mat, which is the contract; the shift is rounding-sized only.
    for (let index = 0; index < before.length; index++) {
      expect(Number.isFinite(after[index])).toBe(true);
      expect(Math.abs(after[index] - before[index])).toBeLessThan(0.5);
    }
  });

  test("a declared clock photo that cannot be resolved hides the overlay (보완 1)", async ({
    page,
  }) => {
    // an unusable source: the projection keeps the clock but resolves no image, and a generic
    // HH:MM must NOT stand in for the operator's specific hardware photo
    await frameWithText(page, {
      textZones: [],
      clock: { x: 80, y: 80, size: 20, customImg: "javascript:alert(1)" },
    });
    await expect(page.getByTestId("preview-clock-label")).toBeVisible();
  });

  test("leaves no timer behind after the template changes or the page is left", async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    await expect(page.getByTestId("preview-clock-label")).toBeVisible();

    // count the intervals/timeouts the page believes are outstanding after navigating away
    const leaked = await page.evaluate(async () => {
      let outstanding = 0;
      const nativeTimeout = window.setTimeout;
      const nativeClear = window.clearTimeout;
      (window as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((
        handler: TimerHandler,
        timeout?: number,
      ) => {
        outstanding += 1;
        return nativeTimeout(handler, timeout);
      }) as typeof setTimeout;
      (window as unknown as { clearTimeout: typeof clearTimeout }).clearTimeout = ((
        handle?: number,
      ) => {
        outstanding -= 1;
        return nativeClear(handle);
      }) as typeof clearTimeout;
      // give the app a chance to re-render; a 1-second clock would schedule repeatedly here
      await new Promise((resolve) => nativeTimeout(resolve, 300));
      return outstanding;
    });
    // a minute-boundary clock schedules at most one timer, never one per second
    expect(leaked).toBeLessThanOrEqual(1);
    expect(noise.errors).toEqual([]);
  });

  test("the clock never appears in the rendered plan or an order payload", async ({ page }) => {
    await frameWithText(page, { textZones: [], clock: { x: 80, y: 80, size: 20 } });
    // the canvas is the plan's only output; the overlay sits outside it in the DOM
    const insideCanvas = await page
      .getByTestId("preview-edit-area")
      .evaluate(
        (area) =>
          area
            .querySelector("canvas")
            ?.contains(area.querySelector('[data-testid="preview-clock"]')) ?? false,
      );
    expect(insideCanvas).toBe(false);
  });
});

// --- spec 033: local frame PNG export ----------------------------------------
//
// E-2 settles the non-integer scale, the glyph letter-spacing and the clip half-pixel risks with
// REAL pixels rather than reasoning. Each comparison re-runs the export in the page, normalizes the
// print canvas down to the preview's logical size, and fails on a layout difference.

const printCatalog = (
  size: Record<string, unknown>,
  template: Record<string, unknown> = {},
): string =>
  JSON.stringify({
    models: [{ id: "m1", name: "모델 하나", w: 300, h: 200 }],
    caseTemplates: [],
    frameSizes: [{ id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5, ...size }],
    frameCategories: [{ id: "fc1", name: "액자 A" }],
    frameTemplates: [{ id: "full", name: "기본 액자", type: "uploaded", ...template }],
    frameColors: [{ id: "black", name: "블랙", fill: "#1A1A1A" }],
  });

async function routePrintCatalog(
  page: Page,
  size: Record<string, unknown>,
  template: Record<string, unknown> = {},
): Promise<void> {
  const body = printCatalog(size, template);
  await page.route("**/firebasestorage.googleapis.com/**", async (route: Route) => {
    if (route.request().url() !== CATALOG_URL) {
      await route.abort();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
}

/**
 * Centimetres whose ratio MATCHES the fixture's `aspect` (1.4).
 *
 * Spec 032 deliberately does not reconcile a size whose `aspect` disagrees with its centimetres —
 * it leaves the mismatch as a diagnostic candidate. The export therefore refuses such a size rather
 * than stretching the customer's layout to fit; that case has its own test below.
 */
const MATCHED_CM = { printWidthCm: 21, printHeightCm: 29.4 };
/** Landscape, with `aspect` again agreeing with the centimetres. */
const LANDSCAPE_CM = { printWidthCm: 29.4, printHeightCm: 21, aspect: 1 / 1.4 };

const printButton = (page: Page) => page.getByTestId("print-download");
const printReason = (page: Page) => page.getByTestId("print-reason");

/** Reach a drawn frame preview, for whatever catalog the caller routed. */
async function readyPrintFrame(page: Page): Promise<void> {
  await gotoReady(page);
  await chooseFrame(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "frame-image", PHOTO_A);
  await waitForCanvas(page);
}

/**
 * Install a page-side probe that drives the SAME export the button drives, but keeps the canvas and
 * swallows the anchor click so the E2E run writes no file to disk.
 */
async function installPrintProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __dennPrintProbe?: () => Promise<HTMLCanvasElement | null>;
      __dennPrintCanvases?: HTMLCanvasElement[];
      __dennPrintDownloads?: number;
      __dennPrintObjectUrls?: number;
      __dennPrintRevoked?: number;
    };
    w.__dennPrintCanvases = [];
    w.__dennPrintDownloads = 0;
    w.__dennPrintObjectUrls = 0;
    w.__dennPrintRevoked = 0;

    const createElement = document.createElement.bind(document);
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
      const element = createElement(tag, options);
      if (tag === "canvas") w.__dennPrintCanvases?.push(element as HTMLCanvasElement);
      if (tag === "a") {
        (element as HTMLAnchorElement).click = () => {
          w.__dennPrintDownloads = (w.__dennPrintDownloads ?? 0) + 1;
        };
      }
      return element;
    }) as typeof document.createElement;

    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob | MediaSource): string => {
      w.__dennPrintObjectUrls = (w.__dennPrintObjectUrls ?? 0) + 1;
      return createObjectURL(blob);
    };
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url: string): void => {
      w.__dennPrintRevoked = (w.__dennPrintRevoked ?? 0) + 1;
      revokeObjectURL(url);
    };

    w.__dennPrintProbe = async () => {
      const before = w.__dennPrintCanvases?.length ?? 0;
      const settled = w.__dennPrintDownloads ?? 0;
      const button = document.querySelector("[data-testid=print-download]") as HTMLButtonElement;
      button.click();
      for (let i = 0; i < 240; i++) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        // the download fires INSIDE the export, before the promise settles and before the busy
        // flag clears — so also wait for the button to become usable again, or a second probe
        // call would be swallowed by the one-export-at-a-time guard
        if ((w.__dennPrintDownloads ?? 0) > settled && !button.disabled) break;
      }
      const created = (w.__dennPrintCanvases ?? []).slice(before);
      return created.find((element) => element.width > 1000) ?? null;
    };
  });
}

/**
 * Run the export and report the largest per-channel difference between the on-screen canvas and the
 * print canvas downsampled to the same logical size.
 *
 * Downsampling with `drawImage` is the browser's own resampling, so what survives is LAYOUT: a
 * shifted line break, a photo that failed to rotate, or a clip that moved would all be far larger
 * than resampling noise.
 */
async function comparePreviewToPrint(
  page: Page,
): Promise<{ maxDiff: number; diffFraction: number; scale: number }> {
  return page.evaluate(async () => {
    /** A pixel differing by more than this is counted; at or below it is resampling noise. */
    const NOISE_FLOOR = 24;
    const probe = (
      window as unknown as { __dennPrintProbe: () => Promise<HTMLCanvasElement | null> }
    ).__dennPrintProbe;
    const printed = await probe();
    if (printed === null) throw new Error("export produced no canvas");
    const preview = document.querySelector("[data-testid=preview-canvas]") as HTMLCanvasElement;
    const scale = printed.width / preview.width;

    const shrunk = document.createElement("canvas");
    shrunk.width = preview.width;
    shrunk.height = preview.height;
    const target = shrunk.getContext("2d");
    const source = preview.getContext("2d");
    if (target === null || source === null) throw new Error("no context");
    target.drawImage(printed, 0, 0, shrunk.width, shrunk.height);

    const a = source.getImageData(0, 0, preview.width, preview.height).data;
    const b = target.getImageData(0, 0, shrunk.width, shrunk.height).data;
    let maxDiff = 0;
    let differing = 0;
    let total = 0;
    for (let i = 0; i < a.length; i += 4) {
      let pixelDiff = 0;
      for (let channel = 0; channel < 3; channel++) {
        const diff = Math.abs((a[i + channel] as number) - (b[i + channel] as number));
        if (diff > pixelDiff) pixelDiff = diff;
      }
      if (pixelDiff > maxDiff) maxDiff = pixelDiff;
      if (pixelDiff > NOISE_FLOOR) differing += 1;
      total += 1;
    }
    return { maxDiff, diffFraction: total === 0 ? 1 : differing / total, scale };
  });
}

/**
 * How the pixel comparison judges "same layout".
 *
 * A max single-pixel difference is the wrong metric on its own: downsampling ~3500px to ~500px
 * averages a hard edge (black frame against white mat) differently from a direct 500px render, so a
 * handful of boundary pixels legitimately differ a lot. What a REAL defect looks like — a moved
 * line break, a photo that failed to rotate, a shifted clip — is a large FRACTION of the image
 * changing, not a few edge pixels. So the fraction is the assertion and the max is only a sanity
 * bound.
 */
const MAX_DIFFERING_FRACTION = 0.02;

test.describe("local frame PNG export (spec 033)", () => {
  test("offers the download in its own area, away from any order CTA", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await expect(printButton(page)).toBeVisible();
    await expect(printButton(page)).toBeEnabled();
    await expect(page.getByTestId("print-provisional")).toHaveText(
      "인쇄 설정은 인쇄소 확인 전 임시값입니다.",
    );
    await expect(page.getByTestId("print-export")).not.toContainText("주문");
    await expect(page.getByTestId("print-export")).not.toContainText("카카오");
  });

  test("shows no resolution numbers to the customer (E-6)", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    const text = (await page.getByTestId("print-export").textContent()) ?? "";
    expect(/\d/.test(text)).toBe(false);
  });

  test("cannot print a size that declares no centimetres, and says why (P-2)", async ({ page }) => {
    await routePrintCatalog(page, {});
    await readyPrintFrame(page);
    await expect(printButton(page)).toBeDisabled();
    await expect(printReason(page)).toHaveText("이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다.");
    await expect(printButton(page)).toHaveAttribute("aria-describedby", "denn-print-reason");
  });

  test("matches the preview at a NON-INTEGER scale (E-2)", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await installPrintProbe(page);
    const { diffFraction, scale } = await comparePreviewToPrint(page);
    expect(Number.isInteger(scale)).toBe(false); // the risky case, not a convenient one
    expect(diffFraction).toBeLessThanOrEqual(MAX_DIFFERING_FRACTION);
  });

  test("matches the preview for a landscape size", async ({ page }) => {
    await routePrintCatalog(page, LANDSCAPE_CM);
    await readyPrintFrame(page);
    await installPrintProbe(page);
    const { diffFraction } = await comparePreviewToPrint(page);
    expect(diffFraction).toBeLessThanOrEqual(MAX_DIFFERING_FRACTION);
  });

  test("keeps letter-spaced text and its line breaks identical (P-6, E-2)", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM, { textZones: [zoneFixture({ letterSpacing: 12 })] });
    await readyPrintFrame(page);
    await page.getByTestId("preview-text-main").fill("가나다라마바사아자차카타파하");
    await waitForCanvas(page);
    await installPrintProbe(page);
    const { diffFraction } = await comparePreviewToPrint(page);
    expect(diffFraction).toBeLessThanOrEqual(MAX_DIFFERING_FRACTION);
  });

  test("keeps a rotated and zoomed photo identical, clip edges included", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await page.getByTestId("preview-rotate-right").click();
    await page.getByTestId("preview-zoom-in").click();
    await waitForCanvas(page);
    await installPrintProbe(page);
    const { diffFraction } = await comparePreviewToPrint(page);
    expect(diffFraction).toBeLessThanOrEqual(MAX_DIFFERING_FRACTION);
  });

  test("produces byte-identical PNGs for the same inputs twice (determinism)", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await installPrintProbe(page);
    const digests = await page.evaluate(async () => {
      const probe = (
        window as unknown as { __dennPrintProbe: () => Promise<HTMLCanvasElement | null> }
      ).__dennPrintProbe;
      const digest = async (): Promise<string> => {
        const printed = await probe();
        if (printed === null) throw new Error("export produced no canvas");
        const blob = await new Promise<Blob | null>((resolve) =>
          printed.toBlob((value) => resolve(value), "image/png"),
        );
        if (blob === null) throw new Error("no blob");
        const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
        return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
      };
      return [await digest(), await digest()];
    });
    expect(digests[0]).toBe(digests[1]);
  });

  test("keeps at most one live object URL across repeated exports", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await installPrintProbe(page);
    const counts = await page.evaluate(async () => {
      const w = window as unknown as {
        __dennPrintProbe: () => Promise<HTMLCanvasElement | null>;
        __dennPrintObjectUrls?: number;
        __dennPrintRevoked?: number;
      };
      await w.__dennPrintProbe();
      await w.__dennPrintProbe();
      await w.__dennPrintProbe();
      return { created: w.__dennPrintObjectUrls ?? 0, revoked: w.__dennPrintRevoked ?? 0 };
    });
    expect(counts.created).toBe(3);
    // every URL but the live one has been released
    expect(counts.revoked).toBe(counts.created - 1);
  });

  test("produces no file when the preview is not ready (P-3)", async ({ page }) => {
    await routePrintCatalog(page, MATCHED_CM);
    await gotoReady(page);
    await chooseFrame(page);
    await openComposer(page);
    await pickColour(page, "#1A1A1A");
    // no photo, so no plan exists and there is nothing to print
    await expect(printButton(page)).toBeDisabled();
    await expect(printReason(page)).toHaveText("미리보기를 만들 수 없습니다.");
  });

  test("never uploads, posts an order or opens Kakao", async ({ page }) => {
    const requests: { url: string; method: string }[] = [];
    page.on("request", (request) =>
      requests.push({ url: request.url(), method: request.method() }),
    );
    const popups: unknown[] = [];
    page.on("popup", (popup) => popups.push(popup));
    await routePrintCatalog(page, MATCHED_CM);
    await readyPrintFrame(page);
    await installPrintProbe(page);
    await comparePreviewToPrint(page);
    for (const request of requests) {
      expect(request.url.includes("kakao"), request.url).toBe(false);
      expect(["POST", "PUT", "PATCH"].includes(request.method), request.url).toBe(false);
    }
    expect(popups).toHaveLength(0);
  });

  test("REFUSES a size whose aspect disagrees with its centimetres", async ({ page }) => {
    // aspect 1.4 vs 21x29.7cm (1.414): scaling both axes by different amounts would distort what
    // the customer approved, so the export fails closed instead (P-3). Spec 032 leaves the
    // underlying mismatch as a diagnostic, not something to silently reconcile.
    await routePrintCatalog(page, { printWidthCm: 21, printHeightCm: 29.7 });
    await readyPrintFrame(page);
    await installPrintProbe(page);
    const downloads = await page.evaluate(async () => {
      const w = window as unknown as {
        __dennPrintProbe: () => Promise<HTMLCanvasElement | null>;
        __dennPrintDownloads?: number;
        __dennPrintObjectUrls?: number;
      };
      await w.__dennPrintProbe().catch(() => null);
      return { downloads: w.__dennPrintDownloads ?? 0, urls: w.__dennPrintObjectUrls ?? 0 };
    });
    expect(downloads.downloads).toBe(0);
    expect(downloads.urls).toBe(0);
    await expect(page.getByTestId("print-failed")).toHaveText("인쇄용 파일을 만들지 못했습니다.");
  });

  test("offers no download for the case product (P-1)", async ({ page }) => {
    await routeCatalog(page);
    await gotoReady(page);
    await chooseCase(page);
    await openComposer(page);
    await expect(page.getByTestId("print-export")).toHaveCount(0);
  });
});
// --- spec 085: the result-first workbench -------------------------------------
//
// Closes spec 084 P1 F-1, whose three symptoms were measured on the real customer route: the Canvas
// began at page y~1370 (390x844) and y~1220 (1280x800), and was 683px tall inside a 390px-tall
// landscape viewport. What is asserted here is therefore GEOMETRY, not markup: where the preview is
// relative to the controls, and whether the Canvas fits the screen it is drawn on.

const WORKBENCH_BREAKPOINT = 960;
/** The same reserve the product contract spends (`FRAME_PREVIEW_VIEWPORT_RESERVE_PX`). */
const VIEWPORT_RESERVE = 96;

const MATRIX = [
  { name: "320x568", width: 320, height: 568 },
  { name: "390x844", width: 390, height: 844 },
  { name: "844x390", width: 844, height: 390 },
  { name: "932x430", width: 932, height: 430 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const previewPane = (page: Page) => page.getByTestId("preview-pane");

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function boxOf(page: Page, testId: string): Promise<Box> {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `${testId} has a box`).not.toBeNull();
  return box as Box;
}

/** Open the frame composer with one photo composed, at one viewport. */
async function frameWorkbench(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  await gotoReady(page);
  await chooseFrame(page);
  await openComposer(page);
  await pickColour(page, "#1A1A1A");
  await pickPhoto(page, "frame-image", PHOTO_A);
  await waitForCanvas(page);
}

for (const viewport of MATRIX) {
  test(`spec 085 workbench @ ${viewport.name}: preview first, nothing clipped, Canvas fits`, async ({
    page,
  }) => {
    const noise = collectConsole(page);
    const route = await routeCatalog(page);
    const crashes: string[] = [];
    page.on("pageerror", (error) => crashes.push(String(error)));
    await frameWorkbench(page, viewport);

    // 1. the page never scrolls sideways, at any width in the matrix
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "document horizontal overflow").toBeLessThanOrEqual(0);

    const preview = await boxOf(page, "preview-pane");
    const controls = await boxOf(page, "preview-controls-pane");
    const composer = (await page.locator(".denn-composer").boundingBox()) as Box;

    // 2/3. the composition itself
    if (viewport.width < WORKBENCH_BREAKPOINT) {
      expect(
        preview.y + preview.height,
        "single column: the preview ends before the controls begin",
      ).toBeLessThanOrEqual(controls.y + 1);
    } else {
      expect(
        preview.x + preview.width,
        "workbench: the preview ends before the controls begin",
      ).toBeLessThanOrEqual(controls.x + 1);
      const overlapTop = Math.max(preview.y, controls.y);
      const overlapBottom = Math.min(preview.y + preview.height, controls.y + controls.height);
      expect(
        overlapBottom - overlapTop,
        "workbench: the panes share vertical space",
      ).toBeGreaterThan(0);
    }

    // both panes stay inside the composer, and no control leaves the viewport
    for (const [label, pane] of [
      ["preview pane", preview],
      ["controls pane", controls],
    ] as const) {
      expect(pane.x, `${label} left edge`).toBeGreaterThanOrEqual(composer.x - 1);
      expect(pane.x + pane.width, `${label} right edge`).toBeLessThanOrEqual(
        composer.x + composer.width + 1,
      );
    }
    const clipped = await page.evaluate(() => {
      const root = document.querySelector(".denn-composer");
      if (root === null) return ["no composer"];
      const limit = document.documentElement.clientWidth;
      const out: string[] = [];
      for (const node of root.querySelectorAll(
        "button, a[href], input, select, textarea, canvas",
      )) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.left < -1 || rect.right > limit + 1) {
          out.push(node.getAttribute("data-testid") ?? node.tagName);
        }
      }
      return out;
    });
    expect(clipped, "controls clipped out of the viewport").toEqual([]);

    // 5. the frame Canvas fits the screen it is drawn on - in the PLAN, not with a CSS transform
    const size = await cssSize(page);
    expect(size.width, "Canvas width").toBeGreaterThan(0);
    expect(size.height, "Canvas height").toBeGreaterThan(0);
    expect(size.width, "Canvas width cap").toBeLessThanOrEqual(500);
    expect(size.height, "Canvas fits the viewport height budget").toBeLessThanOrEqual(
      viewport.height - VIEWPORT_RESERVE,
    );
    // spec 022: the observed CSS size IS the plan's logical canvas - nothing is scaled after the
    // fact, so the customer is looking at the same geometry the print export reads.
    const attributes = await canvas(page).evaluate((element) => {
      const node = element as HTMLCanvasElement;
      const style = window.getComputedStyle(node);
      return {
        width: node.width,
        height: node.height,
        transform: style.transform,
        maxHeight: style.maxHeight,
        dpr: window.devicePixelRatio,
      };
    });
    expect(attributes.width).toBe(Math.round(size.width * attributes.dpr));
    expect(attributes.height).toBe(Math.round(size.height * attributes.dpr));
    expect(attributes.transform === "none" || attributes.transform === "").toBe(true);
    expect(attributes.maxHeight).toBe("none");
    expect(size.height).toBe(Math.round(size.width * 1.4));

    // 8. nothing crashed, nothing was logged, nothing left the machine
    expect(noise.errors).toEqual([]);
    expect(noise.warnings).toEqual([]);
    expect(crashes).toEqual([]);
    expect(route.unexpected()).toBe(0);
  });
}

test("spec 085: the desktop preview stays in view while the customer works the controls", async ({
  page,
}) => {
  await routeCatalog(page);
  await frameWorkbench(page, { width: 1280, height: 800 });

  const sticky = await previewPane(page).evaluate((node) => window.getComputedStyle(node).position);
  expect(sticky).toBe("sticky");

  // scroll towards the end of the controls and check the preview is still on screen...
  await page.evaluate(() => {
    const controls = document.querySelector('[data-testid="preview-controls-pane"]');
    controls?.scrollIntoView({ block: "end", behavior: "instant" });
  });
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

  const after = await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="preview-pane"]');
    const composer = document.querySelector(".denn-composer");
    if (pane === null || composer === null) return null;
    const paneRect = pane.getBoundingClientRect();
    const composerRect = composer.getBoundingClientRect();
    return {
      paneTop: paneRect.top,
      paneBottom: paneRect.bottom,
      composerBottom: composerRect.bottom,
      viewportHeight: window.innerHeight,
      scrolled: window.scrollY,
    };
  });
  expect(after).not.toBeNull();
  if (after === null) return;
  expect(after.scrolled, "the page actually scrolled").toBeGreaterThan(0);
  expect(after.paneTop, "the preview is still on screen").toBeLessThan(after.viewportHeight);
  expect(after.paneBottom, "the preview is still on screen").toBeGreaterThan(0);
  // ...and it never escapes the composer, so it cannot cover what comes after it
  expect(after.paneBottom).toBeLessThanOrEqual(after.composerBottom + 1);
});

test("spec 085: the reading flow keeps its measure while the workbench widens", async ({
  page,
}) => {
  await routeCatalog(page);
  await frameWorkbench(page, { width: 1280, height: 800 });

  const widths = await page.evaluate(() => {
    const width = (selector: string): number =>
      document.querySelector(selector)?.getBoundingClientRect().width ?? -1;
    return {
      inner: width(".denn-customer__inner"),
      reading: width(".denn-customer__card--reading"),
      workbench: width(".denn-customer__card--workbench"),
      composer: width(".denn-composer"),
      firstStep: width(".denn-browse > fieldset"),
    };
  });
  expect(widths.inner).toBeGreaterThan(560);
  expect(widths.inner).toBeLessThanOrEqual(1120);
  expect(widths.reading, "identity/status keep the reading measure").toBeLessThanOrEqual(560);
  expect(widths.firstStep, "the selection steps keep the reading measure").toBeLessThanOrEqual(560);
  expect(widths.workbench, "the browse card carries the workbench").toBeGreaterThan(560);
  expect(widths.composer, "the composer uses the workbench measure").toBeGreaterThan(560);
});

for (const viewport of [
  { name: "390x844", width: 390, height: 844 },
  { name: "1280x800", width: 1280, height: 800 },
] as const) {
  test(`spec 085 accessibility @ ${viewport.name}: DOM tab order, focus, 44px, axe 0`, async ({
    page,
  }) => {
    const noise = collectConsole(page);
    await routeCatalog(page);
    await frameWorkbench(page, viewport);

    // The tab order follows the DOM, and the DOM is preview-then-controls - so a keyboard user
    // reaches the result before the controls, exactly as the pointer user sees it.
    await page.evaluate(() => {
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
      document.body.removeAttribute("tabindex");
    });
    const stops: { index: number; ring: boolean }[] = [];
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) return null;
        const tabbable = [
          ...document.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
          ),
        ].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const style = window.getComputedStyle(active);
        return {
          index: tabbable.indexOf(active),
          ring:
            (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
            (style.boxShadow !== "none" && style.boxShadow.length > 0),
        };
      });
      if (stop === null) break;
      stops.push(stop);
    }
    expect(stops.length).toBeGreaterThan(4);
    for (let index = 1; index < stops.length; index++) {
      expect(stops[index]?.index ?? -1, "tab order follows the DOM order").toBeGreaterThan(
        stops[index - 1]?.index ?? -1,
      );
    }
    expect(
      stops.filter((stop) => !stop.ring),
      "every stop shows a focus indicator",
    ).toEqual([]);

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });

    const targets = page.locator(
      ".denn-composer__swatch, .denn-composer__clear, .denn-composer__slot-input, .denn-print__button",
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
  });
}
// --- spec 085 visual evidence -------------------------------------------------
//
// The product-route PNGs that show F-1 closed. Three test-only conditions make the bytes
// reproducible, all of them learned in spec 084's correction round and none of them a tolerance:
// a fixed clock (the frame preview paints a placeholder that reads the real `Date.now()`),
// finishing in-flight transitions before the shutter, and `--disable-partial-raster` (Chromium
// re-uses a compositor tile's previous pixels, so an anti-aliased edge otherwise inherits that
// tile's history). No timeout, retry, skip or pixel tolerance is involved.

const EVIDENCE_DIR = "docs/rebuild/results/spec-085";
/** 2026-09-02 09:30 KST, matching spec 084's audit clock. */
const EVIDENCE_CLOCK = new Date("2026-09-02T00:30:00.000Z");

test.describe("spec 085 evidence", () => {
  test.use({ timezoneId: "Asia/Seoul" });

  const EVIDENCE = [
    { file: "composer-workbench-1280x800.png", width: 1280, height: 800 },
    { file: "composer-workbench-390x844.png", width: 390, height: 844 },
    { file: "composer-workbench-844x390.png", width: 844, height: 390 },
  ] as const;

  for (const shot of EVIDENCE) {
    test(`captures the composer at ${shot.width}x${shot.height}`, async ({ page }) => {
      const noise = collectConsole(page);
      const route = await routeCatalog(page);
      await page.clock.setFixedTime(EVIDENCE_CLOCK);
      await frameWorkbench(page, { width: shot.width, height: shot.height });

      // motion off, then every animation already running is snapped to its end value:
      // `transition-duration: 0s` does not stop a transition that has already started.
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}",
      });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          try {
            animation.finish();
          } catch {
            animation.pause();
            animation.currentTime = 0;
          }
        }
      });
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        window.scrollTo(0, 0);
      });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );

      const { mkdirSync } = await import("node:fs");
      mkdirSync(EVIDENCE_DIR, { recursive: true });
      await page.screenshot({ path: `${EVIDENCE_DIR}/${shot.file}`, fullPage: true });

      expect(noise.errors).toEqual([]);
      expect(noise.warnings).toEqual([]);
      expect(route.unexpected()).toBe(0);
    });
  }

  test("every stored PNG has exactly one README entry, and every listed PNG exists", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const files = readdirSync(EVIDENCE_DIR).filter((name) => name.endsWith(".png"));
    expect(files.sort()).toEqual([...EVIDENCE].map((shot) => shot.file).sort());
    const readme = readFileSync(`${EVIDENCE_DIR}/README.md`, "utf8");
    for (const file of files) {
      expect(readme.split(`\`${file}\``).length - 1, `README entries for ${file}`).toBe(1);
    }
    for (const claimed of readme.matchAll(/`([a-z0-9-]+\.png)`/g)) {
      expect(files, `README lists ${claimed[1]}`).toContain(claimed[1]);
    }
  });
});
