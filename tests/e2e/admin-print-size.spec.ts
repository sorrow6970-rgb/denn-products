import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Operator print-size input in a real browser (spec 035). The card validates LOCALLY: no request
// of any kind may leave the page, and nothing may survive a reload.

const URL = `http://localhost:${ADMIN_PORT}/`;

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test(`operator print size (spec 035) @ ${vp.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    // every request after the document/assets is a contract violation for this card
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(URL, { waitUntil: "networkidle" });

    const width = page.getByTestId("print-size-width");
    const height = page.getByTestId("print-size-height");
    const result = page.getByTestId("print-size-result");
    const canonical = page.getByTestId("print-size-canonical");

    // nothing typed: not printable yet, and NOT an error
    await expect(width).toHaveValue("");
    await expect(height).toHaveValue("");
    await expect(result).toContainText("치수 미입력");
    await expect(canonical).toHaveCount(0);

    // a valid pair produces the canonical catalog fields
    await width.fill("21");
    await height.fill("29.7");
    await expect(result).toContainText("카탈로그 계약 통과");
    await expect(canonical).toContainText("printWidthCm");
    await expect(canonical).toContainText("21");
    await expect(canonical).toContainText("29.7");

    // half a pair is refused and nothing canonical is offered
    await height.fill("");
    await expect(result).toContainText("통과하지 못했습니다");
    await expect(page.getByText("폭과 높이를 함께 입력해야 합니다.")).toBeVisible();
    await expect(canonical).toHaveCount(0);

    // an unreadable value must NOT become 1 cm (legacy `parseFloat(...) || 1`)
    await width.fill("abc");
    await height.fill("29.7");
    await expect(page.getByText("숫자만 입력하세요. 예: 21, 29.7")).toBeVisible();
    await expect(canonical).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("printWidthCm");

    // out of range is refused by the catalog contract
    await width.fill("501");
    await expect(page.getByText("0 초과 500 이하만 사용할 수 있습니다.")).toBeVisible();
    await expect(canonical).toHaveCount(0);

    // no save / order affordance in the card: two inputs and nothing clickable
    const card = page
      .getByTestId("print-size-result")
      .locator("xpath=ancestor::div[@class='denn-card']");
    await expect(card.locator("button, a, [role='button']")).toHaveCount(0);
    await expect(card.locator("input")).toHaveCount(2);
    await expect(card).not.toContainText("주문");
    await expect(card).not.toContainText("발행");

    // nothing was persisted: a reload comes back empty
    await width.fill("21");
    await height.fill("29.7");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("print-size-width")).toHaveValue("");
    await expect(page.getByTestId("print-size-result")).toContainText("치수 미입력");

    // no network beyond the page's own origin (no Firebase, no upload, no telemetry)
    const external = requests.filter((u) => !u.startsWith(`http://localhost:${ADMIN_PORT}/`));
    expect(external).toEqual([]);

    // accessibility + console
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(consoleErrors).toEqual([]);

    // no horizontal overflow from the new card
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}
