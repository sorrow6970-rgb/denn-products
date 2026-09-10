import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const format of ["jpeg", "png"]) {
  for (const action of ["normal", "cancel", "dispose", "mismatch", "reject", "metadata"]) {
    test(`spec122 absence decode ${format} ${action}`, async ({ page }) => {
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
        Object.assign(window, { __decodeCalls: calls });
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
        page.evaluate(() => (window as unknown as { __decodeCalls: unknown }).__decodeCalls);
      await page.goto(
        `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`,
      );
      expect(await calls()).toEqual({ read: 0, bitmap: 0, url: 0, image: 0, canvas: 0 });
      await page.getByTestId(`bf-decode-${format}:${action}`).click();
      await expect(page.getByTestId("bf-report")).not.toHaveText("");
      const r = JSON.parse(await page.getByTestId("bf-report").innerText());
      const metadata = action === "metadata",
        reject = action === "reject";
      const codes: Record<string, string> = {
        cancel: "WORK_CANCELLED",
        dispose: "WORK_DISPOSED",
        mismatch: "DECODE_SIZE_MISMATCH",
        reject: "DECODE_FAILED",
        metadata: "METADATA_UNVERIFIED",
      };
      expect(r).toEqual({
        result:
          action === "normal"
            ? { ok: true }
            : { ok: false, code: `ROOM_BACKGROUND_${codes[action]}` },
        size: action === "normal" ? { width: 3, height: 2 } : null,
        second: metadata ? null : { ok: false, code: "ROOM_BACKGROUND_WORK_BUSY" },
        secondNull: true,
        pendingState: action === "dispose" ? "disposed" : "pending",
        before: metadata || reject ? null : { width: 3, height: 2 },
        after: metadata || reject ? null : { width: 0, height: 0 },
        starts: metadata ? 0 : 1,
        closes: metadata || reject ? 0 : 1,
        finalState: "disposed",
        needsSafetyClose: false,
      });
      expect(await calls()).toEqual({
        read: 1,
        bitmap: metadata ? 0 : 1,
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
