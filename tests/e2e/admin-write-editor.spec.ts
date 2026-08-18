import { expect, test, type Page } from "@playwright/test";
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
