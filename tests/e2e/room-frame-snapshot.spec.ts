import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const url = `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomSnapshot=1`;

for (const scale of [1, 1.25]) {
  test(`snapshot pixels and independent borrowed source, scale ${scale}`, async ({ page }) => {
    const external: string[] = [];
    const errors: string[] = [];
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== "localhost") {
        external.push(u.origin);
        return route.abort();
      }
      return route.continue();
    });
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) errors.push(m.type());
    });
    page.on("pageerror", () => errors.push("pageerror"));
    await page.goto(url);
    await page.getByTestId(`rs-pixels-${scale}`).click();
    const report = JSON.parse(await page.getByTestId("rs-report").innerText());
    expect(report).toEqual({
      setup: true,
      referenceOk: true,
      captured: true,
      creates: 1,
      copies: 2,
      releases: 1,
      execute: 1,
      codes: ["ROOM_SNAPSHOT_BUSY"],
      originalSize: [12, 8],
    });
    const pixels = await page.evaluate(() => {
      const read = (id: string) => {
        const c = document.querySelector<HTMLCanvasElement>(`[data-testid="${id}"]`);
        if (!c) throw new Error("missing canvas");
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("missing context");
        return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
      };
      const ref = read("rs-reference");
      const output = read("rs-output");
      const after = read("rs-after");
      return {
        differences: ref.filter((v, i) => v !== output[i]).length,
        afterDifferences: ref.filter((v, i) => v !== after[i]).length,
        painted: output.filter((v, i) => i % 4 === 3 && v > 0).length,
        art: read("rs-borrowed").slice(0, 4),
      };
    });
    expect(pixels.differences).toBe(0);
    expect(pixels.afterDifferences).toBe(0);
    expect(pixels.painted).toBeGreaterThan(30000);
    expect(pixels.art).toEqual([0, 255, 0, 255]);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const [mode, code, creates, releases] of [
  ["release", "RELEASED", 1, 1],
  ["dispose", "DISPOSED", 1, 1],
  ["source-change", "SOURCE_CHANGED", 1, 1],
  ["budget", "INVALID_INPUT", 0, 0],
  ["create-failure", "CAPTURE_FAILED", 1, 0],
  ["context-failure", "CAPTURE_FAILED", 1, 1],
  ["execute-failure", "CAPTURE_FAILED", 1, 1],
] as const) {
  test(`snapshot ${mode}: no output copy, no original disposal`, async ({ page }) => {
    await page.goto(url);
    await page.getByTestId(`rs-${mode}-1.25`).click();
    const r = JSON.parse(await page.getByTestId("rs-report").innerText());
    expect(r.setup).toBe(true);
    expect(r.referenceOk).toBe(true);
    expect(r.codes).toContain(`ROOM_SNAPSHOT_${code}`);
    expect(r.copies).toBe(0);
    expect(r.creates).toBe(creates);
    expect(r.releases).toBe(releases);
    expect(r.originalSize).toEqual([12, 8]);
    expect(
      await page.getByTestId("rs-output").evaluate((c: HTMLCanvasElement) =>
        c
          .getContext("2d")
          ?.getImageData(0, 0, c.width, c.height)
          .data.some((v) => v !== 0),
      ),
    ).toBe(false);
  });
}

test("snapshot native copy and cleanup reentry follows Q102-1", async ({ page }) => {
  await page.goto(url);
  await page.getByTestId("rs-reentry-1.25").click();
  const r = JSON.parse(await page.getByTestId("rs-report").innerText());
  expect(r.codes).toEqual(["ROOM_SNAPSHOT_BUSY", "ROOM_SNAPSHOT_BUSY", "ROOM_SNAPSHOT_RELEASED"]);
  expect(r.copies).toBe(1);
  expect(r.releases).toBe(1);
});
