import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

const modes = [
  ...["jpeg", "png"].flatMap((format) =>
    ["1", "2", "3", "4", "5", "6", "7", "8", "no-profile", "no-tag"].map(
      (value) => `${format}:${value}`,
    ),
  ),
  "release",
  "cancel",
  "dispose",
];
for (const mode of modes) {
  test(`spec110 native byte evidence ${mode}`, async ({ page }) => {
    const external: string[] = [],
      errors: string[] = [];
    await page.route("**/*", (route) => {
      const address = new URL(route.request().url());
      if (address.hostname !== "localhost") {
        external.push(address.origin);
        return route.abort();
      }
      return route.continue();
    });
    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type())) errors.push(msg.type());
    });
    page.on("pageerror", () => errors.push("pageerror"));
    await page.addInitScript(() => {
      const calls = { read: 0, abort: 0, url: 0, image: 0, canvas: 0, bitmap: 0 };
      Object.assign(window, { __evidenceCalls: calls });
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
    await page.goto(`http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`);
    await page.getByTestId(`bf-evidence-${mode}`).click();
    await expect(page.getByTestId("bf-report")).not.toHaveText("");
    const report = JSON.parse(await page.getByTestId("bf-report").innerText());
    if (mode === "cancel" || mode === "dispose") {
      expect(report).toEqual({
        ok: false,
        code: `ROOM_BACKGROUND_FILE_${mode === "cancel" ? "CANCELLED" : "DISPOSED"}`,
        samePromise: true,
      });
    } else {
      expect(report).toMatchObject({
        ok: true,
        samePromise: true,
        secondNull: true,
        frozen: true,
        equal: mode !== "release",
        hasPair: mode !== "release",
      });
      if (mode === "release") expect(report.evidence).toBeNull();
      else {
        const [format, value] = mode.split(":");
        expect(report.mime).toBe(`image/${format}`);
        expect(report.evidence).toEqual({
          ok: true,
          kind: "container-orientation-evidence",
          format,
          byteLength: expect.any(Number),
          encodedWidth: 3,
          encodedHeight: 2,
          encodedPixels: 6,
          exifPresence: value === "no-profile" ? "absent" : "present",
          tagPresence:
            value === "no-profile" ? "unavailable" : value === "no-tag" ? "absent" : "present",
          value: value.startsWith("no-") ? null : Number(value),
          profileValidation: "PARTIAL",
          imageOrientation: "NOT_VERIFIED",
          decodeAllowed: false,
        });
      }
    }
    expect(
      await page.evaluate(
        () => (window as unknown as { __evidenceCalls: unknown }).__evidenceCalls,
      ),
    ).toEqual({
      read: 1,
      abort: ["cancel", "dispose"].includes(mode) ? 1 : 0,
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
