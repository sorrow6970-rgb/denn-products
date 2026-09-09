import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const format of ["jpeg", "png"])
  for (const action of [
    "normal",
    "clear",
    "dispose",
    "source-change",
    "pending-replace",
    "decode-reject",
  ]) {
    test(`spec115 native background ${format} ${action}`, async ({ page }) => {
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
        const calls = { read: 0, bitmap: 0, url: 0, image: 0 };
        Object.assign(window, { __nativeLifecycle: calls });
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
      });
      await page.goto(
        `http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`,
      );
      await page.getByTestId(`bf-native-${format}:${action}`).click();
      await expect(page.getByTestId("bf-report")).not.toHaveText("");
      const report = JSON.parse(await page.getByTestId("bf-report").innerText());
      expect(report).not.toHaveProperty("unexpectedFailure");
      expect(report.evidence).toEqual({
        width: 48,
        height: 32,
        validation: "PARTIAL",
        decodeAllowed: false,
      });
      expect(report.starts).toBe(1);
      expect(report.finalState).toBe("disposed");
      expect(report.pendingState).toBe(action === "dispose" ? "disposed" : "pending");
      expect(report.frameReleases).toBe(action === "pending-replace" ? 2 : 1);
      if (action === "normal") {
        expect(report.result).toEqual({ ok: true });
        expect(report.ready).toEqual({
          frameSize: { width: 48, height: 32 },
          backgroundSize: { width: 48, height: 32 },
        });
      } else {
        const suffix =
          action === "clear"
            ? "CANCELLED"
            : action === "dispose"
              ? "DISPOSED"
              : action === "decode-reject"
                ? "BACKGROUND_FAILED"
                : "SUPERSEDED";
        expect(report.result).toEqual({ ok: false, code: `ROOM_PREPARATION_${suffix}` });
        expect(report.ready).toBeNull();
      }
      expect(report.second).toEqual(
        action === "pending-replace"
          ? { ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" }
          : null,
      );
      expect(report.closes).toBe(action === "decode-reject" ? 0 : 1);
      expect(report.before).toEqual(action === "decode-reject" ? null : { width: 48, height: 32 });
      expect(report.after).toEqual(action === "decode-reject" ? null : { width: 0, height: 0 });
      expect(
        await page.evaluate(
          () => (window as unknown as { __nativeLifecycle: unknown }).__nativeLifecycle,
        ),
      ).toEqual({ read: 1, bitmap: 1, url: 0, image: 0 });
      expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
