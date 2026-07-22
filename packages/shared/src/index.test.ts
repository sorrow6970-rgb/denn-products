import { describe, expect, it } from "vitest";
import { APP_IDS, BRAND } from "./index";

describe("@denn/shared", () => {
  it("exposes the brand constant", () => {
    expect(BRAND).toBe("DENN PRODUCTS");
  });

  it("has distinct app identifiers", () => {
    expect(APP_IDS.mockup).not.toBe(APP_IDS.admin);
    expect(new Set(Object.values(APP_IDS)).size).toBe(Object.values(APP_IDS).length);
  });
});
