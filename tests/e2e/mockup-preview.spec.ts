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
