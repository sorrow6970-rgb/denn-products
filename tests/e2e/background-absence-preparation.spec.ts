import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const format of ["jpeg", "png"]) {
  for (const action of [
    "normal",
    "clear",
    "dispose",
    "source-change",
    "pending-replace",
    "reject",
    "metadata",
    "capture-fail",
    "source-fail",
  ]) {
    test(`spec124 absence preparation ${format} ${action}`, async ({ page }) => {
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
        Object.assign(window, { __preparationCalls: calls });
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
        page.evaluate(
          () => (window as unknown as { __preparationCalls: unknown }).__preparationCalls,
        );
      await page.goto(
        `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`,
      );
      expect(await calls()).toEqual({ read: 0, bitmap: 0, url: 0, image: 0, canvas: 0 });
      await page.getByTestId(`bf-prepare-${format}:${action}`).click();
      await expect(page.getByTestId("bf-report")).not.toHaveText("");
      const r = JSON.parse(await page.getByTestId("bf-report").innerText());
      const early = ["capture-fail", "source-fail"].includes(action);
      const noBitmap = early || ["metadata", "reject"].includes(action);
      const codes: Record<string, string> = {
        clear: "CANCELLED",
        dispose: "DISPOSED",
        "source-change": "SUPERSEDED",
        "pending-replace": "SUPERSEDED",
        reject: "BACKGROUND_FAILED",
        metadata: "BACKGROUND_FAILED",
        "capture-fail": "CAPTURE_FAILED",
        "source-fail": "SOURCE_BLOCKED",
      };
      const frameCount = action === "pending-replace" ? 2 : early ? 0 : 1;
      expect(r).toEqual({
        result:
          action === "normal"
            ? { ok: true }
            : { ok: false, code: `ROOM_PREPARATION_${codes[action]}` },
        second:
          action === "pending-replace"
            ? { ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" }
            : null,
        ready:
          action === "normal"
            ? { frameSize: { width: 48, height: 32 }, backgroundSize: { width: 3, height: 2 } }
            : null,
        lookups: early ? 0 : 1,
        starts: early || action === "metadata" ? 0 : 1,
        closes: noBitmap ? 0 : 1,
        captures: action === "pending-replace" ? 2 : action === "source-fail" ? 0 : 1,
        frameReleases: frameCount,
        order:
          action === "source-fail"
            ? []
            : action === "capture-fail"
              ? ["capture"]
              : action === "metadata"
                ? ["capture", "lookup"]
                : action === "pending-replace"
                  ? ["capture", "lookup", "decode", "capture"]
                  : ["capture", "lookup", "decode"],
        before: noBitmap ? null : { width: 3, height: 2 },
        after: noBitmap ? null : { width: 0, height: 0 },
        beforeCleanup: {
          closes: action === "normal" || noBitmap ? 0 : 1,
          frameReleases: action === "normal" ? 0 : frameCount,
        },
        finalState: "disposed",
        controllerState: "disposed",
        needsSafetyClose: false,
      });
      expect(await calls()).toEqual({
        read: early ? 0 : 1,
        bitmap: early || action === "metadata" ? 0 : 1,
        url: 0,
        image: 0,
        canvas: 0,
      });
      expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
