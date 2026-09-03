import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

// Spec 063: the production `?space=` route after spec 062 / FF-1=A. A `space-scene-v1` payload
// carries no capture orientation and no geometry basis, so the viewer refuses to compose it at all.
// The expectations below are the safe-stop contract, not a Canvas contract:
//   - before the password is accepted: no viewer UI, no request of any kind;
//   - after it is accepted: the Korean safe notice, zero Canvas, and STILL zero catalog/proof/art
//     requests — the block happens before any source is even derived.
// Playwright intercepts every HTTPS request with a regex catch-all (a string glob silently failed to
// match in spec 061) and only the two exact synthetic URLs are answered, so external egress is 0.
// Those two endpoints are deliberately left answerable: a request count of 0 has to prove a product
// decision, not a broken fixture endpoint.

const FIXTURE_URL = `http://localhost:${MOCKUP_PORT}/e2e-space-production-route-fixture.html`;
const CATALOG_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/published%2Fstate.json?alt=media";
const PROOF_URL =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Fspec-061-synthetic.png?alt=media";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4ZQAAAAASUVORK5CYII=",
  "base64",
);

const BLOCKED_HEADING = "이 시안은 지금 화면에 표시할 수 없습니다";
const SECRETS = [
  "PRIVATE_OWNER_MARKER",
  "PRIVATE_CREATED_AT_MARKER",
  "SPEC_061_PRIVATE_TOKEN",
  "SYNTHETIC_PASSWORD",
  "spec-061-template",
  "spec-061-size",
  "space-scene-v1",
  "SPACE_PROOF_ORIENTATION_UNCONFIRMED",
  "SPACE_VIEW_ORIENTATION_UNCONFIRMED",
  CATALOG_URL,
  PROOF_URL,
];

const catalog = {
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    models: [],
    caseCategories: [],
    caseTemplates: [],
    frameCategories: [],
    guideBackgrounds: [],
    customFonts: [],
    frameThickness: 5,
    frameTemplates: [
      {
        id: "spec-061-template",
        name: "합성 템플릿",
        type: "uploaded",
        targetSizeIds: ["spec-061-size"],
        clockEnabled: false,
        textZones: [],
      },
    ],
    frameSizes: [{ id: "spec-061-size", name: "합성 크기", aspect: 1.4 }],
    frameColors: [{ id: "spec-061-color", name: "검정", fill: "#1A1A1A" }],
  },
};

interface RouteProbe {
  readonly requests: string[];
  readonly consoleMessages: string[];
  readonly consoleProblems: string[];
}

/**
 * Records every non-fixture request and every console message, then answers ONLY the two exact
 * synthetic URLs and aborts all other HTTPS. Nothing reaches a real host.
 */
async function installProbe(page: Page): Promise<RouteProbe> {
  const requests: string[] = [];
  const consoleMessages: string[] = [];
  const consoleProblems: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      requests.push(request.url());
    }
  });
  page.on("console", (message) => {
    consoleMessages.push(message.text());
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));
  await page.route(/^https:\/\//, (route) => {
    const url = route.request().url();
    if (url === CATALOG_URL) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(catalog),
      });
    }
    if (url === PROOF_URL) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: PNG,
      });
    }
    return route.abort("blockedbyclient");
  });
  return { requests, consoleMessages, consoleProblems };
}

async function authenticate(page: Page): Promise<void> {
  await page.getByTestId("space-password").fill("SYNTHETIC_PASSWORD");
  await page.getByTestId("space-submit").click();
}

/** Two animation frames: anything the commit scheduled has run by the time this resolves. */
const settle = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

test("production space route blocks an unproven V1 scene with zero catalog and proof traffic", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 0,
    sceneOpens: 0,
  });

  await authenticate(page);
  const view = page.getByTestId("space-frame-view");
  await expect(view).toBeVisible();
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await expect(page.getByTestId("space-frame-status")).toContainText(
    "이 링크는 이전 버전에서 발급된 시안입니다.",
  );
  await expect(page.getByTestId("space-frame-status")).toContainText(
    "구도를 임의로 바꿔 보여드리지 않기 위해 시안 표시를 안전하게 중단했습니다.",
  );
  await expect(page.getByTestId("space-frame-next")).toContainText(
    "담당자에게 새 시안 링크를 요청해 주세요.",
  );
  await expect(page.getByTestId("space-frame-status")).toHaveAttribute("role", "alert");

  // No best-effort composition: no Canvas, no image placeholder, and no retry affordance.
  await settle(page);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(view.locator("img")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-retry")).toHaveCount(0);
  await expect(view.getByRole("button")).toHaveCount(0);

  // The scene was decrypted (that is the password gate), but nothing downstream was fetched.
  expect(probe.requests).toEqual([]);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    sceneOpens: 1,
  });

  const body = await page.locator("body").innerText();
  const output = `${body}\n${probe.consoleMessages.join("\n")}`;
  for (const secret of SECRETS) {
    expect(output).not.toContain(secret);
  }
  expect(probe.consoleProblems).toEqual([]);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
});

test("the blocked state never retries on its own, on re-render or after a reload", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();

  // A resize re-renders the view; a wait covers any timer-based retry or polling.
  await page.setViewportSize({ width: 1280, height: 800 });
  await settle(page);
  await page.waitForTimeout(1500);
  expect(probe.requests).toEqual([]);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  // A second visit must not reuse a previous plan or escalate to a best-effort render.
  await page.reload();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await settle(page);
  expect(probe.requests).toEqual([]);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  expect(probe.consoleProblems).toEqual([]);
});

test("unmounting the production route leaves no view and starts no deferred work", async ({
  page,
}) => {
  const probe = await installProbe(page);

  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();

  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-view-mode")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  await settle(page);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  expect(probe.requests).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

test("the blocked notice fits a 320px viewport without horizontal overflow", async ({ page }) => {
  await installProbe(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(FIXTURE_URL);
  await authenticate(page);
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await settle(page);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  const box = await page.getByTestId("space-frame-view").boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(overflow.clientWidth);
});

// --- spec 063 representative screenshots (synthetic fixture only) -----------
const SHOTS = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const shot of SHOTS) {
  test(`spec063 screenshot ${shot.name}`, async ({ page }) => {
    await installProbe(page);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(FIXTURE_URL);
    await authenticate(page);
    await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
    await settle(page);
    await page.screenshot({
      path: `docs/rebuild/results/spec-063/space-v1-blocked-${shot.name}.png`,
      fullPage: true,
    });
  });
}

// --- spec 080: the V2 customer viewer --------------------------------------
//
// Every V2 mode below is driven by the fixture's in-memory synthetic PNG through the REAL replay
// controller, browser decoder and Canvas surface. The only requests a V2 run may make are the
// fixture's own `blob:` object URLs, which never leave the browser.

const V2_SECRETS = [
  "SPEC_061_PRIVATE_TOKEN",
  "SYNTHETIC_PASSWORD",
  "PRIVATE_STORAGE_MARKER",
  "rebuild-space-assets",
  "SPACE_V2_",
  "space-scene-v2",
  "123e4567-e89b-42d3-a456-426614174000",
];

const external = (probe: RouteProbe): string[] =>
  probe.requests.filter((url) => !url.startsWith("blob:"));

const v2Url = (mode: string): string => `${FIXTURE_URL}?mode=${mode}`;

/**
 * A real keyboard form submit: Enter is pressed IN the password field, so it is the browser's
 * implicit submission that runs — not a click, and not Enter on an already-focused button.
 */
async function authenticateWith(page: Page, password: string): Promise<void> {
  const field = page.getByTestId("space-password");
  await field.fill(password);
  await field.press("Enter");
}

test("the V2 route renders the saved proof on a real canvas with zero external traffic", async ({
  page,
}) => {
  const probe = await installProbe(page);
  await page.goto(v2Url("v2"));

  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("space-v2-proof-view")).toHaveCount(0);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 0,
    v2Bundles: 0,
    proofReads: 0,
    decodes: 0,
  });

  // The password field really is inside the form, and the button really is its submit control.
  const form = page.getByTestId("space-password-form");
  await expect(form).toBeVisible();
  await expect(form.getByTestId("space-password")).toHaveCount(1);
  await expect(form.getByTestId("space-submit")).toHaveAttribute("type", "submit");

  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  const view = page.getByTestId("space-v2-proof-view");
  await expect(view).toBeVisible();
  await expect(view.getByRole("heading", { name: "내 공간 시안" })).toBeVisible();
  await expect(view).toContainText("저장된 시안 · 열람 전용");
  await expect(view).toContainText("저장된 액자 구성을 확인할 수 있습니다.");

  const canvas = page.getByTestId("preview-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("aria-label", "저장된 액자 시안");
  await settle(page);
  // "ready" is only reported when the executor found the decoded drawable behind the plan's
  // imageRef, so this is the end-to-end proof that the binding survived the whole pipeline.
  await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");

  // No download / save / order / share affordance, and no fallback <img>.
  await expect(view.locator("img")).toHaveCount(0);
  await expect(view.getByRole("button")).toHaveCount(0);
  await expect(view.getByRole("link")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);

  expect(external(probe)).toEqual([]);
  // preventDefault held: the form neither navigated nor put the password in the query string.
  expect(page.url()).toBe(v2Url("v2"));
  // One keyboard submit means exactly one read and exactly one byte download — not two.
  // (`controllerFactories` is deliberately not asserted: StrictMode's development double-render
  // calls the memoised factory twice, which is a harness artefact, not a product request.)
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    sceneOpens: 0,
    v2Bundles: 1,
    v2Opens: 1,
    proofReads: 1,
    decodes: 1,
  });

  const body = await page.locator("body").innerText();
  const output = [body, ...probe.consoleMessages].join("\n");
  for (const secret of V2_SECRETS) {
    expect(output).not.toContain(secret);
  }
  expect(probe.consoleProblems).toEqual([]);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")),
  ).toEqual([]);
});

test("a wrong V2 password asks again and reuses the already read document", async ({ page }) => {
  const probe = await installProbe(page);
  await page.goto(v2Url("v2-wrong-password"));

  await authenticateWith(page, "WRONG_PASSWORD");
  await expect(page.getByTestId("space-status")).toHaveText("비밀번호가 올바르지 않습니다.");
  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  // The gate cleared the field on submit; nothing is remembered or auto-resent.
  await expect(page.getByTestId("space-password")).toHaveValue("");
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    proofReads: 0,
    decodes: 0,
  });

  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  await expect(page.getByTestId("space-v2-proof-view")).toBeVisible();
  await settle(page);
  await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    documentReads: 1,
    v2Bundles: 1,
    v2Opens: 2,
    proofReads: 1,
  });
  expect(external(probe)).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

test("an unavailable proof stays retryable and never retries on its own", async ({ page }) => {
  const probe = await installProbe(page);
  await page.goto(v2Url("v2-proof-unavailable"));

  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  await expect(page.getByTestId("space-status")).toHaveText(
    "시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
  );
  await expect(page.getByTestId("space-password")).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  await settle(page);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    proofReads: 1,
    decodes: 0,
  });
  expect(external(probe)).toEqual([]);

  const body = await page.locator("body").innerText();
  expect(body).not.toContain("PRIVATE_STORAGE_MARKER");
  expect(probe.consoleProblems).toEqual([]);
});

test("a proof that fails its digest closes without a retry control", async ({ page }) => {
  const probe = await installProbe(page);
  await page.goto(v2Url("v2-mismatch"));

  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  await expect(page.getByTestId("space-status")).toHaveText("시안을 표시할 수 없습니다.");
  await expect(page.getByTestId("space-status")).toHaveAttribute("role", "alert");
  // Non-retryable: the password field is withdrawn, so there is nothing to resubmit.
  await expect(page.getByTestId("space-password")).toHaveCount(0);
  await expect(page.getByTestId("space-submit")).toHaveCount(0);
  await settle(page);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-proof-view")).toHaveCount(0);
  expect(await page.evaluate(() => window.__DENN_SPACE_PRODUCTION_ROUTE_FIXTURE__)).toMatchObject({
    proofReads: 1,
    decodes: 0,
  });
  expect(external(probe)).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

test("the V2 viewer fits a 320px viewport without horizontal overflow", async ({ page }) => {
  await installProbe(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(v2Url("v2"));
  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  await expect(page.getByTestId("preview-canvas")).toBeVisible();
  await settle(page);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  const box = await page.getByTestId("space-v2-proof-view").boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(overflow.clientWidth);
});

test("unmounting the V2 route leaves no canvas and starts no deferred work", async ({ page }) => {
  const probe = await installProbe(page);
  await page.goto(v2Url("v2"));
  await authenticateWith(page, "SYNTHETIC_PASSWORD");
  await expect(page.getByTestId("preview-canvas")).toBeVisible();

  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-view-mode")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await settle(page);
  await page.waitForTimeout(500);
  expect(external(probe)).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

// --- spec 087: one title after authentication ---------------------------------
//
// Closes spec 084 F-3, measured on this same surface: the gate printed `내 공간 시안 확인` and
// `담당자에게 전달받은 비밀번호를 입력하세요.` in EVERY state, so the authenticated screen carried two
// headings and an instruction the customer had already followed. What is asserted here is the
// rendered document — how many `h1`s exist and whether the prompt is still in the DOM — because the
// component contract alone does not prove what the customer ends up looking at.

const GATE_TITLE = "내 공간 시안 확인";
const PASSWORD_PROMPT = "담당자에게 전달받은 비밀번호를 입력하세요.";

/** Every heading on the page, in document order, as `level: text`. */
const headings = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(
      (node) => `${node.tagName.toLowerCase()}: ${(node.textContent ?? "").trim()}`,
    ),
  );

const SURFACE_VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

for (const viewport of SURFACE_VIEWPORTS) {
  test(`spec 087 @ ${viewport.name}: the V2 result owns the only title and the prompt is gone`, async ({
    page,
  }) => {
    const probe = await installProbe(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(v2Url("v2"));

    // §1 — before authentication the gate is unchanged: its own title and its instruction.
    await expect(page.getByRole("heading", { level: 1, name: GATE_TITLE })).toBeVisible();
    await expect(page.getByText(PASSWORD_PROMPT)).toBeVisible();
    expect(await headings(page)).toEqual([`h1: ${GATE_TITLE}`]);

    await authenticateWith(page, "SYNTHETIC_PASSWORD");
    await expect(page.getByTestId("preview-canvas")).toBeVisible();
    await settle(page);
    await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");

    // §3 — exactly one heading, and it is the result's own. No level is skipped because there is
    // only one, and the gate's title and instruction are gone from the DOM, not merely hidden.
    expect(await headings(page)).toEqual(["h1: 내 공간 시안"]);
    await expect(page.getByText(GATE_TITLE)).toHaveCount(0);
    await expect(page.getByText(PASSWORD_PROMPT)).toHaveCount(0);
    // the badge that carries the "열람 전용" state is still there
    await expect(page.getByTestId("space-v2-proof-view")).toContainText("저장된 시안 · 열람 전용");

    // the section is still named by that heading, so promoting the level named nothing away.
    // The V2 route's result is `SpaceV2ProofView`, whose section is labelled `space-v2-proof-title`
    // (`space-frame-title` belongs to the V1 frame view, which this route never reaches).
    const labelled = await page.evaluate(() => {
      const section = document.querySelector('[aria-labelledby="space-v2-proof-title"]');
      const target = document.getElementById("space-v2-proof-title");
      return { hasSection: section !== null, resolves: target !== null, tag: target?.tagName };
    });
    expect(labelled).toEqual({ hasSection: true, resolves: true, tag: "H1" });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "document horizontal overflow").toBeLessThanOrEqual(0);

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
    expect(probe.consoleProblems).toEqual([]);
    expect(probe.requests).toEqual([]);
  });
}

test("spec 087: the V1 blocked notice is the only title and asks for no password again", async ({
  page,
}) => {
  const probe = await installProbe(page);
  await page.goto(FIXTURE_URL);

  await expect(page.getByRole("heading", { level: 1, name: GATE_TITLE })).toBeVisible();
  await expect(page.getByText(PASSWORD_PROMPT)).toBeVisible();

  await authenticate(page);
  await expect(page.getByTestId("space-frame-view")).toBeVisible();

  expect(await headings(page)).toEqual([`h1: ${BLOCKED_HEADING}`]);
  await expect(page.getByText(GATE_TITLE)).toHaveCount(0);
  await expect(page.getByText(PASSWORD_PROMPT)).toHaveCount(0);
  // the safe-stop contract itself is untouched: still an alert, still no retry affordance
  await expect(page.getByTestId("space-frame-status")).toHaveAttribute("role", "alert");
  await expect(page.getByTestId("space-frame-view").getByRole("button")).toHaveCount(0);

  const labelled = await page.evaluate(() => {
    const section = document.querySelector('[aria-labelledby="space-frame-blocked-title"]');
    const target = document.getElementById("space-frame-blocked-title");
    return { hasSection: section !== null, resolves: target !== null, tag: target?.tagName };
  });
  expect(labelled).toEqual({ hasSection: true, resolves: true, tag: "H1" });

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
  expect(probe.consoleProblems).toEqual([]);
});

// --- spec 080 representative screenshots (synthetic fixture only) -----------
//
// The fixture's own "화면 해제" control is harness scaffolding, not product UI. It is hidden in the
// page (never in the fixture source) immediately before the capture, so the recorded design
// evidence shows the customer surface and nothing else.
for (const shot of SHOTS) {
  test(`spec080 screenshot ${shot.name}`, async ({ page }) => {
    await installProbe(page);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(v2Url("v2"));
    await authenticateWith(page, "SYNTHETIC_PASSWORD");
    await expect(page.getByTestId("preview-canvas")).toBeVisible();
    await settle(page);
    await expect(page.getByTestId("canvas-status")).toHaveText("미리보기가 준비되었습니다.");

    await page.evaluate(() => {
      const control = document.querySelector('[data-testid="fixture-unmount"]');
      if (control instanceof HTMLElement) control.style.display = "none";
    });
    await expect(page.getByTestId("fixture-unmount")).toBeHidden();
    await settle(page);

    await page.screenshot({
      path: `docs/rebuild/results/spec-080/space-v2-viewer-${shot.name}.png`,
      fullPage: true,
    });
  });
}
