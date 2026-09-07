import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Spec 092: evidence collection, not a product change or a server atomicity test.
// Functional/provenance failures fail the gate. Visual defects remain measured findings.
const ROOT = "docs/rebuild/results/spec-092";
const URL = `http://localhost:${ADMIN_PORT}/e2e-admin-write-fixture.html`;
const CARD = '.denn-card:has([data-testid="frame-print-size-editor"])';
const PROVENANCE = "PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE";
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;
const STATES = [
  { slug: "dirty-valid", status: "ready-dirty-valid", message: "저장할 수 있는 변경입니다." },
  {
    slug: "dirty-invalid",
    status: "ready-dirty-invalid",
    message: "폭과 높이를 올바르게 입력하세요.",
  },
  {
    slug: "conflict",
    status: "conflict",
    message: "다른 저장이 먼저 반영됐습니다. 최신 상태를 다시 불러오세요.",
  },
  {
    slug: "outcome-unknown",
    status: "outcome-unknown",
    message: "저장 결과를 확인할 수 없습니다. 최신 상태를 다시 불러오세요.",
  },
  {
    slug: "discard-confirmation",
    status: "discard-confirmation",
    message: "현재 초안을 폐기해야 다시 불러올 수 있습니다.",
  },
] as const;
type Scenario = (typeof STATES)[number];
const records: Record<string, unknown> = {};
const rows: string[] = [];

test.use({ launchOptions: { args: ["--disable-partial-raster"] } });

async function counters(page: Page) {
  return {
    status: await page.getByTestId("fixture-status").innerText(),
    revision: await page.getByTestId("fixture-revision").innerText(),
    factory: await page.getByTestId("fixture-write-factory-calls").innerText(),
    saves: await page.getByTestId("fixture-save-calls").innerText(),
    expectedBase: await page.getByTestId("fixture-expected-base").innerText(),
  };
}

async function bodyFocus(page: Page) {
  await page.evaluate(() => {
    const prior = document.body.getAttribute("tabindex");
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    if (prior === null) document.body.removeAttribute("tabindex");
    else document.body.setAttribute("tabindex", prior);
  });
}

async function prepare(page: Page, scenario: Scenario) {
  await page.goto(URL);
  await expect(page.getByTestId("fixture-status")).toHaveText("unloaded");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");
  await expect(page.getByTestId("fixture-save-calls")).toHaveText("0");
  await page.getByRole("button", { name: "편집 기준 불러오기", exact: true }).click();
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
  await expect(page.getByTestId("fixture-revision")).toHaveText("3");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("1");
  await page.getByTestId("frame-print-size-id").selectOption("a4");
  await expect(page.getByTestId("frame-print-size-width")).toHaveValue("21");
  await expect(page.getByTestId("frame-print-size-height")).toHaveValue("29.7");
  const saving = !scenario.slug.startsWith("dirty-");
  if (saving) {
    await page
      .getByRole("button", {
        name: scenario.slug === "outcome-unknown" ? "다음 저장 결과 미확정" : "다음 저장 충돌",
        exact: true,
      })
      .click();
  }
  await page.getByTestId("frame-print-size-width").fill("22");
  await page
    .getByTestId("frame-print-size-height")
    .fill(scenario.slug === "dirty-invalid" ? "" : "30");
  if (saving) await page.getByRole("button", { name: "변경 저장", exact: true }).click();
  if (scenario.slug === "discard-confirmation") {
    await expect(page.getByTestId("fixture-status")).toHaveText("conflict");
    await page.getByRole("button", { name: "편집 기준 불러오기", exact: true }).click();
  }
  await expect(page.getByTestId("fixture-status")).toHaveText(scenario.status);
  await expect(page.getByTestId("frame-print-size-status")).toHaveText(scenario.message);
  expect(await counters(page)).toEqual({
    status: scenario.status,
    revision: "3",
    factory: "1",
    saves: saving ? "1" : "0",
    expectedBase: saving ? "3" : "none",
  });
  for (const id of ["id", "width", "height"]) {
    await expect(page.getByTestId(`frame-print-size-${id}`)).toBeEnabled({ enabled: !saving });
  }
  await expect(page.getByRole("button", { name: "변경 저장", exact: true })).toBeEnabled({
    enabled: scenario.slug === "dirty-valid",
  });
  await expect(page.getByRole("button", { name: "편집 기준 불러오기", exact: true })).toBeEnabled({
    enabled: scenario.slug !== "discard-confirmation",
  });
  if (scenario.slug === "discard-confirmation") {
    await expect(page.getByRole("button", { name: "초안 폐기하고 다시 불러오기" })).toBeEnabled();
  }
  return `명시 load → a4 선택 → 폭22/높이${scenario.slug === "dirty-invalid" ? "빈 값" : "30"}${saving ? ` → ${scenario.slug === "outcome-unknown" ? "미확정" : "충돌"} 모드 save1` : " → save0"}${scenario.slug === "discard-confirmation" ? " → 명시 reload → 폐기 확인(클릭 전)" : ""}`;
}

async function keyboardWalk(page: Page) {
  await bodyFocus(page);
  const stops = [];
  const seen = new Set<number>();
  let completedCycle = false;
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate((selector) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active === document.body) return null;
      const all = [...document.querySelectorAll("button, input, select, a[href], [tabindex]")];
      const card = document.querySelector(selector);
      const inProduct = card?.contains(active) === true;
      const style = getComputedStyle(active);
      const box = active.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        domIndex: all.indexOf(active),
        inProduct,
        label: inProduct
          ? active.getAttribute("data-testid") || active.textContent?.trim() || active.tagName
          : "FIXTURE_CONTROL_ONLY",
        focusVisible: active.matches(":focus-visible"),
        outline: style.outline,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
        centerUnoccluded: hit === active || (hit !== null && active.contains(hit)),
      };
    }, CARD);
    if (stop === null) continue;
    if (seen.has(stop.domIndex)) {
      completedCycle = true;
      break;
    }
    seen.add(stop.domIndex);
    stops.push(stop);
  }
  return { completedCycle, stops };
}

for (const viewport of VIEWPORTS) {
  for (const scenario of STATES) {
    const key = `c5-${scenario.slug}-${viewport.width}x${viewport.height}`;
    test(`spec092 ${key}: collect product Card evidence without real writes`, async ({ page }) => {
      const noise = { errors: 0, warnings: 0, pageErrors: 0, externalAttempts: 0 };
      page.on("console", (message) => {
        if (message.type() === "error") noise.errors++;
        if (message.type() === "warning") noise.warnings++;
      });
      page.on("pageerror", () => noise.pageErrors++);
      await page.route("**/*", async (route) => {
        if (route.request().url().startsWith(`http://localhost:${ADMIN_PORT}/`)) {
          await route.continue();
        } else {
          noise.externalAttempts++;
          await route.abort();
        }
      });
      await page.setViewportSize(viewport);
      const preparation = await prepare(page, scenario);
      const before = await counters(page);
      const card = page.locator(CARD);
      await expect(card).toHaveCount(1);
      await expect(card.getByTestId("frame-print-size-editor")).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const animation of document.getAnimations()) animation.finish();
      });
      await bodyFocus(page);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      const exclusions = [];
      for (const locator of [
        page.locator("h1"),
        page.getByRole("region", { name: "합성 fixture 진단" }),
        page.locator(".denn-card").filter({ hasNot: page.getByTestId("frame-print-size-editor") }),
      ]) {
        for (const node of await locator.all()) {
          const other = await node.boundingBox();
          expect(other).not.toBeNull();
          if (box && other) {
            const overlaps =
              box.x < other.x + other.width &&
              box.x + box.width > other.x &&
              box.y < other.y + other.height &&
              box.y + box.height > other.y;
            expect(overlaps, "fixture/auth/title must not enter the product crop").toBe(false);
            exclusions.push({ box: other, overlaps });
          }
        }
      }
      const geometry = await card.evaluate((root) => {
        const all = [...document.querySelectorAll("button, input, select, a[href], [tabindex]")];
        const controls = [...root.querySelectorAll<HTMLInputElement>("button, input, select")].map(
          (node) => ({
            label: node.getAttribute("data-testid") || node.textContent?.trim() || node.tagName,
            domIndex: all.indexOf(node),
            disabled: node.disabled,
            box: node.getBoundingClientRect().toJSON(),
          }),
        );
        return {
          documentOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cardOverflow: root.scrollWidth - root.clientWidth,
          controls,
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
        /WRITE_|synthetic|demo-synthetic|rebuild-admin-state|rebuildAdminState|fixture|abcdef0123456789|https?:\/\//i,
      );
      mkdirSync(ROOT, { recursive: true });
      const bytes = await card.screenshot({ path: `${ROOT}/${key}.png`, animations: "disabled" });
      const hash = createHash("sha256").update(bytes).digest("hex");
      const keyboard = await keyboardWalk(page);
      const productStops = keyboard.stops.filter((stop) => stop.inProduct);
      const expectedStops = geometry.controls
        .filter((control) => !control.disabled)
        .map((c) => c.domIndex);
      const keyboardOrder =
        JSON.stringify(productStops.map((s) => s.domIndex)) === JSON.stringify(expectedStops);
      const axe = await new AxeBuilder({ page }).include(CARD).analyze();
      const axeSeriousCritical = axe.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
      const smallTargets = geometry.controls.filter(
        (c) => !c.disabled && (c.box.width < 44 || c.box.height < 44),
      );
      const focusFindings = productStops.filter(
        (s) =>
          !s.focusVisible ||
          !s.centerUnoccluded ||
          !((s.outlineWidth > 0 && s.outlineStyle !== "none") || s.boxShadow !== "none"),
      );
      const findings = [
        ...(geometry.documentOverflow > 0 || geometry.cardOverflow > 0
          ? ["horizontal-overflow"]
          : []),
        ...(smallTargets.length ? ["enabled-target-under-44px"] : []),
        ...(!keyboard.completedCycle || !keyboardOrder ? ["keyboard-coverage-or-order"] : []),
        ...(focusFindings.length ? ["focus-indicator-or-occlusion"] : []),
        ...(axeSeriousCritical.length ? ["axe-serious-critical"] : []),
      ];
      const after = await counters(page);
      expect(after).toEqual(before);
      let recovery = "NOT APPLICABLE";
      if (scenario.slug === "discard-confirmation") {
        await page.getByRole("button", { name: "초안 폐기하고 다시 불러오기" }).click();
        await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
        expect(await counters(page)).toEqual({ ...before, status: "ready-clean" });
        recovery = "explicit discard/reload: ready-clean, revision3, save1";
      }
      expect(noise).toEqual({ errors: 0, warnings: 0, pageErrors: 0, externalAttempts: 0 });
      const measuredVerdict = findings.length ? "FINDING" : "PASS";
      records[key] = {
        file: `${key}.png`,
        state: scenario.status,
        viewport,
        provenance: PROVENANCE,
        url: URL,
        selector: CARD,
        preparation,
        box,
        exclusions,
        geometry,
        png: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: hash },
        keyboard,
        keyboardOrder,
        smallTargets,
        focusFindings,
        axeSeriousCritical,
        noise,
        before,
        after,
        recovery,
        findings,
        measuredVerdict,
        visualReview: "SEE AUDIT REPORT",
      };
      rows.push(
        `| ${key}.png | ${scenario.status} | ${viewport.width}x${viewport.height} | ${PROVENANCE} | ${URL} | ${preparation} | ${CARD} | ${hash} | ${measuredVerdict}; visual: see report |`,
      );
    });
  }
}

test("spec092 evidence manifest: exactly fifteen fresh records and matching PNG hashes", () => {
  const keys = VIEWPORTS.flatMap((v) => STATES.map((s) => `c5-${s.slug}-${v.width}x${v.height}`));
  expect(Object.keys(records).sort()).toEqual([...keys].sort());
  expect(
    readdirSync(ROOT)
      .filter((name) => name.endsWith(".png"))
      .sort(),
  ).toEqual(keys.map((key) => `${key}.png`).sort());
  for (const key of keys) {
    const record = records[key] as { png: { sha256: string } };
    expect(
      createHash("sha256")
        .update(readFileSync(`${ROOT}/${key}.png`))
        .digest("hex"),
    ).toBe(record.png.sha256);
  }
  writeFileSync(`${ROOT}/measurements.json`, `${JSON.stringify(records, null, 2)}\n`);
  writeFileSync(
    `${ROOT}/README.md`,
    [
      "# Spec 092 — C5 실패 상태 감사 증거",
      "",
      "Generated by tests/e2e/admin-write-failure-visual.spec.ts. 5 states × 3 viewports = 15 PNGs.",
      "측정 PASS는 시각 승인/실제 Firebase/서버 원자성 증명이 아니다. 실기기·실제 인증/쓰기/복구·스크린리더 실낭독 NOT TESTED.",
      "시각 판정: [감사 보고서](../../../codex-claude-handoff/reviews/2026-09-07-spec-092-admin-c5-failure-state-visual-audit.md).",
      "",
      "| PNG | State | Viewport | Provenance | Local URL | Preparation | Product selector | SHA-256 | Verdict |",
      "|---|---|---|---|---|---|---|---|---|",
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
  ).toBe(15);
});
