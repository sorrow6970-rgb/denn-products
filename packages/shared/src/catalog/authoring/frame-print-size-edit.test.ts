import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import { applyFramePrintSizeEdit } from "./frame-print-size-edit";

const document = (): CatalogDocumentV1 => ({
  schemaVersion: 1,
  migratedFrom: "legacy-v0",
  data: {
    brand: { keep: true },
    frameSizes: [
      { id: "a4", name: "A4", aspect: Math.SQRT2, printWidthCm: 21, printHeightCm: 29.7 },
      { id: "blank", name: "Blank", aspect: 1.5, custom: { keep: true } },
    ],
  },
});

describe("applyFramePrintSizeEdit", () => {
  it("updates exactly the selected id without mutating the source or order", () => {
    const source = document();
    const before = structuredClone(source);
    const result = applyFramePrintSizeEdit(source, {
      frameSizeId: "blank",
      widthText: "30",
      heightText: "45",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(source).toEqual(before);
    expect(result.value.changed).toBe(true);
    expect(result.value.document.data.frameSizes?.map((item) => item.id)).toEqual(["a4", "blank"]);
    expect(result.value.document.data.frameSizes?.[0]).toEqual(before.data.frameSizes?.[0]);
    expect(result.value.document.data.frameSizes?.[1]).toMatchObject({
      id: "blank",
      custom: { keep: true },
      printWidthCm: 30,
      printHeightCm: 45,
    });
    expect(result.value.document.data.brand).toEqual({ keep: true });
  });

  it("returns a clean no-op for the same canonical pair", () => {
    const source = document();
    const result = applyFramePrintSizeEdit(source, {
      frameSizeId: "a4",
      widthText: "21.0",
      heightText: "29.70",
    });
    expect(result.ok && result.value.changed).toBe(false);
  });

  it.each([
    ["", "INVALID_FRAME_SIZE_ID"],
    ["missing", "FRAME_SIZE_NOT_FOUND"],
  ])("fails closed for id %j", (frameSizeId, code) => {
    const result = applyFramePrintSizeEdit(document(), {
      frameSizeId,
      widthText: "21",
      heightText: "29.7",
    });
    expect(result).toEqual({ ok: false, error: { code } });
  });

  it("blocks direct editing of a legacy-backed size", () => {
    const source = document();
    source.data.frameSizes?.push({ id: "legacy", name: "Legacy", wcm: 10, hcm: 20 });
    const result = applyFramePrintSizeEdit(source, {
      frameSizeId: "legacy",
      widthText: "11",
      heightText: "22",
    });
    expect(result).toEqual({ ok: false, error: { code: "LEGACY_PRINT_SIZE_READ_ONLY" } });
  });

  it.each([
    ["", "", 0],
    ["21", "", 1],
    ["21cm", "29.7", 1],
    ["0", "29.7", 1],
  ])("does not create a candidate for invalid pair %j/%j", (widthText, heightText, issueCount) => {
    const result = applyFramePrintSizeEdit(document(), {
      frameSizeId: "a4",
      widthText,
      heightText,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_PRINT_SIZE");
    if (result.error.code === "INVALID_PRINT_SIZE")
      expect(result.error.issues).toHaveLength(issueCount);
  });

  it("rejects malformed and hostile documents without throwing", () => {
    const malformed = { schemaVersion: 999 } as unknown as CatalogDocumentV1;
    expect(
      applyFramePrintSizeEdit(malformed, {
        frameSizeId: "a4",
        widthText: "21",
        heightText: "29.7",
      }),
    ).toEqual({ ok: false, error: { code: "INVALID_DOCUMENT" } });

    const { proxy, revoke } = Proxy.revocable(document(), {});
    revoke();
    expect(() =>
      applyFramePrintSizeEdit(proxy, { frameSizeId: "a4", widthText: "21", heightText: "29.7" }),
    ).not.toThrow();
  });
});
