// Unit contract for the template art placement projection (spec 028 §3).

import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import { projectCatalogTemplateArtPlacement } from "./placement";

const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

const caseDoc = (template: Record<string, unknown>): CatalogDocumentV1 =>
  doc({ caseTemplates: [{ id: "ct1", name: "케이스", ...template }] });
const frameDoc = (template: Record<string, unknown>): CatalogDocumentV1 =>
  doc({ frameTemplates: [{ id: "ft1", name: "액자", ...template }] });

const casePlacement = (template: Record<string, unknown>) =>
  projectCatalogTemplateArtPlacement(caseDoc(template), {
    templateKind: "case",
    templateId: "ct1",
  });
const framePlacement = (template: Record<string, unknown>) =>
  projectCatalogTemplateArtPlacement(frameDoc(template), {
    templateKind: "frame",
    templateId: "ft1",
  });

describe("projectCatalogTemplateArtPlacement — case", () => {
  it("stretches real art over the whole canvas", () => {
    expect(casePlacement({ type: "uploaded", dataUrl: "data:image/png;base64,QQ" })).toEqual({
      status: "stretch",
      target: "case-canvas",
    });
  });

  it("has no art without a dataUrl", () => {
    expect(casePlacement({ type: "uploaded" })).toEqual({ status: "none" });
    expect(casePlacement({ type: "uploaded", dataUrl: "" })).toEqual({ status: "none" });
  });

  it("has no art for a generated detail preview", () => {
    expect(
      casePlacement({
        type: "uploaded",
        dataUrl: "data:image/png;base64,QQ",
        generatedDetailPreview: true,
      }),
    ).toEqual({ status: "none" });
  });

  it("ignores the frame-only source fields for a case", () => {
    expect(casePlacement({ type: "uploaded", sourceDataUrl: "data:image/png;base64,QQ" })).toEqual({
      status: "none",
    });
  });
});

describe("projectCatalogTemplateArtPlacement — frame", () => {
  const SOURCE = "https://example.test/a.png";

  it("stretches a safe uploaded template over the mat rect", () => {
    expect(framePlacement({ type: "uploaded", dataUrl: SOURCE })).toEqual({
      status: "stretch",
      target: "frame-mat",
    });
  });

  it("accepts every legacy source field in the builder chain", () => {
    for (const field of [
      "dataUrl",
      "sourceDataUrl",
      "builderArtDataUrl",
      "artDataUrl",
      "originalDataUrl",
    ]) {
      expect(framePlacement({ type: "uploaded", [field]: SOURCE })).toEqual({
        status: "stretch",
        target: "frame-mat",
      });
    }
  });

  it.each([
    ["builtBy builder", { builtBy: "builder" }],
    ["clean-inner export", { exportVersion: "clean-inner-v1" }],
    ["overlayScope inner without frameBaked=false", { overlayScope: "inner" }],
    ["overlayScope inner + frameBaked true", { overlayScope: "inner", frameBaked: true }],
  ])("refuses a legacy builder-crop variant (%s)", (_label, marker) => {
    expect(framePlacement({ type: "uploaded", dataUrl: SOURCE, ...marker })).toEqual({
      status: "unsupported",
      reason: "legacy-builder-crop",
    });
  });

  it("allows the inner overlay that legacy does NOT crop", () => {
    expect(
      framePlacement({
        type: "uploaded",
        dataUrl: SOURCE,
        overlayScope: "inner",
        frameBaked: false,
      }),
    ).toEqual({ status: "stretch", target: "frame-mat" });
  });

  it("has no art for builtin templates and for templates without a source", () => {
    expect(framePlacement({ type: "builtin" })).toEqual({ status: "none" });
    expect(framePlacement({ type: "builtin", dataUrl: SOURCE })).toEqual({ status: "none" });
    expect(framePlacement({ type: "uploaded" })).toEqual({ status: "none" });
    expect(
      framePlacement({ type: "uploaded", dataUrl: SOURCE, generatedDetailPreview: true }),
    ).toEqual({ status: "none" });
  });
});

describe("projectCatalogTemplateArtPlacement — safety", () => {
  it.each([
    ["missing template", { templateKind: "case" as const, templateId: "nope" }],
    ["blank id", { templateKind: "case" as const, templateId: "" }],
  ])("fails closed for an unusable selection (%s)", (_label, selection) => {
    expect(projectCatalogTemplateArtPlacement(caseDoc({ dataUrl: "data:x" }), selection)).toEqual({
      status: "unsupported",
      reason: "invalid-template",
    });
  });

  it("fails closed for a malformed document or collection", () => {
    expect(
      projectCatalogTemplateArtPlacement(doc({ caseTemplates: {} }), {
        templateKind: "case",
        templateId: "ct1",
      }),
    ).toEqual({ status: "unsupported", reason: "invalid-template" });
    expect(
      projectCatalogTemplateArtPlacement(null as unknown as CatalogDocumentV1, {
        templateKind: "case",
        templateId: "ct1",
      }),
    ).toEqual({ status: "unsupported", reason: "invalid-template" });
  });

  it("never throws for a hostile getter and never echoes the source", () => {
    const template: Record<string, unknown> = { id: "ct1", name: "케이스", type: "uploaded" };
    Object.defineProperty(template, "dataUrl", {
      get() {
        throw new Error("hostile source getter");
      },
      enumerable: true,
    });
    let placement: unknown;
    expect(() => {
      placement = projectCatalogTemplateArtPlacement(doc({ caseTemplates: [template] }), {
        templateKind: "case",
        templateId: "ct1",
      });
    }).not.toThrow();
    expect(placement).toEqual({ status: "unsupported", reason: "invalid-template" });
  });

  it("returns only a status/target/reason — no id, field name, url or base64", () => {
    const serialized = JSON.stringify(
      casePlacement({ type: "uploaded", dataUrl: "data:image/png;base64,SECRETMARKER" }),
    );
    for (const forbidden of ["SECRETMARKER", "data:", "base64", "dataUrl", "ct1"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
