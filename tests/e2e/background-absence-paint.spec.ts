import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const format of ["jpeg", "png"]) {
  for (const action of [
    "normal",
    "fractional",
    "release",
    "dispose",
    "cancel",
    "copy-throw",
    "invalid-aspect",
    "metadata",
  ]) {
    test(`spec126 native absence paint ${format} ${action}`, async ({ page }) => {
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

      await page.getByTestId(`bf-paint-${format}:${action}`).click();
      await expect(page.getByTestId("bf-report")).not.toHaveText("");
      const r = JSON.parse(await page.getByTestId("bf-report").innerText());
      const metadata = action === "metadata",
        noLease = metadata || action === "cancel";
      const draws = ["normal", "fractional", "copy-throw"].includes(action);
      const ended = ["release", "dispose", "copy-throw"].includes(action);
      const codes: Record<string, string> = {
        release: "RELEASED",
        dispose: "DISPOSED",
        "copy-throw": "FAILED",
        "invalid-aspect": "INVALID_INPUT",
      };
      expect(r).toEqual({
        result: noLease
          ? {
              ok: false,
              code: metadata
                ? "ROOM_BACKGROUND_METADATA_UNVERIFIED"
                : "ROOM_BACKGROUND_WORK_CANCELLED",
            }
          : { ok: true },
        leaseSize: noLease ? null : { width: 3, height: 2 },
        secondNull: true,
        paint: noLease
          ? null
          : ["normal", "fractional"].includes(action)
            ? { ok: true }
            : { ok: false, code: `ROOM_BACKGROUND_PAINT_${codes[action]}` },
        afterPaint:
          action === "copy-throw" ? { ok: false, code: "ROOM_BACKGROUND_PAINT_RELEASED" } : null,
        copied: draws
          ? {
              crop: { x: 0, y: 0, width: 3, height: 2 },
              destination:
                action === "fractional"
                  ? { x: 2.25, y: 1.5, width: 7.5, height: 5 }
                  : { x: 2, y: 2, width: 6, height: 4 },
            }
          : null,
        pixels: noLease ? null : { equal: true, nonempty: draws, borderClear: true },
        before: metadata ? null : { width: 3, height: 2 },
        after: metadata ? null : { width: 0, height: 0 },
        starts: metadata ? 0 : 1,
        copies: draws ? 1 : 0,
        closes: metadata ? 0 : 1,
        beforeCleanup: {
          closes: ended || action === "cancel" ? 1 : 0,
          state: action === "dispose" ? "disposed" : ended || noLease ? "idle" : "held",
        },
        finalState: "disposed",
        needsSafetyClose: false,
      });
      expect(await calls()).toEqual({
        read: 1,
        bitmap: metadata ? 0 : 1,
        url: 0,
        image: 0,
        canvas: noLease ? 0 : 2,
      });
      expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
