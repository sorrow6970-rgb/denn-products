import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

const FIXTURE_URL = `http://localhost:${ADMIN_PORT}/e2e-admin-write-fixture.html`;

async function openFixture(page: Page): Promise<string[]> {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "localhost") external.push(request.url());
  });
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("fixture-status")).toHaveText("unloaded");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("0");
  await expect(page.getByTestId("admin-read-load")).toHaveCount(0);
  return external;
}

async function loadBaseline(page: Page): Promise<void> {
  await page.getByRole("button", { name: "편집 기준 불러오기" }).click();
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
  await expect(page.getByTestId("fixture-revision")).toHaveText("3");
  await expect(page.getByTestId("fixture-write-factory-calls")).toHaveText("1");
}

test("explicit load, stable selection, canonical prefill and legacy read-only", async ({
  page,
}) => {
  const external = await openFixture(page);
  const size = page.getByTestId("frame-print-size-id");
  await expect(size).toBeDisabled();
  await expect(size).toHaveValue("");
  await expect(page.getByRole("button", { name: "변경 저장" })).toBeDisabled();

  await loadBaseline(page);
  await expect(size).toBeEnabled();
  await expect(size).toHaveValue(""); // no first-item auto selection
  await expect(size.locator('option[value="legacy"]')).toBeDisabled();

  await size.selectOption("a4");
  await expect(page.getByTestId("frame-print-size-width")).toHaveValue("21");
  await expect(page.getByTestId("frame-print-size-height")).toHaveValue("29.7");

  await size.selectOption("blank");
  await expect(page.getByTestId("frame-print-size-width")).toHaveValue("");
  await expect(page.getByTestId("frame-print-size-height")).toHaveValue("");
  expect(external).toEqual([]);
  expect(await page.content()).not.toContain("synthetic/never-exposed.json");
});

test("partial input is dirty-invalid and returning to canonical is clean", async ({ page }) => {
  await openFixture(page);
  await loadBaseline(page);
  await page.getByTestId("frame-print-size-id").selectOption("a4");
  await page.getByTestId("frame-print-size-width").fill("22");
  await page.getByTestId("frame-print-size-height").fill("");
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-dirty-invalid");
  await expect(page.getByRole("button", { name: "변경 저장" })).toBeDisabled();
  await expect(page.getByTestId("fixture-save-calls")).toHaveText("0");

  await page.getByTestId("frame-print-size-width").fill("21.0");
  await page.getByTestId("frame-print-size-height").fill("29.70");
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
  await expect(page.getByRole("button", { name: "변경 저장" })).toBeDisabled();
});

test("valid save uses the exact loaded base once and adopts only the returned revision", async ({
  page,
}) => {
  await openFixture(page);
  await loadBaseline(page);
  await page.getByTestId("frame-print-size-id").selectOption("a4");
  await page.getByTestId("frame-print-size-width").fill("22");
  await page.getByTestId("frame-print-size-height").fill("30");
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-dirty-valid");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
  await expect(page.getByTestId("fixture-save-calls")).toHaveText("1");
  await expect(page.getByTestId("fixture-expected-base")).toHaveText("3");
  await expect(page.getByTestId("fixture-revision")).toHaveText("4");
});

for (const scenario of [
  {
    mode: "다음 저장 충돌",
    status: "conflict",
    message: "다른 저장이 먼저 반영됐습니다",
  },
  {
    mode: "다음 저장 결과 미확정",
    status: "outcome-unknown",
    message: "저장 결과를 확인할 수 없습니다",
  },
] as const) {
  test(`${scenario.status} locks save with zero automatic retry and requires discard reload`, async ({
    page,
  }) => {
    await openFixture(page);
    await loadBaseline(page);
    await page.getByRole("button", { name: scenario.mode }).click();
    await page.getByTestId("frame-print-size-id").selectOption("a4");
    await page.getByTestId("frame-print-size-width").fill("22");
    await page.getByTestId("frame-print-size-height").fill("30");
    await page.getByRole("button", { name: "변경 저장" }).click();
    await expect(page.getByTestId("fixture-status")).toHaveText(scenario.status);
    await expect(page.getByTestId("frame-print-size-status")).toContainText(scenario.message);
    await expect(page.getByTestId("fixture-save-calls")).toHaveText("1");
    await expect(page.getByRole("button", { name: "변경 저장" })).toBeDisabled();

    await page.getByRole("button", { name: "편집 기준 불러오기" }).click();
    await expect(page.getByTestId("fixture-status")).toHaveText("discard-confirmation");
    await expect(page.getByTestId("fixture-save-calls")).toHaveText("1");
    await page.getByRole("button", { name: "초안 폐기하고 다시 불러오기" }).click();
    await expect(page.getByTestId("fixture-status")).toHaveText("ready-clean");
    await expect(page.getByTestId("fixture-revision")).toHaveText("3");
  });
}

// --- spec 086: the size picker's accessibility surface --------------------------
//
// Closes spec 084 F-5, measured on this same component: the `액자 사이즈` select was a 23px
// unstyled native widget (518x23 desktop, 316x23 mobile) sitting directly above two 44px
// `TextField`s. What is asserted here is the RENDERED control - height, containment, focus ring
// and disabled cue in computed style - because a class name in the markup proves none of it.

const SELECT_CLASS = "denn-frame-print-size-editor__select";

const SURFACE_VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

/** Everything the pixel contract needs, read from the live computed style in one round trip. */
async function selectSurface(page: Page): Promise<{
  readonly minHeight: string;
  readonly borderStyle: string;
  readonly borderWidth: string;
  readonly borderRadius: string;
  readonly backgroundColor: string;
  readonly boxSizing: string;
  readonly cursor: string;
  readonly opacity: string;
  readonly transitionDuration: string;
  readonly transform: string;
}> {
  return page.getByTestId("frame-print-size-id").evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      minHeight: style.minHeight,
      borderStyle: style.borderTopStyle,
      borderWidth: style.borderTopWidth,
      borderRadius: style.borderTopLeftRadius,
      backgroundColor: style.backgroundColor,
      boxSizing: style.boxSizing,
      cursor: style.cursor,
      opacity: style.opacity,
      transitionDuration: style.transitionDuration,
      transform: style.transform,
    };
  });
}

for (const viewport of SURFACE_VIEWPORTS) {
  test(`spec 086 size picker surface @ ${viewport.name}: 44px, contained, focusable, styled in both states`, async ({
    page,
  }) => {
    const noise: string[] = [];
    page.on("console", (message: ConsoleMessage) => {
      if (message.type() === "error" || message.type() === "warning") noise.push(message.text());
    });
    page.on("pageerror", (error) => noise.push(String(error)));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const external = await openFixture(page);
    const select = page.getByTestId("frame-print-size-id");

    // 4a. disabled (before an explicit load) is styled, and says so without relying on colour
    await expect(select).toBeDisabled();
    const disabled = await selectSurface(page);
    expect(disabled.minHeight, "disabled min-height").toBe("44px");
    expect(disabled.borderStyle).toBe("solid");
    expect(disabled.borderWidth).toBe("1px");
    expect(disabled.cursor, "disabled cursor").toBe("not-allowed");
    expect(Number.parseFloat(disabled.opacity), "disabled is dimmed").toBeLessThan(1);
    const disabledBox = await select.boundingBox();
    expect(disabledBox?.height ?? 0, "disabled height").toBeGreaterThanOrEqual(44);

    await loadBaseline(page);
    await expect(select).toBeEnabled();

    // 1. the pointer target, in the rendered box rather than in the stylesheet
    const enabled = await selectSurface(page);
    expect(enabled.minHeight, "enabled min-height").toBe("44px");
    expect(enabled.boxSizing).toBe("border-box");
    expect(enabled.borderStyle).toBe("solid");
    expect(enabled.borderRadius, "shares the TextField radius").not.toBe("0px");
    expect(enabled.backgroundColor, "has a painted surface").not.toBe("rgba(0, 0, 0, 0)");
    expect(Number.parseFloat(enabled.opacity), "enabled is not dimmed").toBe(1);
    // nothing was added that moves: this is a static surface
    expect(enabled.transitionDuration).toBe("0s");
    expect(enabled.transform === "none" || enabled.transform === "").toBe(true);

    const box = await select.boundingBox();
    expect(box, "the select has a box").not.toBeNull();
    expect(box?.height ?? 0, "44px pointer target").toBeGreaterThanOrEqual(44);

    // 2. it stays inside the editor, and the page never scrolls sideways
    const editor = await page.getByTestId("frame-print-size-editor").boundingBox();
    expect(editor, "the editor has a box").not.toBeNull();
    if (box !== null && editor !== null) {
      expect(box.x, "left edge inside the editor").toBeGreaterThanOrEqual(editor.x - 1);
      expect(box.x + box.width, "right edge inside the editor").toBeLessThanOrEqual(
        editor.x + editor.width + 1,
      );
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "document horizontal overflow").toBeLessThanOrEqual(0);

    // 3. Tab reaches it and the ring is really painted (`:focus-visible`, not a class name)
    await page.evaluate(() => {
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
      document.body.removeAttribute("tabindex");
    });
    let reached = false;
    for (let step = 0; step < 25 && !reached; step++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(
        (testid) => document.activeElement?.getAttribute("data-testid") === testid,
        "frame-print-size-id",
      );
    }
    expect(reached, "Tab reaches the size picker").toBe(true);
    const ring = await select.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        width: Number.parseFloat(style.outlineWidth),
        style: style.outlineStyle,
        offset: style.outlineOffset,
      };
    });
    expect(ring.style, "focus outline style").not.toBe("none");
    expect(ring.width, "focus outline width").toBeGreaterThanOrEqual(3);
    expect(ring.offset).toBe("2px");

    // 5/6. the meaning the styling was not allowed to touch
    await expect(select).toHaveValue(""); // still no first-item auto selection
    await expect(select.locator('option[value="legacy"]')).toBeDisabled();
    await select.selectOption("a4");
    await expect(page.getByTestId("frame-print-size-width")).toHaveValue("21");
    await expect(page.getByTestId("frame-print-size-height")).toHaveValue("29.7");
    await select.selectOption("blank");
    await expect(page.getByTestId("frame-print-size-width")).toHaveValue("");
    await expect(page.getByTestId("frame-print-size-height")).toHaveValue("");
    await expect(page.getByTestId("fixture-save-calls")).toHaveText("0");

    // the class lives on the select and on nothing else on the page
    const carriers = await page.evaluate(
      (className) => document.querySelectorAll(`.${className}`).length,
      SELECT_CLASS,
    );
    expect(carriers, "one styled control only").toBe(1);

    // 7. accessibility, quiet console, nothing left the machine.
    //
    // Scoped to the product component. The page around it is harness chrome — the diagnostics
    // section this fixture prints (`fixture-status`, `fixture-expected-base`) puts muted text
    // straight on the page background and fails colour contrast at 4.39:1. That is a property of
    // the fixture, not of the editor, and spec 084 §3 established that reporting fixture controls
    // as product findings is the exact confusion to avoid; its own audit hides the same section
    // before it runs axe. The assertion itself is not loosened: the editor must have zero.
    const axe = await new AxeBuilder({ page })
      .include('[data-testid="frame-print-size-editor"]')
      .analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
      [],
    );
    expect(noise).toEqual([]);
    expect(external).toEqual([]);
  });
}
