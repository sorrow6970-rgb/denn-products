import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import { type CatalogImageProjection, projectCatalogTemplateImage } from "./project";

function doc(data: Record<string, unknown>): CatalogDocumentV1 {
  return { schemaVersion: 1, migratedFrom: "legacy-v0", data } as unknown as CatalogDocumentV1;
}
function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

const DATA_PNG = "data:image/png;base64,QUJD";
const HTTPS =
  "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/templates%2Fa.png?alt=media&token=t";

function project(
  data: Record<string, unknown>,
  templateKind: "case" | "frame",
  templateId: string,
): CatalogImageProjection {
  return projectCatalogTemplateImage(doc(data), { templateKind, templateId });
}

describe("projectCatalogTemplateImage — case", () => {
  it("uses dataUrl for a case template", () => {
    const r = project({ caseTemplates: [{ id: "c1", dataUrl: DATA_PNG }] }, "case", "c1");
    expect(r).toEqual({ status: "available", sourceKind: "data-image", value: DATA_PNG });
  });

  it("does not consult frame-only fields for a case template", () => {
    // sourceDataUrl is a frame-builder field; case uses dataUrl only → unavailable(none)
    const r = project({ caseTemplates: [{ id: "c1", sourceDataUrl: DATA_PNG }] }, "case", "c1");
    expect(r).toEqual({ status: "unavailable", reason: "none" });
  });
});

describe("projectCatalogTemplateImage — frame priority chain", () => {
  const FIELDS = [
    "dataUrl",
    "sourceDataUrl",
    "builderArtDataUrl",
    "artDataUrl",
    "originalDataUrl",
  ] as const;

  for (const field of FIELDS) {
    it(`selects ${field} when it is the first present valid field`, () => {
      const r = project({ frameTemplates: [{ id: "f1", [field]: DATA_PNG }] }, "frame", "f1");
      expect(r).toEqual({ status: "available", sourceKind: "data-image", value: DATA_PNG });
    });
  }

  it("prefers dataUrl over later fields", () => {
    const r = project(
      { frameTemplates: [{ id: "f1", dataUrl: DATA_PNG, sourceDataUrl: HTTPS }] },
      "frame",
      "f1",
    );
    expect(r).toEqual({ status: "available", sourceKind: "data-image", value: DATA_PNG });
  });

  it("falls through empty/invalid earlier fields to the next valid one", () => {
    const r = project(
      {
        frameTemplates: [
          { id: "f1", dataUrl: "", sourceDataUrl: "http://x/y.png", builderArtDataUrl: HTTPS },
        ],
      },
      "frame",
      "f1",
    );
    expect(r).toEqual({ status: "available", sourceKind: "https-image", value: HTTPS });
  });
});

describe("projectCatalogTemplateImage — gates & classification", () => {
  it("generatedDetailPreview === true gates the whole chain", () => {
    const r = project(
      { frameTemplates: [{ id: "f1", dataUrl: DATA_PNG, generatedDetailPreview: true }] },
      "frame",
      "f1",
    );
    expect(r).toEqual({ status: "unavailable", reason: "generated-preview" });
  });

  it("classifies a valid HTTPS url as https-image", () => {
    const r = project({ frameTemplates: [{ id: "f1", dataUrl: HTTPS }] }, "frame", "f1");
    expect(r).toEqual({ status: "available", sourceKind: "https-image", value: HTTPS });
  });

  it.each([
    ["http", "http://example.com/a.png"],
    ["javascript", "javascript:alert(1)"],
    ["blob", "blob:https://x/abc"],
    ["relative", "templates/a.png"],
    ["whitespace", "   "],
    ["garbage", "not-a-url"],
  ])("treats a %s dataUrl as invalid-reference", (_label, value) => {
    const r = project({ frameTemplates: [{ id: "f1", dataUrl: value }] }, "frame", "f1");
    expect(r).toEqual({ status: "unavailable", reason: "invalid-reference" });
  });

  it("storagePath-only is unavailable (never a projection source)", () => {
    const r = project(
      { frameTemplates: [{ id: "f1", storagePath: "templates/a.png" }] },
      "frame",
      "f1",
    );
    expect(r).toEqual({ status: "unavailable", reason: "none" });
  });

  it("dual selects the dataUrl family only (no storagePath fallback)", () => {
    const r = project(
      { frameTemplates: [{ id: "f1", dataUrl: DATA_PNG, storagePath: "templates/a.png" }] },
      "frame",
      "f1",
    );
    expect(r).toEqual({ status: "available", sourceKind: "data-image", value: DATA_PNG });
  });

  it("unknown template id / kind → unavailable, no throw", () => {
    expect(project({ frameTemplates: [{ id: "f1", dataUrl: DATA_PNG }] }, "frame", "nope")).toEqual(
      {
        status: "unavailable",
        reason: "none",
      },
    );
    // kind mismatch: id exists under frame, not case
    expect(project({ frameTemplates: [{ id: "f1", dataUrl: DATA_PNG }] }, "case", "f1")).toEqual({
      status: "unavailable",
      reason: "none",
    });
  });

  it("returns the ORIGINAL string reference and leaks no raw template fields", () => {
    const value = DATA_PNG;
    const data = { frameTemplates: [{ id: "f1", dataUrl: value, secret: "SECRET_XYZ" }] };
    const r = project(data, "frame", "f1");
    expect(r.status).toBe("available");
    if (r.status === "available") {
      expect(r.value).toBe(value); // same reference, not a clone
      expect(JSON.stringify(r)).not.toContain("SECRET_XYZ");
      expect(Object.keys(r).sort()).toEqual(["sourceKind", "status", "value"]);
    }
  });

  it("does not mutate a deep-frozen document", () => {
    const data = deepFreeze({ frameTemplates: [{ id: "f1", dataUrl: DATA_PNG }] });
    expect(() => project(data, "frame", "f1")).not.toThrow();
    expect((data.frameTemplates[0] as { dataUrl: string }).dataUrl).toBe(DATA_PNG);
  });
});
