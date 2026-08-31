import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { buildPublicCatalogUrl } from "../../packages/firebase/src/public-catalog/location";
import { ADMIN_PORT, MOCKUP_PORT } from "../../playwright.config";

// Spec 084 — local visual readiness audit. EVIDENCE ONLY: this suite changes no product source and
// asserts nothing new about product behaviour; it drives the surfaces the existing specs already
// prove, records what they look like, and measures them.
//
// Two rules shape every capture below.
//
//  1. PROVENANCE IS PART OF THE EVIDENCE. A page served from `index.html` with a routed synthetic
//     catalog is a `PRODUCT_ROUTE`. A page served from an `e2e-*-fixture.html` entry renders real
//     product components around a synthetic composition and is a
//     `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` — it is never called a product screen. The harness's
//     own headings, diagnostics and state-transition buttons are `FIXTURE_CONTROL_ONLY` and are kept
//     OUT of the recorded design evidence, by capturing the product locator rather than the page.
//
//  2. WHAT FAILS THE RUN AND WHAT IS A FINDING ARE DIFFERENT THINGS. Spec 084 §완료 정의 requires the
//     full gate to pass WHILE findings are recorded rather than fixed, so the assertions here are
//     limited to the safety invariants that unit's contract puts at zero — external egress, console
//     errors, page errors, leaked identifiers, a Canvas that never became ready. Everything else
//     (overflow, target size, focus, axe) is MEASURED into `measurements.json` and judged in the
//     audit report, where a defect becomes a P0/P1/P2 finding instead of a red gate that would have
//     to be "fixed" by touching product UI this unit may not touch.

const RESULTS_DIR = "docs/rebuild/results/spec-084";
const MOCKUP_URL = `http://localhost:${MOCKUP_PORT}/`;
const ADMIN_URL = `http://localhost:${ADMIN_PORT}/`;
const SPACE_FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-space-production-route-fixture.html`;
const ADMIN_WRITE_FIXTURE_URL = `http://localhost:${ADMIN_PORT}/e2e-admin-write-fixture.html`;
const ADMIN_ISSUE_FIXTURE_URL = `http://localhost:${ADMIN_PORT}/e2e-space-v2-issue-fixture.html`;
const CATALOG_URL = buildPublicCatalogUrl();

type Provenance =
  | "PRODUCT_ROUTE"
  | "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE"
  | "FIXTURE_CONTROL_ONLY";

interface KeyboardStop {
  readonly label: string;
  readonly tag: string;
  readonly domIndex: number;
  readonly inRegion: boolean;
  readonly outline: string;
  readonly boxShadow: string;
  readonly indicatorVisible: boolean;
}

/** How far the keyboard walk goes on each surface. Enough to cross the primary controls. */
const KEYBOARD_WALK_STEPS = 14;

interface TargetReport {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

interface Measurement {
  readonly file: string | null;
  readonly surface: string;
  readonly state: string;
  readonly viewport: string;
  readonly provenance: Provenance;
  readonly url: string;
  readonly preparation: string;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly horizontalOverflow: boolean;
  readonly offscreenControls: readonly string[];
  readonly smallTargets: readonly TargetReport[];
  readonly rangeControls: readonly TargetReport[];
  readonly keyboardWalk: readonly KeyboardStop[];
  readonly keyboardOrderFollowsDom: boolean;
  readonly stopsWithoutFocusIndicator: readonly string[];
  readonly axeSeriousCritical: readonly string[];
  readonly consoleErrors: readonly string[];
  readonly consoleWarnings: readonly string[];
  readonly pageErrors: readonly string[];
  readonly externalRequests: readonly string[];
  readonly interceptedRequests: readonly string[];
  readonly canvas: { readonly cssWidth: number; readonly cssHeight: number } | null;
  readonly leakedText: readonly string[];
}

const measurements: Measurement[] = [];

test.afterAll(() => {
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    `${RESULTS_DIR}/measurements.json`,
    `${JSON.stringify({ generatedBy: "tests/e2e/local-visual-readiness.spec.ts", measurements }, null, 2)}\n`,
    "utf8",
  );
});

// --- synthetic assets (nothing is read from the repository) ------------------

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
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
/** A solid RGB square, generated here so no image file joins the repository. */
function solidPng(size: number, [r, g, b]: readonly [number, number, number]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const at = row + 1 + x * 3;
      raw[at] = r;
      raw[at + 1] = g;
      raw[at + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
const photoFile = (name: string, colour: readonly [number, number, number]) => ({
  name,
  mimeType: "image/png",
  buffer: solidPng(64, colour),
});

/** One catalog that serves both the browse grid and the composer. */
const CATALOG = JSON.stringify({
  models: [
    { id: "m1", name: "모델 하나", w: 300, h: 200 },
    { id: "m2", name: "모델 둘", w: 320, h: 210 },
  ],
  caseCategories: [{ id: "cc1", name: "분류 A" }],
  caseTemplates: [
    {
      id: "ct1",
      name: "케이스 알파",
      type: "uploaded",
      categoryId: "cc1",
      photoZones: [{ x: 8, y: 8, w: 84, h: 84 }],
    },
  ],
  frameSizes: [
    { id: "fs1", name: "사이즈 하나", aspect: 1.4, frameThickness: 5 },
    { id: "fs2", name: "사이즈 둘", aspect: 0.8, frameThickness: 5 },
  ],
  frameCategories: [{ id: "fc1", name: "액자 A" }],
  frameTemplates: [{ id: "full", name: "기본 액자", type: "builtin" }],
  frameColors: [
    { id: "black", name: "블랙", fill: "#1A1A1A" },
    { id: "taupe", name: "웜 토프", fill: "#9F887A" },
  ],
});

// --- per-page probes ---------------------------------------------------------

interface Probe {
  readonly consoleErrors: string[];
  readonly consoleWarnings: string[];
  readonly pageErrors: string[];
  readonly externalRequests: string[];
  /** URLs this suite answers locally: they are requested, but nothing leaves the machine. */
  readonly interceptedRequests: string[];
}

/**
 * Watches every request the page makes. `blob:` and `data:` never leave the browser and `localhost`
 * is the E2E preview server; anything else would mean this audit reached the outside world, which
 * spec 084 §위험 makes an immediate STOP.
 */
function probe(page: Page, intercepted: readonly string[] = []): Probe {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  const interceptedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.type() === "warning") consoleWarnings.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("blob:") || url.startsWith("data:")) return;
    if (new URL(url).hostname === "localhost") return;
    if (intercepted.includes(url)) {
      interceptedRequests.push(url);
      return;
    }
    externalRequests.push(url);
  });
  return { consoleErrors, consoleWarnings, pageErrors, externalRequests, interceptedRequests };
}

/** The customer catalog, answered locally. Any other Firebase URL is refused and counted. */
async function routeCatalog(page: Page): Promise<{ unexpected: () => number }> {
  let unexpected = 0;
  await page.route(/https?:\/\/.*/i, async (route: Route) => {
    const url = route.request().url();
    if (url.startsWith(MOCKUP_URL) || url.startsWith(ADMIN_URL)) {
      await route.continue();
      return;
    }
    if (url === CATALOG_URL) {
      await route.fulfill({ status: 200, contentType: "application/json", body: CATALOG });
      return;
    }
    unexpected++;
    await route.abort("blockedbyclient");
  });
  return { unexpected: () => unexpected };
}

/** Two animation frames: everything the last commit scheduled has run. */
const settle = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

/** Motion off, so a capture is deterministic. Injected into the PAGE, never into product source. */
async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}",
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settle(page);
}

// --- measurement -------------------------------------------------------------

const MIN_TARGET = 44;

/** Identifiers that must never be visible on any captured surface. */
const LEAK_MARKERS = [
  "rebuild-space-assets",
  "admin/state.json",
  "SPACE_V2_",
  "firebasestorage.googleapis.com",
  "SYNTHETIC_PASSWORD",
  "correct-horse",
];

interface CaptureInput {
  readonly page: Page;
  readonly probe: Probe;
  readonly file: string | null;
  readonly surface: string;
  readonly state: string;
  readonly viewport: string;
  readonly provenance: Provenance;
  readonly url: string;
  readonly preparation: string;
  /** The product region to capture. Defaults to the whole page (a product route). */
  readonly region?: Locator;
  /** The same region as a CSS selector, so the DOM measurement can be scoped to it. */
  readonly regionSelector?: string;
  /** Fixture chrome to hide immediately before the capture — page-side only. */
  readonly hide?: readonly string[];
  readonly canvasTestId?: string;
}

/**
 * Measure one prepared surface, then write its PNG.
 *
 * Everything read here comes from the live DOM of the page the existing product code rendered. The
 * only page mutation is hiding fixture-owned controls, which spec 084 §구현 지시 6 allows expressly
 * so harness chrome stays out of the design evidence.
 */
async function captureAndMeasure(input: CaptureInput): Promise<Measurement> {
  const { page, probe: watcher } = input;
  await freezeMotion(page);

  if (input.hide !== undefined && input.hide.length > 0) {
    await page.evaluate(
      (selectors) => {
        for (const selector of selectors) {
          for (const node of document.querySelectorAll(selector)) {
            if (node instanceof HTMLElement) node.style.display = "none";
          }
        }
      },
      [...input.hide],
    );
    await settle(page);
  }

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  // Scoped to the PRODUCT region when there is one: a fixture's own buttons are
  // `FIXTURE_CONTROL_ONLY` and must never be reported as a product finding.
  const regionSelector = input.regionSelector ?? "body";
  const controls = await page.evaluate(
    ({ minTarget, regionSelector }) => {
      const root = document.querySelector(regionSelector) ?? document.body;
      const selector = "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
      const offscreen: string[] = [];
      const small: { label: string; width: number; height: number }[] = [];
      const ranges: { label: string; width: number; height: number }[] = [];
      const describe = (element: Element): string => {
        const testId = element.getAttribute("data-testid");
        if (testId !== null) return testId;
        const label = (element.textContent ?? "").trim().slice(0, 24);
        return label.length > 0 ? `${element.tagName.toLowerCase()}:${label}` : element.tagName;
      };
      for (const element of root.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const hidden =
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0 ||
          rect.height === 0;
        if (hidden) continue;
        if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
          offscreen.push(describe(element));
        }
        const entry = { label: describe(element), width: rect.width, height: rect.height };
        // A native range's TRACK is not its pointer target — the thumb is. It is recorded on its
        // own rather than judged by the button rule (spec 084 §화면별 자동 측정 3).
        if (element instanceof HTMLInputElement && element.type === "range") {
          ranges.push(entry);
          continue;
        }
        if (rect.height < minTarget || rect.width < minTarget) small.push(entry);
      }
      return { offscreen, small, ranges };
    },
    { minTarget: MIN_TARGET, regionSelector },
  );

  // Keyboard walk (spec 084 §화면별 자동 측정 4). Tab is pressed from the top of the document, so
  // Chromium applies `:focus-visible` exactly as it does for a real keyboard user — a programmatic
  // `.focus()` would suppress it and report a missing ring that a keyboard user does see.
  const keyboardWalk: KeyboardStop[] = [];
  // Tab continues from the last focused element, and the control the preparation clicked may since
  // have been hidden or replaced — which leaves Chromium with a stale starting point and no stops at
  // all. Focusing the body first makes the walk start at the document's first tabbable element every
  // time. The temporary attribute is removed in the same call and never reaches a screenshot.
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });
  for (let step = 0; step < KEYBOARD_WALK_STEPS; step++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(
      ({ regionSelector }) => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body) return null;
        const style = getComputedStyle(element);
        const hasOutline =
          style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
        const hasShadow = style.boxShadow !== "none" && style.boxShadow.length > 0;
        const tabbable = [
          ...document.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
          ),
        ].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const root = document.querySelector(regionSelector);
        return {
          label:
            element.getAttribute("data-testid") ??
            (element.textContent ?? "").trim().slice(0, 24) ??
            element.tagName,
          tag: element.tagName.toLowerCase(),
          domIndex: tabbable.indexOf(element),
          inRegion: root === null ? true : root.contains(element),
          outline: `${style.outlineStyle} ${style.outlineWidth}`,
          boxShadow: style.boxShadow,
          indicatorVisible: hasOutline || hasShadow,
        };
      },
      { regionSelector },
    );
    if (stop === null) break;
    keyboardWalk.push(stop);
  }
  // Focus scrolls elements into view, so the surface is returned to the top before it is captured.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await settle(page);

  const inRegion = keyboardWalk.filter((stop) => stop.inRegion);
  const domOrderRespected = inRegion.every(
    (stop, index) => index === 0 || stop.domIndex > (inRegion[index - 1]?.domIndex ?? -1),
  );
  const stopsWithoutIndicator = inRegion
    .filter((stop) => !stop.indicatorVisible)
    .map((stop) => stop.label);

  let canvas: Measurement["canvas"] = null;
  if (input.canvasTestId !== undefined) {
    canvas = await page.getByTestId(input.canvasTestId).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { cssWidth: rect.width, cssHeight: rect.height };
    });
  }

  const axe = await new AxeBuilder({ page }).analyze();
  const axeSeriousCritical = axe.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);

  const visibleText = await page.evaluate(() => document.body.innerText);
  const leakedText = LEAK_MARKERS.filter((marker) => visibleText.includes(marker));

  if (input.file !== null) {
    mkdirSync(RESULTS_DIR, { recursive: true });
    const path = `${RESULTS_DIR}/${input.file}`;
    if (input.region === undefined) {
      await input.page.screenshot({ path, fullPage: true });
    } else {
      await input.region.screenshot({ path });
    }
  }

  const measurement: Measurement = {
    file: input.file,
    surface: input.surface,
    state: input.state,
    viewport: input.viewport,
    provenance: input.provenance,
    url: input.url,
    preparation: input.preparation,
    scrollWidth: overflow.scrollWidth,
    clientWidth: overflow.clientWidth,
    horizontalOverflow: overflow.scrollWidth > overflow.clientWidth + 1,
    offscreenControls: controls.offscreen,
    smallTargets: controls.small,
    rangeControls: controls.ranges,
    keyboardWalk,
    keyboardOrderFollowsDom: domOrderRespected,
    stopsWithoutFocusIndicator: stopsWithoutIndicator,
    axeSeriousCritical,
    consoleErrors: [...watcher.consoleErrors],
    consoleWarnings: [...watcher.consoleWarnings],
    pageErrors: [...watcher.pageErrors],
    externalRequests: [...watcher.externalRequests],
    interceptedRequests: [...watcher.interceptedRequests],
    canvas,
    leakedText,
  };
  measurements.push(measurement);

  // The invariants this unit may assert: nothing left the machine, nothing crashed, nothing leaked.
  expect(measurement.externalRequests, `${input.surface} external requests`).toEqual([]);
  expect(measurement.pageErrors, `${input.surface} page errors`).toEqual([]);
  expect(measurement.consoleErrors, `${input.surface} console errors`).toEqual([]);
  expect(measurement.leakedText, `${input.surface} leaked identifiers`).toEqual([]);
  if (canvas !== null) {
    expect(canvas.cssWidth, `${input.surface} canvas width`).toBeGreaterThan(0);
    expect(canvas.cssHeight, `${input.surface} canvas height`).toBeGreaterThan(0);
  }
  return measurement;
}

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };
const NARROW = { width: 320, height: 568 };

// --- customer: browse (PRODUCT_ROUTE) ---------------------------------------

async function openBrowse(page: Page): Promise<void> {
  await page.goto(MOCKUP_URL);
  await expect(page.getByTestId("catalog-status")).toHaveText("카탈로그 준비 완료");
}

for (const [name, viewport] of [
  ["1280x800", DESKTOP],
  ["390x844", MOBILE],
] as const) {
  test(`customer browse ready @ ${name}`, async ({ page }) => {
    const watcher = probe(page, [CATALOG_URL]);
    const catalog = await routeCatalog(page);
    await page.setViewportSize(viewport);
    await openBrowse(page);
    await page.getByRole("button", { name: "액자", exact: true }).click();
    await page.getByRole("button", { name: "사이즈 하나", exact: true }).click();
    await expect(page.getByTestId("template-list")).toBeVisible();

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `browse-ready-${name}.png`,
      surface: "customer/browse",
      state: "ready (액자 kind and 사이즈 하나 selected, template cards listed)",
      viewport: name,
      provenance: "PRODUCT_ROUTE",
      url: MOCKUP_URL,
      preparation: "route the public catalog URL to a synthetic body; open `/`; choose 액자",
    });
    expect(catalog.unexpected()).toBe(0);
  });
}

test("customer browse ready @ 320x568 (measurement only)", async ({ page }) => {
  const watcher = probe(page, [CATALOG_URL]);
  await routeCatalog(page);
  await page.setViewportSize(NARROW);
  await openBrowse(page);
  await page.getByRole("button", { name: "액자", exact: true }).click();
  await page.getByRole("button", { name: "사이즈 하나", exact: true }).click();
  await expect(page.getByTestId("template-list")).toBeVisible();
  await captureAndMeasure({
    page,
    probe: watcher,
    file: null,
    surface: "customer/browse",
    state: "ready",
    viewport: "320x568",
    provenance: "PRODUCT_ROUTE",
    url: MOCKUP_URL,
    preparation: "same as 390x844; no PNG is stored for this width (spec 084 §측정 10)",
  });
});

// --- customer: composer with a real Canvas (PRODUCT_ROUTE) -------------------

async function openComposer(page: Page): Promise<void> {
  await openBrowse(page);
  await page.getByRole("button", { name: "액자", exact: true }).click();
  await page.getByRole("button", { name: "사이즈 하나", exact: true }).click();
  await page
    .getByTestId("template-list")
    .getByRole("button", { name: /기본 액자/ })
    .click();
  await page.getByTestId("preview-open").click();
  await page.getByTestId("preview-color-#1A1A1A").click();
  await page
    .getByTestId("preview-file-frame-image")
    .setInputFiles(photoFile("audit.png", [159, 136, 122]));
  await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");
}

for (const [name, viewport] of [
  ["1280x800", DESKTOP],
  ["390x844", MOBILE],
  ["844x390", LANDSCAPE],
] as const) {
  test(`customer composer ready @ ${name}`, async ({ page }) => {
    const watcher = probe(page, [CATALOG_URL]);
    const catalog = await routeCatalog(page);
    await page.setViewportSize(viewport);
    await openComposer(page);

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `composer-ready-${name}.png`,
      surface: "customer/composer",
      state: "ready (frame, colour and one synthetic photo composed on the real Canvas)",
      viewport: name,
      provenance: "PRODUCT_ROUTE",
      url: MOCKUP_URL,
      preparation:
        "routed synthetic catalog; 액자 → 사이즈 하나 → 기본 액자 → 미리보기 → 블랙 → 합성 PNG 업로드",
      canvasTestId: "preview-canvas",
    });
    expect(catalog.unexpected()).toBe(0);
  });
}

test("customer composer ready @ 320x568 (measurement only)", async ({ page }) => {
  const watcher = probe(page, [CATALOG_URL]);
  await routeCatalog(page);
  await page.setViewportSize(NARROW);
  await openComposer(page);
  await captureAndMeasure({
    page,
    probe: watcher,
    file: null,
    surface: "customer/composer",
    state: "ready",
    viewport: "320x568",
    provenance: "PRODUCT_ROUTE",
    url: MOCKUP_URL,
    preparation: "same as 390x844; no PNG is stored for this width",
    canvasTestId: "preview-canvas",
  });
});

// --- customer: Space (PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE) ---------------
//
// The `?space=` route cannot be reached from the product entry without a real Firestore document,
// so the spec 061/080 fixture — which mounts the production `MockupRoot` and replaces only the
// controller factory — is the highest-trust evidence available locally. Its own unmount button is
// harness chrome and is hidden before every capture.

const FIXTURE_CHROME = ['[data-testid="fixture-unmount"]'];

test("customer space V2 password gate @ 390x844", async ({ page }) => {
  const watcher = probe(page);
  await page.setViewportSize(MOBILE);
  await page.goto(`${SPACE_FIXTURE_URL}?mode=v2`);
  await expect(page.getByTestId("space-password")).toBeVisible();

  await captureAndMeasure({
    page,
    probe: watcher,
    file: "space-v2-password-gate-390x844.png",
    surface: "customer/space",
    state: "password gate before any document is opened",
    viewport: "390x844",
    provenance: "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE",
    url: `${SPACE_FIXTURE_URL}?mode=v2`,
    preparation: "open the spec 061/080 route fixture in V2 mode; do not authenticate",
    hide: FIXTURE_CHROME,
  });
});

for (const [name, viewport] of [
  ["390x844", MOBILE],
  ["1280x800", DESKTOP],
] as const) {
  test(`customer space V2 confirmed viewer @ ${name}`, async ({ page }) => {
    const watcher = probe(page);
    await page.setViewportSize(viewport);
    await page.goto(`${SPACE_FIXTURE_URL}?mode=v2`);
    await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
    await page.getByTestId("space-password").press("Enter");
    await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `space-v2-viewer-${name}.png`,
      surface: "customer/space",
      state: "confirmed viewer replaying the saved proof on a real Canvas",
      viewport: name,
      provenance: "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE",
      url: `${SPACE_FIXTURE_URL}?mode=v2`,
      preparation: "open the fixture in V2 mode; submit the synthetic password with Enter",
      hide: FIXTURE_CHROME,
      canvasTestId: "preview-canvas",
    });
  });
}

test("customer space V1 blocked notice @ 390x844", async ({ page }) => {
  const watcher = probe(page);
  await page.setViewportSize(MOBILE);
  await page.goto(SPACE_FIXTURE_URL);
  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
  await expect(
    page.getByRole("heading", { name: "이 시안은 지금 화면에 표시할 수 없습니다" }),
  ).toBeVisible();

  await captureAndMeasure({
    page,
    probe: watcher,
    file: "space-v1-blocked-390x844.png",
    surface: "customer/space",
    state: "V1 scene refused after the password was accepted",
    viewport: "390x844",
    provenance: "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE",
    url: SPACE_FIXTURE_URL,
    preparation: "open the fixture in the default V1 mode; authenticate",
    hide: FIXTURE_CHROME,
  });
});

// --- operator: the real admin entry (PRODUCT_ROUTE) -------------------------

for (const [name, viewport] of [
  ["1280x800", DESKTOP],
  ["390x844", MOBILE],
] as const) {
  test(`operator shell default-off @ ${name}`, async ({ page }) => {
    const watcher = probe(page);
    await page.setViewportSize(viewport);
    await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
    await expect(page.getByTestId("admin-read-status")).toContainText(
      "운영자 원격 읽기가 아직 활성화되지 않았습니다.",
    );

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `operator-shell-default-off-${name}.png`,
      surface: "operator/shell",
      state: "production default: every Firebase gate off, no operator controls",
      viewport: name,
      provenance: "PRODUCT_ROUTE",
      url: ADMIN_URL,
      preparation: "open the built admin entry with no VITE_DENN_ADMIN_* values",
    });
  });
}

test("operator shell default-off @ 320x568 (measurement only)", async ({ page }) => {
  const watcher = probe(page);
  await page.setViewportSize(NARROW);
  await page.goto(ADMIN_URL, { waitUntil: "networkidle" });
  await expect(page.getByTestId("admin-read-status")).toBeVisible();
  await captureAndMeasure({
    page,
    probe: watcher,
    file: null,
    surface: "operator/shell",
    state: "production default",
    viewport: "320x568",
    provenance: "PRODUCT_ROUTE",
    url: ADMIN_URL,
    preparation: "same as 390x844; no PNG is stored for this width",
  });
});

// --- operator: the C5 editor (PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE) -------

const ADMIN_WRITE_CHROME = ['section[aria-label="합성 fixture 진단"]'];

for (const [name, viewport] of [
  ["1280x800", DESKTOP],
  ["390x844", MOBILE],
] as const) {
  test(`operator C5 editor ready-clean @ ${name}`, async ({ page }) => {
    const watcher = probe(page);
    await page.setViewportSize(viewport);
    await page.goto(ADMIN_WRITE_FIXTURE_URL);
    await page.getByRole("button", { name: "편집 기준 불러오기" }).click();
    await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
    await page.getByTestId("frame-print-size-id").selectOption("a4");
    await expect(page.getByTestId("frame-print-size-width")).toHaveValue("21");

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `operator-c5-editor-ready-clean-${name}.png`,
      surface: "operator/c5-editor",
      state: "baseline loaded, one print size selected, no unsaved change",
      viewport: name,
      provenance: "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE",
      url: ADMIN_WRITE_FIXTURE_URL,
      preparation: "spec 041 fixture; load the synthetic baseline; select the A4 print size",
      region: page.getByTestId("frame-print-size-editor"),
      regionSelector: '[data-testid="frame-print-size-editor"]',
      hide: ADMIN_WRITE_CHROME,
    });
  });
}

// --- operator: the Space V2 issue panel (PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE)

const PNG_8x4 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAIAAAA8r+mnAAAAEUlEQVR42mOY31GFFTFQTwIAM9o0If6Hpy0AAAAASUVORK5CYII=",
  "base64",
);

async function prepareFrozenIssueDraft(page: Page): Promise<void> {
  await page.goto(ADMIN_ISSUE_FIXTURE_URL);
  await page.getByRole("button", { name: "편집 기준 불러오기" }).click();
  await expect(page.getByTestId("fixture-write-status")).toHaveText("ready-clean");
  await page.getByTestId("space-v2-frame-size").selectOption("a4");
  await page.getByTestId("space-v2-frame-template").selectOption("full");
  await page.getByTestId("space-v2-frame-color").selectOption("black");
  await page
    .getByTestId("space-v2-proof-file")
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: PNG_8x4 });
  await expect(page.getByTestId("space-v2-preview-canvas")).toBeVisible();
  await page.getByTestId("space-v2-freeze").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("draft-ready");
}

for (const [name, viewport] of [
  ["1280x800", DESKTOP],
  ["390x844", MOBILE],
] as const) {
  test(`operator space V2 issue panel frozen @ ${name}`, async ({ page }) => {
    const watcher = probe(page);
    await page.setViewportSize(viewport);
    await prepareFrozenIssueDraft(page);

    // The recorded evidence is the PRODUCT panel only. The proof is structural: the panel's box and
    // the fixture chrome's boxes do not intersect, so the panel screenshot cannot contain them.
    const panel = page.getByTestId("space-v2-issue-panel");
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    const heading = page.getByRole("heading", {
      name: "Space V2 issue E2E fixture (not a product screen)",
    });
    const diagnostics = page.locator('section[aria-label="합성 fixture 진단"]');
    await expect(heading).toHaveCount(1);
    await expect(diagnostics).toHaveCount(1);
    for (const chrome of [heading, diagnostics]) {
      const box = await chrome.boundingBox();
      expect(box).not.toBeNull();
      if (box === null || panelBox === null) continue;
      const disjoint =
        box.y + box.height <= panelBox.y ||
        box.y >= panelBox.y + panelBox.height ||
        box.x + box.width <= panelBox.x ||
        box.x >= panelBox.x + panelBox.width;
      expect(disjoint, "fixture chrome must not overlap the captured product panel").toBe(true);
    }
    // And the panel itself contains none of the harness's own test ids.
    for (const chromeTestId of [
      "fixture-write-status",
      "fixture-issue-status",
      "fixture-issue-calls",
      "fixture-effect-setups",
    ]) {
      await expect(panel.getByTestId(chromeTestId)).toHaveCount(0);
    }

    await captureAndMeasure({
      page,
      probe: watcher,
      file: `operator-space-v2-issue-frozen-${name}.png`,
      surface: "operator/space-v2-issue-panel",
      state: "frozen draft awaiting the issue password",
      viewport: name,
      provenance: "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE",
      url: ADMIN_ISSUE_FIXTURE_URL,
      preparation:
        "spec 083 fixture; load the baseline; choose A4 / 전체 사진 / 블랙; attach a synthetic PNG; 시안 고정",
      region: panel,
      regionSelector: '[data-testid="space-v2-issue-panel"]',
      canvasTestId: "space-v2-preview-canvas",
    });
  });
}

// --- the index contract ------------------------------------------------------

test("every stored PNG has exactly one README provenance entry", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const files = readdirSync(RESULTS_DIR).filter((name) => name.endsWith(".png"));
  expect(files.length, "the audit must have produced PNGs").toBeGreaterThan(0);
  const readme = readFileSync(`${RESULTS_DIR}/README.md`, "utf8");
  for (const file of files) {
    const occurrences = readme.split(`\`${file}\``).length - 1;
    expect(occurrences, `README entries for ${file}`).toBe(1);
  }
  // And every file the README claims exists.
  for (const claimed of readme.matchAll(/`([a-z0-9-]+\.png)`/g)) {
    expect(files, `README lists ${claimed[1]}`).toContain(claimed[1]);
  }
});
