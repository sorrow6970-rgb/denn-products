import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const mode of [
  "jpeg",
  "png",
  "file",
  "metadata-jpeg",
  "metadata-png",
  "unknown-jpeg",
  "release",
  "cancel-before",
  "cancel",
  "dispose",
  "late",
]) {
  test(`spec120 native absence owner ${mode}`, async ({ page }) => {
    const external: string[] = [],
      errors: string[] = [];
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).hostname !== "localhost") {
        external.push("external");
        return route.abort();
      }
      return route.continue();
    });
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) errors.push(message.type());
    });
    page.on("pageerror", () => errors.push("pageerror"));
    await page.addInitScript(() => {
      const calls = { read: 0, abort: 0, url: 0, image: 0, canvas: 0, bitmap: 0 };
      Object.assign(window, { __absenceCalls: calls });
      const read = FileReader.prototype.readAsArrayBuffer,
        abort = FileReader.prototype.abort;
      FileReader.prototype.readAsArrayBuffer = function (blob) {
        calls.read++;
        return read.call(this, blob);
      };
      FileReader.prototype.abort = function () {
        calls.abort++;
        return abort.call(this);
      };
      const url = URL.createObjectURL;
      URL.createObjectURL = function (blob) {
        calls.url++;
        return url.call(this, blob);
      };
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
      window.createImageBitmap = new Proxy(window.createImageBitmap, {
        apply(target, that, args) {
          calls.bitmap++;
          return Reflect.apply(target, that, args);
        },
      });
    });
    const calls = () =>
      page.evaluate(() => (window as unknown as { __absenceCalls: unknown }).__absenceCalls);
    await page.goto(`http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`);
    expect(await calls()).toEqual({ read: 0, abort: 0, url: 0, image: 0, canvas: 0, bitmap: 0 });
    await page.getByTestId(`bf-absence-${mode}`).click();
    await expect(page.getByTestId("bf-report")).not.toHaveText("");
    const report = JSON.parse(await page.getByTestId("bf-report").innerText());
    const cancelled = ["cancel-before", "cancel", "dispose", "late"].includes(mode);
    const metadata = mode.startsWith("metadata-") || mode === "unknown-jpeg";
    if (cancelled || metadata) {
      expect(report).toEqual({
        ok: false,
        code: metadata
          ? "ROOM_BACKGROUND_METADATA_UNVERIFIED"
          : mode === "dispose"
            ? "ROOM_BACKGROUND_FILE_DISPOSED"
            : "ROOM_BACKGROUND_FILE_CANCELLED",
        samePromise: true,
        lateDelivered: mode === "late",
      });
    } else {
      expect(report).toMatchObject({
        ok: true,
        samePromise: true,
        secondNull: true,
        frozen: true,
        equal: mode !== "release",
        hasPair: mode !== "release",
        lateDelivered: false,
      });
      if (mode === "release") {
        expect(report.evidence).toBeNull();
        expect(report.mime).toBeNull();
      } else {
        const format = mode === "png" ? "png" : "jpeg";
        expect(report.mime).toBe(`image/${format}`);
        expect(report.evidence).toEqual({
          ok: true,
          kind: "metadata-absence-evidence",
          format,
          byteLength: format === "png" ? 58 : 28,
          encodedWidth: 3,
          encodedHeight: 2,
          encodedPixels: 6,
          metadataPolicy: "core-only-v1",
          orientationBasis: "encoded-pixels",
          validation: "METADATA_ABSENCE_ONLY",
          decodeAllowed: false,
        });
      }
    }
    expect(await calls()).toEqual({
      read: mode === "cancel-before" ? 0 : 1,
      abort: cancelled && mode !== "cancel-before" ? 1 : 0,
      url: 0,
      image: 0,
      canvas: 0,
      bitmap: 0,
    });
    expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}
