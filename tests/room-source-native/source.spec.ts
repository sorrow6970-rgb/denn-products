import { expect, type Page, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const actions = [
  "same",
  "change",
  "replace",
  "clear",
  "suspend",
  "unmount",
  "fail",
  "no-art",
  "missing-art",
  "clock",
  "case",
] as const;
async function report(page: Page, action = "inspect") {
  await page.getByTestId(`rs-${action}`).click();
  return JSON.parse(await page.getByTestId("rs-report").innerText());
}
for (const action of actions) {
  test(`spec131 React source ${action}`, async ({ page }) => {
    const external: string[] = [],
      errors: string[] = [];
    await page.route("**/*", async (route) => {
      const requested = route.request().url(),
        url = new URL(requested);
      const origin = `http://localhost:${MOCKUP_PORT}`;
      if (url.protocol === "http:" && url.origin === origin) return route.continue();
      // WebKit routes Blob loads too. Admit only this page's currently owned synthetic Blob.
      if (
        url.protocol === "blob:" &&
        url.origin === origin &&
        (await page.evaluate(
          (value) =>
            (window as unknown as { __sourceOwnsBlob?: (u: string) => boolean }).__sourceOwnsBlob?.(
              value,
            ) === true,
          requested,
        ))
      )
        return route.continue();
      external.push(url.protocol);
      return route.abort();
    });
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
    });
    page.on("pageerror", () => errors.push("pageerror"));
    await page.addInitScript(() => {
      const created = new Set<string>(),
        revoked = new Set<string>();
      let duplicate = 0,
        images = 0,
        canvases = 0;
      const create = URL.createObjectURL.bind(URL),
        revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const u = create(blob);
        created.add(u);
        return u;
      };
      URL.revokeObjectURL = (u) => {
        if (revoked.has(u)) duplicate++;
        revoked.add(u);
        revoke(u);
      };
      window.Image = new Proxy(window.Image, {
        construct(target, args) {
          images++;
          return Reflect.construct(target, args);
        },
      });
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = new Proxy(get, {
        apply(target, that, args) {
          canvases++;
          return Reflect.apply(target, that, args);
        },
      });
      Object.assign(window, {
        __sourceOwnsBlob: (url: string) => created.has(url) && !revoked.has(url),
        __sourceOps: () => ({
          images,
          canvases,
          duplicate,
          outstanding: [...created].filter((u) => !revoked.has(u)).length,
        }),
      });
    });
    const ops = () =>
      page.evaluate(() => (window as unknown as { __sourceOps: () => unknown }).__sourceOps());
    await page.goto(`http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomSource=1`);
    expect(await ops()).toEqual({ images: 0, canvases: 0, duplicate: 0, outstanding: 0 });
    const mode = ["no-art", "missing-art", "clock", "case"].includes(action) ? action : "ready";
    await page.getByTestId(`rs-start-${mode}`).click();
    await expect(page.getByTestId("rs-images")).toHaveText("idle/idle");
    await page.getByTestId("rs-load").click();
    try {
      await expect(page.getByTestId("rs-images")).toHaveText(
        mode === "no-art" || mode === "missing-art" ? "ready/idle" : "ready/ready",
      );
    } catch (cause) {
      throw new Error(
        JSON.stringify({
          photoFailure: await page.getByTestId("rs-images").getAttribute("data-photo-failure"),
          external,
          errors,
        }),
        { cause },
      );
    }
    if (["missing-art", "clock", "case"].includes(action)) {
      const r = await report(page, "capture");
      expect(r.captured).toBe(false);
      expect(r.ready).toBe(false);
      expect(r.copies).toBe(0);
    } else {
      const first = await report(page, "capture");
      expect(first.captured).toBe(true);
      expect(first.ready).toBe(true);
      expect(first.same).toBe(true);
      expect(first.oldReaderReady).toBe(true);
      const dark = [17, 34, 51, 255],
        empty = [0, 0, 0, 255];
      expect(first.pixels).toEqual([
        ...dark,
        ...dark,
        ...(mode === "no-art" ? [...empty, ...empty] : [...dark, ...dark]),
      ]);
      expect(first.copies).toBe(1);
      if (action === "same" || action === "no-art") {
        const same = await report(page);
        expect(same.same).toBe(true);
        expect(same.releases).toBe(0);
      } else {
        await page.getByTestId(`rs-${action}`).click();
        if (action === "unmount") await expect(page.getByTestId("rs-images")).toHaveCount(0);
        if (action === "replace")
          await expect(page.getByTestId("rs-images")).toHaveText("ready/ready");
        if (action === "clear")
          await expect(page.getByTestId("rs-images")).toHaveText("idle/ready");
        let after = await report(page, "old-paint");
        expect(after.oldPaint).toBe(false);
        expect(after.oldBorrow).toBe(false);
        expect(after.releases).toBe(1);
        expect(after.copies).toBe(1);
        if (["change", "replace", "clear", "suspend"].includes(action))
          expect(after.immediate).toBe(true);
        if (["clear", "suspend", "unmount", "fail"].includes(action))
          expect(after.ready).toBe(false);
        if (["replace", "clear", "unmount"].includes(action))
          expect(after.oldReaderReady).toBe(false);
        if (action === "suspend") {
          // Repeated report rerenders cannot revive the invalidated old candidate.
          expect((await report(page)).ready).toBe(false);
          await page.getByTestId("rs-resume").click();
          await expect.poll(async () => (await report(page)).ready).toBe(true);
        }
        if (action === "unmount") {
          await page.getByTestId("rs-remount").click();
          await expect(page.getByTestId("rs-images")).toHaveText("idle/idle");
          await page.getByTestId("rs-load").click();
          await expect(page.getByTestId("rs-images")).toHaveText("ready/ready");
          after = await report(page);
          expect(after.ready).toBe(true);
          expect(after.same).toBe(false);
          expect(after.oldReaderReady).toBe(false);
        }
        if (action === "fail") {
          await page.getByTestId("rs-change").click();
          expect((await report(page)).ready).toBe(false);
        }
      }
    }
    await page.getByTestId("rs-unmount").click();
    await expect(page.getByTestId("rs-images")).toHaveCount(0);
    expect((await report(page)).ready).toBe(false);
    expect(await ops()).toMatchObject({ duplicate: 0, outstanding: 0 });
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.locator("body").innerText()).not.toContain("fixture private detail");
  });
}
