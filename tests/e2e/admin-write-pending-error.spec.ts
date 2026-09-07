import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

const ROOT = "docs/rebuild/results/spec-093";
const BASE_URL = `http://localhost:${ADMIN_PORT}/e2e-admin-write-fixture.html`;
const URL = `${BASE_URL}?audit=spec093`;
const CARD = '.denn-card:has([data-testid="frame-print-size-editor"])';
const PROVENANCE = "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE";
const SIZES = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];
const STATES = [
  "loading",
  "saving",
  "load-error",
  "upload-failed",
  "head-failed",
  "auth-blocked",
] as const;
type State = (typeof STATES)[number];
const MESSAGES = {
  loading: "편집 기준을 불러오는 중입니다.",
  saving: "변경을 저장하는 중입니다.",
  "load-error": "편집 기준을 불러오지 못했습니다.",
  "upload-failed": "저장하지 못했습니다. 상태를 확인한 뒤 명시적으로 다시 시도하세요.",
  "head-failed": "저장하지 못했습니다. 상태를 확인한 뒤 명시적으로 다시 시도하세요.",
  "auth-blocked": "운영자 로그인이 필요합니다.",
};
const records: Record<string, unknown> = {};
const rows: string[] = [];
test.use({ launchOptions: { args: ["--disable-partial-raster"] } });

const click = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
const status = (page: Page, value: string) =>
  expect(page.getByTestId("fixture-status")).toHaveText(value);
async function diagnostics(page: Page) {
  const result: Record<string, string> = {};
  for (const key of [
    "status",
    "revision",
    "write-factory-calls",
    "save-calls",
    "expected-base",
    "load-calls",
    "load-completed",
    "save-completed",
    "remote-revision",
    "pending-load",
    "pending-save",
  ]) {
    result[key] = await page.getByTestId(`fixture-${key}`).innerText();
  }
  return result;
}

async function open(page: Page) {
  const noise = { errors: 0, warnings: 0, pageErrors: 0, externalAttempts: 0 };
  page.on("console", (message) => {
    if (message.type() === "error") noise.errors++;
    if (message.type() === "warning") noise.warnings++;
  });
  page.on("pageerror", () => noise.pageErrors++);
  await page.route("**/*", async (route) => {
    if (route.request().url().startsWith(`http://localhost:${ADMIN_PORT}/`)) await route.continue();
    else {
      noise.externalAttempts++;
      await route.abort();
    }
  });
  await page.goto(URL);
  await status(page, "unloaded");
  await expect(page.getByTestId("fixture-extended-audit")).toHaveCount(1);
  expect(await diagnostics(page)).toMatchObject({
    "write-factory-calls": "0",
    "save-calls": "0",
    "load-calls": "0",
  });
  return noise;
}

async function edit(page: Page) {
  await click(page, "편집 기준 불러오기");
  await status(page, "ready-clean");
  await page.getByTestId("frame-print-size-id").selectOption("a4");
  await expect(page.getByTestId("frame-print-size-width")).toHaveValue("21");
  await expect(page.getByTestId("frame-print-size-height")).toHaveValue("29.7");
  await page.getByTestId("frame-print-size-width").fill("22");
  await page.getByTestId("frame-print-size-height").fill("30");
  await status(page, "ready-dirty-valid");
}

async function prepare(page: Page, state: State) {
  if (state === "loading" || state === "load-error") {
    await click(page, state === "loading" ? "읽기 보류 모드" : "읽기 실패 모드");
    await click(page, "편집 기준 불러오기");
  } else {
    await edit(page);
    if (state === "auth-blocked") await click(page, "합성 인증 만료");
    else {
      await click(
        page,
        state === "saving"
          ? "저장 보류 모드"
          : state === "upload-failed"
            ? "업로드 실패 모드"
            : "head 실패 모드",
      );
      await click(page, "변경 저장");
    }
  }
  const isSave = ["saving", "upload-failed", "head-failed"].includes(state);
  await status(page, state.endsWith("failed") ? "save-error" : state);
  await expect(page.getByTestId("frame-print-size-status")).toHaveText(MESSAGES[state]);
  const snapshot = await diagnostics(page);
  expect(snapshot).toMatchObject({
    revision: isSave ? "3" : "none",
    "write-factory-calls": "1",
    "load-calls": "1",
    "save-calls": isSave ? "1" : "0",
    "expected-base": isSave ? "3" : "none",
    "load-completed": state === "loading" ? "0" : "1",
    "save-completed": state.endsWith("failed") ? "1" : "0",
    "remote-revision": "3",
    "pending-load": String(state === "loading"),
    "pending-save": String(state === "saving"),
  });
  for (const field of ["id", "width", "height"])
    await expect(page.getByTestId(`frame-print-size-${field}`)).toBeDisabled();
  await expect(page.getByRole("button", { name: "편집 기준 불러오기", exact: true })).toBeEnabled({
    enabled: ["load-error", "upload-failed", "head-failed"].includes(state),
  });
  await expect(page.getByRole("button", { name: "변경 저장", exact: true })).toBeEnabled({
    enabled: state === "upload-failed",
  });
  return snapshot;
}

async function resetFocus(page: Page) {
  await page.evaluate(() => {
    const prior = document.body.getAttribute("tabindex");
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    if (prior === null) document.body.removeAttribute("tabindex");
    else document.body.setAttribute("tabindex", prior);
  });
}

async function keyboard(page: Page) {
  await resetFocus(page);
  const stops = [];
  const seen = new Set<number>();
  let completedCycle = false;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const value = await page.evaluate((selector) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active === document.body) return null;
      const all = [...document.querySelectorAll("button,input,select,a[href],[tabindex]")];
      const inProduct = document.querySelector(selector)?.contains(active) === true;
      const box = active.getBoundingClientRect(),
        style = getComputedStyle(active);
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        domIndex: all.indexOf(active),
        inProduct,
        label: inProduct
          ? active.getAttribute("data-testid") || active.textContent?.trim() || active.tagName
          : "FIXTURE_CONTROL_ONLY",
        focusVisible: active.matches(":focus-visible"),
        outline: style.outline,
        boxShadow: style.boxShadow,
        indicator:
          (Number.parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none") ||
          style.boxShadow !== "none",
        centerUnoccluded: hit === active || (hit !== null && active.contains(hit)),
      };
    }, CARD);
    if (!value) continue;
    if (seen.has(value.domIndex)) {
      completedCycle = true;
      break;
    }
    seen.add(value.domIndex);
    stops.push(value);
  }
  return { completedCycle, stops };
}

async function recover(page: Page, state: State) {
  if (state === "loading") await click(page, "보류 읽기 완료");
  if (state === "saving") await click(page, "보류 저장 완료");
  if (state === "load-error") {
    await click(page, "읽기 성공 모드");
    await click(page, "편집 기준 불러오기");
  }
  if (state === "upload-failed") {
    await click(page, "다음 저장 성공");
    await click(page, "변경 저장");
  }
  if (state === "head-failed") {
    await click(page, "편집 기준 불러오기");
    await status(page, "discard-confirmation");
    await expect(page.getByTestId("fixture-load-calls")).toHaveText("1");
    await click(page, "초안 폐기하고 다시 불러오기");
  }
  await status(page, state === "auth-blocked" ? "auth-blocked" : "ready-clean");
  const result = await diagnostics(page);
  const committed = state === "saving" || state === "upload-failed";
  expect(result).toMatchObject({
    revision: state === "auth-blocked" ? "none" : committed ? "4" : "3",
    "remote-revision": committed ? "4" : "3",
    "write-factory-calls": "1",
    "pending-load": "false",
    "pending-save": "false",
    "load-calls": state === "load-error" || state === "head-failed" ? "2" : "1",
    "load-completed": state === "load-error" || state === "head-failed" ? "2" : "1",
    "save-calls":
      state === "upload-failed" ? "2" : state === "saving" || state === "head-failed" ? "1" : "0",
    "save-completed":
      state === "upload-failed" ? "2" : state === "saving" || state === "head-failed" ? "1" : "0",
  });
  return result;
}

for (const viewport of SIZES)
  for (const state of STATES) {
    const key = `c5-${state}-${viewport.width}x${viewport.height}`;
    test(`spec093 ${key}: pending/error visual evidence and explicit recovery`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const noise = await open(page);
      const before = await prepare(page, state);
      const card = page.locator(CARD);
      await expect(card).toHaveCount(1);
      await expect(card.getByTestId("frame-print-size-editor")).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const animation of document.getAnimations()) animation.finish();
      });
      await resetFocus(page);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      const exclusions = [];
      for (const locator of [
        page.locator("h1"),
        page.getByRole("region", { name: "합성 fixture 진단" }),
        page.locator(".denn-card").filter({ hasNot: page.getByTestId("frame-print-size-editor") }),
      ]) {
        await expect(locator).toHaveCount(1);
        const other = await locator.boundingBox();
        expect(other).not.toBeNull();
        if (box && other) {
          const overlap =
            box.x < other.x + other.width &&
            box.x + box.width > other.x &&
            box.y < other.y + other.height &&
            box.y + box.height > other.y;
          expect(overlap).toBe(false);
          exclusions.push({ box: other, overlap });
        }
      }
      const geometry = await card.evaluate((root) => {
        const all = [...document.querySelectorAll("button,input,select,a[href],[tabindex]")];
        return {
          documentOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cardOverflow: root.scrollWidth - root.clientWidth,
          controls: [...root.querySelectorAll<HTMLInputElement>("button,input,select")].map(
            (node) => ({
              label: node.getAttribute("data-testid") || node.textContent?.trim() || node.tagName,
              domIndex: all.indexOf(node),
              disabled: node.disabled,
              box: node.getBoundingClientRect().toJSON(),
            }),
          ),
        };
      });
      const exposed = await card.evaluate((root) =>
        [
          (root as HTMLElement).innerText,
          ...[root, ...root.querySelectorAll("*")].flatMap((node) =>
            [...node.attributes]
              .filter((a) => a.name.startsWith("aria-") || a.name.startsWith("data-"))
              .map((a) => a.value),
          ),
        ].join("\n"),
      );
      expect(exposed).not.toMatch(
        /WRITE_|NETWORK_UNAVAILABLE|synthetic|abcdef0123456789|fixture|https?:\/\//i,
      );
      mkdirSync(ROOT, { recursive: true });
      const bytes = await card.screenshot({ path: `${ROOT}/${key}.png`, animations: "disabled" });
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const walk = await keyboard(page);
      const enabled = geometry.controls.filter((c) => !c.disabled);
      const smallTargets = enabled.filter((c) => c.box.width < 44 || c.box.height < 44);
      const productStops = walk.stops.filter((s) => s.inProduct);
      const keyboardOrder =
        JSON.stringify(productStops.map((s) => s.domIndex)) ===
        JSON.stringify(enabled.map((c) => c.domIndex));
      const focusFindings = productStops.filter(
        (s) => !s.focusVisible || !s.indicator || !s.centerUnoccluded,
      );
      const axe = await new AxeBuilder({ page }).include(CARD).analyze();
      const axeSeriousCritical = axe.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
      const findings = [
        ...(geometry.documentOverflow > 0 || geometry.cardOverflow > 0
          ? ["horizontal-overflow"]
          : []),
        ...(smallTargets.length ? ["enabled-target-under-44px"] : []),
        ...(!walk.completedCycle || !keyboardOrder ? ["keyboard-coverage-or-order"] : []),
        ...(focusFindings.length ? ["focus-indicator-or-occlusion"] : []),
        ...(axeSeriousCritical.length ? ["axe-serious-critical"] : []),
      ];
      const after = await diagnostics(page);
      expect(after).toEqual(before);
      const recovered = await recover(page, state);
      expect(noise).toEqual({ errors: 0, warnings: 0, pageErrors: 0, externalAttempts: 0 });
      records[key] = {
        state,
        viewport,
        provenance: PROVENANCE,
        url: URL,
        selector: CARD,
        message: MESSAGES[state],
        preparation: state,
        box,
        exclusions,
        geometry,
        keyboard: walk,
        keyboardOrder,
        smallTargets,
        focusFindings,
        axeSeriousCritical,
        noise,
        before,
        after,
        recovered,
        findings,
        png: {
          file: `${key}.png`,
          width: bytes.readUInt32BE(16),
          height: bytes.readUInt32BE(20),
          sha256,
        },
        measuredVerdict: findings.length ? "FINDING" : "PASS",
        visualReview: "SEE AUDIT REPORT",
      };
      rows.push(
        `| ${key}.png | ${state} | ${viewport.width}x${viewport.height} | ${PROVENANCE} | ${URL} | ${CARD} | ${sha256} | ${findings.length ? "FINDING" : "PASS"} / visual: report |`,
      );
    });
  }

for (const operation of ["load", "save"] as const) {
  test(`spec093 late ${operation} completes after auth loss without reviving the local baseline`, async ({
    page,
  }) => {
    const noise = await open(page);
    if (operation === "save") await edit(page);
    await click(page, operation === "load" ? "읽기 보류 모드" : "저장 보류 모드");
    await click(page, operation === "load" ? "편집 기준 불러오기" : "변경 저장");
    await status(page, operation === "load" ? "loading" : "saving");
    await click(page, "합성 인증 만료");
    await status(page, "auth-blocked");
    await click(page, operation === "load" ? "보류 읽기 완료" : "보류 저장 완료");
    await expect(page.getByTestId(`fixture-${operation}-completed`)).toHaveText("1");
    expect(await diagnostics(page)).toMatchObject({
      status: "auth-blocked",
      revision: "none",
      "load-calls": "1",
      "save-calls": operation === "save" ? "1" : "0",
      "remote-revision": operation === "save" ? "4" : "3",
      "pending-load": "false",
      "pending-save": "false",
    });
    for (const name of ["편집 기준 불러오기", "변경 저장"])
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    // Default URL must retain the old fixture surface after a fresh navigation.
    await page.goto(BASE_URL);
    await status(page, "unloaded");
    await expect(page.getByTestId("fixture-extended-audit")).toHaveCount(0);
    await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");
    expect(noise).toEqual({ errors: 0, warnings: 0, pageErrors: 0, externalAttempts: 0 });
  });
}

test("spec093 manifest: eighteen current records with exact PNG hashes", () => {
  const keys = SIZES.flatMap((v) => STATES.map((s) => `c5-${s}-${v.width}x${v.height}`));
  expect(Object.keys(records).sort()).toEqual([...keys].sort());
  expect(
    readdirSync(ROOT)
      .filter((f) => f.endsWith(".png"))
      .sort(),
  ).toEqual(keys.map((k) => `${k}.png`).sort());
  for (const key of keys)
    expect(
      createHash("sha256")
        .update(readFileSync(`${ROOT}/${key}.png`))
        .digest("hex"),
    ).toBe((records[key] as { png: { sha256: string } }).png.sha256);
  writeFileSync(`${ROOT}/measurements.json`, `${JSON.stringify(records, null, 2)}\n`);
  writeFileSync(
    `${ROOT}/README.md`,
    [
      "# Spec 093 — C5 진행·오류 합성 증거",
      "",
      "6상태 × 3viewport =18PNG. 실제 서비스·실기기·스크린리더 실낭독 NOT TESTED. 측정 PASS는 제품/운영 승인 아님.",
      "준비 및 명시 복구: [093 계약](../../specs/093-admin-c5-pending-error-audit.md).",
      "시각 판정: [감사 보고서](../../../codex-claude-handoff/reviews/2026-09-07-spec-093-admin-c5-pending-error-audit.md).",
      "",
      "| PNG | State/preparation (contract) | Viewport | Provenance | URL | Selector | SHA-256 | Verdict |",
      "|---|---|---|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n"),
  );
  expect(Object.keys(JSON.parse(readFileSync(`${ROOT}/measurements.json`, "utf8"))).sort()).toEqual(
    [...keys].sort(),
  );
  expect(
    readFileSync(`${ROOT}/README.md`, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("| c5-")).length,
  ).toBe(18);
});
