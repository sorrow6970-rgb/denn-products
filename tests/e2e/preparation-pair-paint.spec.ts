import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";
for (const format of ["jpeg", "png"]) {
  for (const action of [
    "normal",
    "fractional",
    "clear",
    "dispose",
    "source-change",
    "pending-clear",
    "replace",
    "background-fail",
    "frame-fail",
    "metadata",
  ]) {
    test(`spec128 native pair ${format} ${action}`, async ({ page }) => {
      const external: string[] = [],
        errors: string[] = [];
      await page.route("**/*", (route) => {
        if (new URL(route.request().url()).hostname !== "localhost") {
          external.push("external");
          return route.abort();
        }
        return route.continue();
      });
      page.on("console", (m) => {
        if (["error", "warning"].includes(m.type())) errors.push(m.type());
      });
      page.on("pageerror", () => errors.push("pageerror"));
      await page.addInitScript(() => {
        const calls = { read: 0, bitmap: 0, url: 0, image: 0, canvas: 0 };
        Object.assign(window, { __paintCalls: calls });
        const read = FileReader.prototype.readAsArrayBuffer;
        FileReader.prototype.readAsArrayBuffer = function (blob) {
          calls.read++;
          return read.call(this, blob);
        };
        window.createImageBitmap = new Proxy(window.createImageBitmap, {
          apply(target, that, args) {
            calls.bitmap++;
            return Reflect.apply(target, that, args);
          },
        });
        URL.createObjectURL = new Proxy(URL.createObjectURL, {
          apply(target, that, args) {
            calls.url++;
            return Reflect.apply(target, that, args);
          },
        });
        window.Image = new Proxy(window.Image, {
          construct(target, args) {
            calls.image++;
            return Reflect.construct(target, args);
          },
        });
        HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
          apply(target, that, args) {
            calls.canvas++;
            return Reflect.apply(target, that, args);
          },
        });
      });
      const calls = () =>
        page.evaluate(() => (window as unknown as { __paintCalls: unknown }).__paintCalls);
      await page.goto(
        `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`,
      );
      expect(await calls()).toEqual({ read: 0, bitmap: 0, url: 0, image: 0, canvas: 0 });

      await page.getByTestId(`bf-pair-${format}:${action}`).click();
      await expect(page.getByTestId("bf-report")).not.toHaveText("");
      const r = JSON.parse(await page.getByTestId("bf-report").innerText());
      const metadata = action === "metadata",
        noView = metadata || action === "pending-clear",
        replaced = action === "replace";
      const draws = ["normal", "fractional", "replace", "background-fail", "frame-fail"].includes(
        action,
      );
      const success = ["normal", "fractional", "replace"].includes(action),
        cohorts = replaced ? 2 : 1;
      const failure: Record<string, string> = {
        clear: "RELEASED",
        dispose: "DISPOSED",
        "source-change": "SOURCE_CHANGED",
        "background-fail": "FAILED",
        "frame-fail": "FAILED",
      };
      expect(r).toEqual({
        result: noView
          ? {
              ok: false,
              code: metadata ? "ROOM_PREPARATION_BACKGROUND_FAILED" : "ROOM_PREPARATION_CANCELLED",
            }
          : { ok: true },
        second: replaced ? { ok: true } : null,
        oldPaint: replaced ? { ok: false, code: "ROOM_PREPARED_PAINT_RELEASED" } : null,
        paint: noView
          ? null
          : success
            ? { ok: true }
            : { ok: false, code: `ROOM_PREPARED_PAINT_${failure[action]}` },
        pixels: noView ? null : { equal: true, nonempty: draws, borderClear: true },
        beforeCleanup: {
          closes: success ? (replaced ? 1 : 0) : metadata ? 0 : 1,
          frameReleases: success ? (replaced ? 1 : 0) : 1,
          state: success ? "ready" : action === "dispose" ? "disposed" : "empty",
        },
        order: !draws
          ? []
          : action === "background-fail"
            ? ["background"]
            : ["background", "frame"],
        lookups: cohorts,
        starts: metadata ? 0 : cohorts,
        captures: cohorts,
        closes: metadata ? 0 : cohorts,
        frameReleases: cohorts,
        backgroundCopies: draws ? 1 : 0,
        frameCopies: draws && action !== "background-fail" ? 1 : 0,
        nativeSizes: metadata ? [] : Array.from({ length: cohorts }, () => [0, 0]),
        frameSizes: Array.from({ length: cohorts }, () => [1, 1]),
        finalState: "disposed",
        portState: "disposed",
        needsSafetyClose: false,
        needsSafetyFrame: false,
      });
      expect(await calls()).toEqual({
        read: cohorts,
        bitmap: metadata ? 0 : cohorts,
        url: 0,
        image: 0,
        canvas: noView ? 1 : replaced ? 5 : 4,
      });
      expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
