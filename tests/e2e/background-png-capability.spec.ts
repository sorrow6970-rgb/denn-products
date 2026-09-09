import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

for (const mode of ["normal", "dispose-before", "dispose-pending"]) {
  test(`spec117 synthetic PNG capability ${mode}`, async ({ page, browserName }) => {
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
      const calls = { decode: 0, close: 0, read: 0, url: 0 };
      Object.assign(window, { __pngCapabilityCalls: calls });
      const decode = window.createImageBitmap.bind(window);
      window.createImageBitmap = new Proxy(window.createImageBitmap, {
        apply(_target, _that, args) {
          calls.decode++;
          return Reflect.apply(decode, window, args);
        },
      });
      const close = ImageBitmap.prototype.close;
      ImageBitmap.prototype.close = function () {
        calls.close++;
        return close.call(this);
      };
      const read = FileReader.prototype.readAsArrayBuffer;
      FileReader.prototype.readAsArrayBuffer = function (blob) {
        calls.read++;
        return read.call(this, blob);
      };
      const url = URL.createObjectURL;
      URL.createObjectURL = function (blob) {
        calls.url++;
        return url.call(this, blob);
      };
    });
    await page.goto(`http://localhost:${MOCKUP_PORT}/e2e-canvas-fixture.html?roomBackgroundFile=1`);
    const calls = () =>
      page.evaluate(
        () => (window as unknown as { __pngCapabilityCalls: unknown }).__pngCapabilityCalls,
      );
    expect(await calls()).toEqual({ decode: 0, close: 0, read: 0, url: 0 });
    await page.getByTestId(`bf-capability-${mode}`).click();
    await expect(page.getByTestId("bf-report")).not.toHaveText("");
    const report = JSON.parse(await page.getByTestId("bf-report").innerText());
    const normal = mode === "normal";
    const matching = browserName !== "webkit";
    expect(report).toEqual({
      status: normal && matching ? "synthetic-match" : "not-proven",
      reason: normal ? (matching ? "complete" : "mismatch") : "disposed",
      checked: normal ? 18 : 0,
      matched: normal ? (matching ? 18 : 4) : 0,
      decodeAllowed: false,
      samePromise: true,
    });
    const count = normal ? 18 : mode === "dispose-pending" ? 1 : 0;
    expect(await calls()).toEqual({ decode: count, close: count, read: 0, url: 0 });
    expect(await page.locator("canvas,img,input[type=file]").count()).toBe(0);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}
