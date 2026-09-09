import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const mode of [
  "jpeg",
  "file",
  "png",
  "release",
  "cancel",
  "dispose",
  "empty",
  "oversize",
  "late",
  "read-error",
  "bad-result",
]) {
  test(`spec105 ${mode}: bounded byte read without decoding`, async ({ page }) => {
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
      Object.assign(window, { __backgroundFileCalls: calls });
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
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = new Proxy(context, {
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
    await page.getByTestId(`bf-${mode}`).click();
    await expect(page.getByTestId("bf-report")).not.toHaveText("");
    const result = JSON.parse(await page.getByTestId("bf-report").innerText());
    const code = (
      {
        empty: "FILE_INVALID_INPUT",
        oversize: "BYTE_LIMIT",
        cancel: "FILE_CANCELLED",
        dispose: "FILE_DISPOSED",
        late: "FILE_CANCELLED",
        "read-error": "FILE_READ_FAILED",
        "bad-result": "FILE_READ_FAILED",
      } as Record<string, string>
    )[mode];
    if (code) expect(result).toMatchObject({ ok: false, code: `ROOM_BACKGROUND_${code}` });
    else {
      expect(result).toMatchObject({
        ok: true,
        samePromise: true,
        secondNull: true,
        equal: mode !== "release",
        hasBlob: mode !== "release",
        preflight: {
          kind: "preflight-only",
          format: mode === "png" ? "png" : "jpeg",
          encodedWidth: 3,
          encodedHeight: 2,
          decodeAllowed: false,
          orientation: "NOT_VERIFIED",
        },
      });
    }
    const calls = await page.evaluate(
      () =>
        (window as unknown as { __backgroundFileCalls: Record<string, number> })
          .__backgroundFileCalls,
    );
    expect(calls).toEqual({
      read: ["empty", "oversize", "late", "read-error", "bad-result"].includes(mode) ? 0 : 1,
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
