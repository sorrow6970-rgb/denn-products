import { describe, expect, it } from "vitest";
import type { CatalogDocumentV1 } from "../types";
import { buildCatalogBrowseIndex } from "./build";
import type { BrowseTemplate } from "./types";
import { selectCaseTemplates, selectFrameTemplates } from "./select";

function doc(data: Record<string, unknown>): CatalogDocumentV1 {
  return { schemaVersion: 1, migratedFrom: "legacy-v0", data } as unknown as CatalogDocumentV1;
}
const ids = (templates: readonly BrowseTemplate[]): string[] => templates.map((t) => t.id);

const index = buildCatalogBrowseIndex(
  doc({
    caseCategories: [{ id: "phone", name: "폰" }],
    caseTemplates: [
      { id: "c_p", name: "cp", categoryId: "phone" },
      { id: "c_u", name: "cu" }, // uncategorized
    ],
    frameCategories: [{ id: "wedding", name: "웨딩" }],
    frameSizes: [
      { id: "a4", name: "A4", aspect: 1.5 },
      { id: "sq", name: "정사각", aspect: 1 },
      { id: "hid", name: "숨김", hideInMockup: true },
    ],
    frameTemplates: [
      { id: "f_builtin", name: "fb", type: "builtin" }, // all
      { id: "f_all", name: "fa", type: "uploaded", allFrameSizes: true }, // all
      { id: "f_a4", name: "fa4", type: "uploaded", categoryId: "wedding", sizeId: "a4" }, // restricted a4
      { id: "f_sq", name: "fsq", type: "uploaded", categoryId: "wedding", sizeIds: ["sq"] }, // restricted sq
      { id: "f_unmatched", name: "fun", type: "uploaded", sizeId: "ghost" }, // unmatched
    ],
  }),
);

describe("selectCaseTemplates", () => {
  it("no category / all → whole collection in order", () => {
    expect(ids(selectCaseTemplates(index))).toEqual(["c_p", "c_u"]);
    expect(ids(selectCaseTemplates(index, { categoryId: "all" }))).toEqual(["c_p", "c_u"]);
  });
  it("exact categoryId match; uncategorized only in all", () => {
    expect(ids(selectCaseTemplates(index, { categoryId: "phone" }))).toEqual(["c_p"]);
  });
  it("unknown category → empty (no throw / no fallback)", () => {
    expect(selectCaseTemplates(index, { categoryId: "nope" })).toEqual([]);
  });
});

describe("selectFrameTemplates — category", () => {
  it("no category / all → all templates incl unmatched, source order", () => {
    expect(ids(selectFrameTemplates(index))).toEqual([
      "f_builtin",
      "f_all",
      "f_a4",
      "f_sq",
      "f_unmatched",
    ]);
  });
  it("builtin → only type builtin", () => {
    expect(ids(selectFrameTemplates(index, { categoryId: "builtin" }))).toEqual(["f_builtin"]);
  });
  it("catalog category → uploaded with exact categoryId", () => {
    expect(ids(selectFrameTemplates(index, { categoryId: "wedding" }))).toEqual(["f_a4", "f_sq"]);
  });
  it("unknown category → empty", () => {
    expect(selectFrameTemplates(index, { categoryId: "nope" })).toEqual([]);
  });
});

describe("selectFrameTemplates — size (all / restricted / unmatched)", () => {
  it("known size → all + restricted-matching; unmatched excluded", () => {
    expect(ids(selectFrameTemplates(index, { sizeId: "a4" }))).toEqual([
      "f_builtin",
      "f_all",
      "f_a4",
    ]);
    expect(ids(selectFrameTemplates(index, { sizeId: "sq" }))).toEqual([
      "f_builtin",
      "f_all",
      "f_sq",
    ]);
  });
  it("hidden size → empty", () => {
    expect(selectFrameTemplates(index, { sizeId: "hid" })).toEqual([]);
  });
  it("unknown size → empty", () => {
    expect(selectFrameTemplates(index, { sizeId: "nope" })).toEqual([]);
  });
});

describe("selectFrameTemplates — category + size combined", () => {
  it("wedding + a4 → only the a4-restricted wedding template", () => {
    expect(ids(selectFrameTemplates(index, { categoryId: "wedding", sizeId: "a4" }))).toEqual([
      "f_a4",
    ]);
  });
  it("builtin + a4 → builtin (scope all passes any size)", () => {
    expect(ids(selectFrameTemplates(index, { categoryId: "builtin", sizeId: "a4" }))).toEqual([
      "f_builtin",
    ]);
  });
});
