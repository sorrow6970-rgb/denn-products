import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// The Space V2 issue panel in a real browser (spec 083). The page under test is the E2E-only
// harness entry, never the customer or production admin screen: everything below the WRITE PORT is
// the real product path — the real gates and composition, the real spec 081 session, the real
// spec 072 bundle with real Web Crypto, the real PNG decode and the real Canvas executor — and only
// the writer is synthetic, so no Firebase service, bucket, document or network is reached.

const FIXTURE_URL = `http://localhost:${ADMIN_PORT}/e2e-space-v2-issue-fixture.html`;
/**
 * The SAME harness source built against React's development build (see
 * `apps/admin/vite.e2e-fixture.config.ts`). Only there does `<StrictMode>` replay effects as
 * setup → cleanup → setup on the same mounted component — the lifecycle a production build cannot
 * perform and an unmount/remount is not equivalent to.
 */
const DEV_FIXTURE_URL = `http://localhost:${ADMIN_PORT}/dev/e2e-space-v2-issue-fixture.html`;

/** An 8x4 PNG, generated for this suite. Not customer data. */
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAIAAAA8r+mnAAAAEUlEQVR42mOY31GFFTFQTwIAM9o0If6Hpy0AAAAASUVORK5CYII=";
const PNG = Buffer.from(PNG_BASE64, "base64");
/** A JPEG header renamed to .png: the MIME and the extension are not evidence. */
const FAKE_PNG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

const SPACE_LINK = /^http:\/\/localhost:4184\/\?space=[0-9a-f-]{36}$/;

interface Harness {
  readonly page: Page;
  readonly external: string[];
  readonly consoleMessages: string[];
}

async function open(page: Page, url: string = FIXTURE_URL): Promise<Harness> {
  const external: string[] = [];
  const consoleMessages: string[] = [];
  page.on("request", (request) => {
    // A `blob:` URL is the panel's own in-memory PNG, not a network request; only a real http(s)
    // request to another host would mean the page reached outside this machine.
    const url = new URL(request.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.hostname !== "localhost") external.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${String(error)}`));
  await page.goto(url);
  await expect(page.getByTestId("fixture-write-status")).toHaveText("unloaded");
  return { page, external, consoleMessages };
}

async function loadBaseline(page: Page): Promise<void> {
  await page.getByRole("button", { name: "편집 기준 불러오기" }).click();
  await expect(page.getByTestId("fixture-write-status")).toHaveText("ready-clean");
}

async function chooseSupported(page: Page): Promise<void> {
  await page.getByTestId("space-v2-frame-size").selectOption("a4");
  await page.getByTestId("space-v2-frame-template").selectOption("full");
  await page.getByTestId("space-v2-frame-color").selectOption("black");
}

async function attach(page: Page, bytes: Buffer, name = "proof.png"): Promise<void> {
  await page
    .getByTestId("space-v2-proof-file")
    .setInputFiles({ name, mimeType: "image/png", buffer: bytes });
}

async function prepareFrozenDraft(page: Page): Promise<void> {
  await loadBaseline(page);
  await chooseSupported(page);
  await attach(page, PNG);
  await expect(page.getByTestId("space-v2-preview-canvas")).toBeVisible();
  await page.getByTestId("space-v2-freeze").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("draft-ready");
}

const canvasBox = (page: Page): Locator => page.getByTestId("space-v2-preview-canvas");

test("nothing is prepared before the baseline is loaded", async ({ page }) => {
  const { external } = await open(page);
  await expect(page.getByTestId("space-v2-issue-panel")).toBeVisible();
  await expect(page.getByTestId("space-v2-issue-status")).toContainText(
    "편집 기준을 저장할 변경이 없는 상태로",
  );
  await expect(page.getByTestId("space-v2-freeze")).toBeDisabled();
  await expect(canvasBox(page)).toHaveCount(0);
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
  // No adapter and no writer were built just by opening the screen.
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  expect(external).toEqual([]);
});

test("explicit selections plus a PNG produce a real Canvas preview", async ({ page }) => {
  const { external } = await open(page);
  await loadBaseline(page);

  // No automatic first selection anywhere.
  await expect(page.getByTestId("space-v2-frame-size")).toHaveValue("");
  await expect(page.getByTestId("space-v2-frame-template")).toHaveValue("");
  await expect(page.getByTestId("space-v2-frame-color")).toHaveValue("");
  await expect(page.getByTestId("space-v2-issue-status")).toContainText("모두 선택하세요");

  await chooseSupported(page);
  await expect(page.getByTestId("space-v2-issue-status")).toContainText(
    "PNG 파일 한 개를 선택하세요",
  );
  await attach(page, PNG);

  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("space-v2-canvas-status")).toHaveText("미리보기가 준비되었습니다.");
  await expect(page.getByTestId("space-v2-issue-status")).toContainText(
    "시안을 고정할 수 있습니다",
  );

  // The canvas really has the frame's aspect, so the plan reached the executor.
  const box = await canvasBox(page).boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;
  expect(Math.round((box.height / box.width) * 100) / 100).toBeCloseTo(1.5, 1);
  expect(external).toEqual([]);
});

test("an unsupported combination is explained and issues nothing", async ({ page }) => {
  await open(page);
  await loadBaseline(page);
  await attach(page, PNG);

  await page.getByTestId("space-v2-frame-size").selectOption("a4");
  await page.getByTestId("space-v2-frame-color").selectOption("black");
  for (const templateId of ["clocked", "art"]) {
    await page.getByTestId("space-v2-frame-template").selectOption(templateId);
    await expect(page.getByTestId("space-v2-issue-status")).toContainText(
      "이 조합은 첫 시안 능력으로 발급할 수 없습니다",
    );
    await expect(canvasBox(page)).toHaveCount(0);
    await expect(page.getByTestId("space-v2-freeze")).toBeDisabled();
  }
  // A grain colour is never offered as an option in the first place.
  await expect(page.getByTestId("space-v2-frame-color").locator("option")).toHaveCount(2);
});

test("a file the browser cannot decode as a PNG fails closed", async ({ page }) => {
  await open(page);
  await loadBaseline(page);
  await chooseSupported(page);
  await attach(page, FAKE_PNG, "renamed.png");

  await expect(page.getByTestId("space-v2-issue-status")).toContainText(
    "이 이미지는 사용할 수 없습니다",
  );
  await expect(canvasBox(page)).toHaveCount(0);
  await expect(page.getByTestId("space-v2-freeze")).toBeDisabled();
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  // The picked file's name never reaches the DOM.
  expect(await page.content()).not.toContain("renamed.png");
});

test("a mismatched password issues nothing and needs a new draft", async ({ page }) => {
  await open(page);
  await prepareFrozenDraft(page);

  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-house");
  await expect(page.getByTestId("space-v2-issue")).toBeDisabled();
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");

  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await expect(page.getByTestId("space-v2-issue")).toBeEnabled();
});

test("a matching password issues exactly once and shows the confirmed link", async ({ page }) => {
  const { external, consoleMessages } = await open(page);
  await prepareFrozenDraft(page);

  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();

  await expect(page.getByTestId("fixture-issue-status")).toHaveText("success");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
  // The writer was built exactly once, and only now.
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("1");
  await expect(page.getByTestId("space-v2-issue-status")).toHaveText("발급이 완료됐습니다.");

  const link = await page.getByTestId("space-v2-link").textContent();
  expect(link ?? "").toMatch(SPACE_LINK);
  // Nothing was copied without a click, and the password is nowhere on the page.
  await expect(page.getByTestId("fixture-copy-calls")).toHaveText("0");
  const content = await page.content();
  expect(content).not.toContain("correct-horse");
  expect(content).not.toContain("rebuild-space-assets");

  await page.getByTestId("space-v2-copy-link").click();
  await expect(page.getByTestId("fixture-copy-calls")).toHaveText("1");
  await expect(page.getByTestId("fixture-copied")).toHaveText(link ?? "");
  await expect(page.getByTestId("space-v2-copy-status")).toHaveText("링크를 복사했습니다.");

  // The password form is gone, and a second issue is not offered.
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-issue")).toHaveCount(0);
  expect(external).toEqual([]);
  expect(consoleMessages).toEqual([]);
});

test("a definite failure offers a new draft, never a retry or a link", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "다음 발급 실패" }).click();
  await prepareFrozenDraft(page);

  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();

  await expect(page.getByTestId("fixture-issue-status")).toHaveText("error");
  await expect(page.getByTestId("space-v2-issue-status")).toContainText("새 시안을 준비하세요");
  await expect(page.getByTestId("space-v2-issue")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-link")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
  // No code, category or correlation id is shown.
  expect(await page.content()).not.toContain("SPACE_V2_ISSUE");

  await page.getByTestId("space-v2-new-draft").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("empty");
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
});

test("an unknown outcome is an alert with no link and no retry", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "다음 발급 결과 미확정" }).click();
  await prepareFrozenDraft(page);

  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();

  await expect(page.getByTestId("fixture-issue-status")).toHaveText("outcome-unknown");
  const status = page.getByTestId("space-v2-issue-status");
  await expect(status).toHaveAttribute("role", "alert");
  await expect(status).toContainText("같은 시안을 다시 발급하지 말고");
  await expect(page.getByTestId("space-v2-link")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-issue")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
});

test("a rapid double submit issues once", async ({ page }) => {
  await open(page);
  await prepareFrozenDraft(page);
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");

  // Three clicks in ONE task, before React can re-render and disable the button — the shape a real
  // impatient double click (or an Enter held down) takes.
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-testid="space-v2-issue"]');
    button?.click();
    button?.click();
    button?.click();
  });

  await expect(page.getByTestId("fixture-issue-status")).toHaveText("success");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
});

test("a baseline that moved on blocks the frozen draft until it is prepared again", async ({
  page,
}) => {
  await open(page);
  await prepareFrozenDraft(page);
  await expect(page.getByTestId("fixture-revision")).toHaveText("3");

  await page.getByRole("button", { name: "기준본 변경" }).click();
  await expect(page.getByTestId("fixture-revision")).toHaveText("4");

  const status = page.getByTestId("space-v2-issue-status");
  await expect(status).toHaveAttribute("role", "alert");
  await expect(status).toContainText("편집 기준이 바뀌었습니다");
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");

  await page.getByTestId("space-v2-new-draft").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("empty");
});

test("editing is locked while a draft is frozen and while an issue is in flight", async ({
  page,
}) => {
  await open(page);
  await prepareFrozenDraft(page);
  await expect(page.getByTestId("space-v2-frame-size")).toBeDisabled();
  await expect(page.getByTestId("space-v2-proof-file")).toBeDisabled();
  await expect(page.getByTestId("space-v2-scale")).toBeDisabled();
  await expect(page.getByTestId("space-v2-freeze")).toBeDisabled();

  await page.getByRole("button", { name: "다음 발급 지연" }).click();
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();

  await expect(page.getByTestId("fixture-issue-status")).toHaveText("issuing");
  await expect(page.getByTestId("space-v2-issue-status")).toHaveText("발급하는 중입니다.");
  await expect(page.getByTestId("space-v2-new-draft")).toBeDisabled();
  await expect(page.getByTestId("space-v2-issue")).toBeDisabled();
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
});

test("the transform controls change the preview and survive the freeze", async ({ page }) => {
  await open(page);
  await loadBaseline(page);
  await chooseSupported(page);
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();

  // Keyboard-operable: the scale slider takes focus and responds to arrow keys.
  await page.getByTestId("space-v2-scale").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("space-v2-scale")).toHaveValue("101");

  await page.getByTestId("space-v2-scale").fill("250");
  await page.getByTestId("space-v2-pan-x").fill("-40");
  await page.getByTestId("space-v2-rotate-right").click();
  await expect(canvasBox(page)).toBeVisible();

  await page.getByTestId("space-v2-freeze").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("draft-ready");
  // The frozen preview is still drawn, from the frozen generation.
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("space-v2-canvas-status")).toHaveText("미리보기가 준비되었습니다.");
});

// --- the copy attempt (spec 083 §7) ------------------------------------------

test("an explicit copy keeps the success and closes every failure shape safely", async ({
  page,
}) => {
  const { consoleMessages } = await open(page);
  await prepareFrozenDraft(page);
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("success");
  const link = await page.getByTestId("space-v2-link").textContent();
  expect(link ?? "").toMatch(SPACE_LINK);

  // 1. A port that throws SYNCHRONOUSLY. This is the production shape: `navigator.clipboard` is
  //    absent, so `write()` throws before any promise — and a rejection handler alone never sees it.
  await page.getByRole("button", { name: "복사 동기 예외" }).click();
  await page.getByTestId("space-v2-copy-link").click();
  await expect(page.getByTestId("space-v2-copy-status")).toHaveText(
    "링크를 복사하지 못했습니다. 주소를 직접 선택해 복사하세요.",
  );
  // The issued space still exists: the success, the status and the link are untouched.
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("success");
  await expect(page.getByTestId("space-v2-issue-status")).toHaveText("발급이 완료됐습니다.");
  await expect(page.getByTestId("space-v2-link")).toHaveText(link ?? "");
  await expect(page.getByTestId("fixture-copied")).toHaveText("");

  // 2. A port that rejects.
  await page.getByRole("button", { name: "복사 거부" }).click();
  await page.getByTestId("space-v2-copy-link").click();
  await expect(page.getByTestId("space-v2-copy-status")).toHaveText(
    "링크를 복사하지 못했습니다. 주소를 직접 선택해 복사하세요.",
  );
  await expect(page.getByTestId("fixture-copy-calls")).toHaveText("2");

  // 3. No clipboard port at all — nothing is called, and the same fixed copy is shown.
  await page.getByRole("button", { name: "복사 수단 없음" }).click();
  await page.getByTestId("space-v2-copy-link").click();
  await expect(page.getByTestId("space-v2-copy-status")).toHaveText(
    "링크를 복사하지 못했습니다. 주소를 직접 선택해 복사하세요.",
  );
  await expect(page.getByTestId("fixture-copy-calls")).toHaveText("2");

  // No failure escaped the click handler, and no reason was printed.
  expect(consoleMessages).toEqual([]);
  const content = await page.content();
  expect(content).not.toContain("writeText");
  expect(content).not.toContain("NotAllowedError");
});

// --- auth expiry, unmount and late completion (spec 083 §5, §6) --------------

test("an operator session that expires blocks the frozen draft before anything is spent", async ({
  page,
}) => {
  const { consoleMessages } = await open(page);
  await prepareFrozenDraft(page);

  // The real auth port publishes a real signed-out state; the C5 baseline goes with it.
  await page.getByRole("button", { name: "운영자 인증 만료" }).click();
  await expect(page.getByTestId("fixture-write-status")).toHaveText("auth-blocked");

  const status = page.getByTestId("space-v2-issue-status");
  await expect(status).toHaveAttribute("role", "alert");
  // The alert is the baseline-unavailable copy: without a session there is no baseline to prepare
  // a draft from, and no new wording is invented for it.
  await expect(status).toContainText("편집 기준을 저장할 변경이 없는 상태로");
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-issue")).toHaveCount(0);
  // Nothing was issued and no writer was ever built.
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");
  expect(consoleMessages).toEqual([]);
});

test("an expiry during an in-flight issue closes as a definite auth failure", async ({ page }) => {
  const { external, consoleMessages } = await open(page);
  await page.getByRole("button", { name: "다음 발급 지연" }).click();
  await prepareFrozenDraft(page);
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("issuing");
  await expect(page.getByTestId("fixture-pending-issues")).toHaveText("1");

  await page.getByRole("button", { name: "운영자 인증 만료" }).click();
  await expect(page.getByTestId("fixture-write-status")).toHaveText("auth-blocked");
  // Still exactly one attempt: an expiry is not a reason to try again.
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");

  // The writer answers LATE, and applies the same operator gate the real write port applies.
  await page.getByRole("button", { name: "지연 발급 완료" }).click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("error");
  await expect(page.getByTestId("space-v2-issue-status")).toHaveText(
    "운영자 인증이 필요합니다. 다시 로그인한 뒤 새 시안을 준비하세요.",
  );
  await expect(page.getByTestId("space-v2-link")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-issue")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
  expect(await page.content()).not.toContain("SPACE_V2_ISSUE");
  expect(external).toEqual([]);
  expect(consoleMessages).toEqual([]);
});

test("an unmount mid-issue releases everything and a late completion changes nothing", async ({
  page,
}) => {
  const { consoleMessages } = await open(page);
  await page.getByRole("button", { name: "다음 발급 지연" }).click();
  await prepareFrozenDraft(page);
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:0");
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("issuing");

  // What the production shell does when the whole screen goes away while an issue is in flight.
  await page.getByRole("button", { name: "패널 내리고 세션 정리" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("disposed");
  // The proof owner released its object URL, and no subscription is left behind.
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:1");
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("0");

  await page.getByRole("button", { name: "지연 발급 완료" }).click();
  await expect(page.getByTestId("fixture-pending-issues")).toHaveText("0");
  // The late result reached a disposed session: no second write, no revived state.
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("disposed");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");

  // Bringing the screen back must not show the abandoned attempt as anything at all.
  await page.getByRole("button", { name: "패널 올리기" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toBeVisible();
  await expect(page.getByTestId("space-v2-link")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-password")).toHaveCount(0);
  await expect(page.getByTestId("space-v2-preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
  expect(consoleMessages).toEqual([]);
});

test("a mount, unmount and mount again leaves no duplicate URL, listener or issue", async ({
  page,
}) => {
  // This bundle is a production build, where StrictMode does not double-invoke effects, so the
  // cleanup boundary StrictMode exercises in development is performed explicitly here.
  const { consoleMessages } = await open(page);
  await loadBaseline(page);
  const listeners = await page.getByTestId("fixture-panel-listeners").textContent();
  expect(Number(listeners)).toBeGreaterThan(0);

  await chooseSupported(page);
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:0");

  await page.getByRole("button", { name: "패널 내리기" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toHaveCount(0);
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:1");
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("0");

  await page.getByRole("button", { name: "패널 올리기" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toBeVisible();
  // Exactly the same number of subscriptions as the first mount — none doubled, none orphaned.
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText(listeners ?? "");
  // The remounted panel starts empty and, crucially, its proof owner is ALIVE: a second PNG
  // decodes and draws, which a disposed owner could never do.
  await expect(canvasBox(page)).toHaveCount(0);
  await chooseSupported(page);
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("2:1");

  await page.getByRole("button", { name: "패널 내리기" }).click();
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("2:2");
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("0");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  expect(consoleMessages).toEqual([]);
});

// --- development StrictMode (spec 083 보완 라운드 2) --------------------------

test("development StrictMode replays the effects and leaves live owners behind", async ({
  page,
}) => {
  const { external, consoleMessages } = await open(page, DEV_FIXTURE_URL);

  // The page IS React's development build performing the replay. Without this the rest of the test
  // could pass on a production bundle, where StrictMode is inert and proves nothing.
  await expect(page.getByTestId("fixture-effect-setups")).toHaveText("2");
  // The composition its own cleanup disposed left no live auth observer behind.
  // attached : detached : live. ONE composition exists for the whole mount, so its auth observer
  // is attached once and is the only live one — the replay added no duplicate and orphaned none.
  await expect(page.getByTestId("fixture-auth-observers")).toHaveText("1:0:1");
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("2");

  // A disposed write controller ignores loadBaseline forever, so reaching ready-clean is what
  // proves the composition published after the replay is LIVE.
  await loadBaseline(page);
  await chooseSupported(page);

  // A disposed proof owner ignores load() forever: a real decode and a real Canvas prove the
  // replacement owner is live too.
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("space-v2-canvas-status")).toHaveText("미리보기가 준비되었습니다.");
  // Exactly one object URL for one PNG — the discarded record made none.
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:0");

  // The whole issue path still works, exactly once, through the replaced composition.
  await page.getByTestId("space-v2-freeze").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("draft-ready");
  await page.getByTestId("space-v2-password").fill("correct-horse");
  await page.getByTestId("space-v2-password-confirm").fill("correct-horse");
  await page.getByTestId("space-v2-issue").click();
  await expect(page.getByTestId("fixture-issue-status")).toHaveText("success");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("1");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("1");
  expect((await page.getByTestId("space-v2-link").textContent()) ?? "").toMatch(SPACE_LINK);
  await expect(page.getByTestId("fixture-auth-observers")).toHaveText("1:0:1");

  expect(external).toEqual([]);
  expect(consoleMessages).toEqual([]);
});

test("development StrictMode still releases everything when the panel goes away", async ({
  page,
}) => {
  const { consoleMessages } = await open(page, DEV_FIXTURE_URL);
  await expect(page.getByTestId("fixture-effect-setups")).toHaveText("2");
  await loadBaseline(page);
  await chooseSupported(page);
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:0");

  await page.getByRole("button", { name: "패널 내리기" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toHaveCount(0);
  // The record that owns the live owner disposes exactly it — one URL created, one revoked.
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("1:1");
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("0");

  await page.getByRole("button", { name: "패널 올리기" }).click();
  await expect(page.getByTestId("space-v2-issue-panel")).toBeVisible();
  await expect(page.getByTestId("fixture-panel-listeners")).toHaveText("2");
  await chooseSupported(page);
  await attach(page, PNG);
  await expect(canvasBox(page)).toBeVisible();
  await expect(page.getByTestId("fixture-object-urls")).toHaveText("2:1");
  await expect(page.getByTestId("fixture-issue-calls")).toHaveText("0");
  expect(consoleMessages).toEqual([]);
});

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`layout, targets and axe at ${viewport.name}`, async ({ page }) => {
    const { consoleMessages } = await open(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await prepareFrozenDraft(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    for (const id of [
      "space-v2-frame-size",
      "space-v2-frame-template",
      "space-v2-frame-color",
      "space-v2-proof-file",
      "space-v2-password",
      "space-v2-password-confirm",
      "space-v2-issue",
      "space-v2-new-draft",
    ]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, id).not.toBeNull();
      if (box !== null) expect(box.height, id).toBeGreaterThanOrEqual(43.5);
    }

    // The label/error wiring is real, not colour-only.
    await page.getByTestId("space-v2-password").fill("a");
    await page.getByTestId("space-v2-password-confirm").fill("b");
    await expect(page.getByText("두 비밀번호가 서로 다릅니다.")).toBeVisible();

    await page.getByTestId("space-v2-frame-size").focus();
    const focus = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (element === null) return null;
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focus?.outlineStyle).not.toBe("none");

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious.map((violation) => violation.id)).toEqual([]);
    expect(consoleMessages).toEqual([]);
  });
}

test("visual evidence for the spec 083 results folder", async ({ page }) => {
  const shots = [
    { name: "issue-desktop-1280x800", width: 1280, height: 800 },
    { name: "issue-mobile-390x844", width: 390, height: 844 },
  ] as const;
  for (const shot of shots) {
    await open(page);
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await prepareFrozenDraft(page);
    await page.screenshot({
      path: `docs/rebuild/results/spec-083/${shot.name}.png`,
      fullPage: true,
    });
  }
});
