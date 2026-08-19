import type { CatalogDocumentV1 } from "@denn/shared";
import { describe, expect, it } from "vitest";
import { resolveSpaceFrameFontRequest } from "./use-space-frame-fonts";

const catalog = (): CatalogDocumentV1 =>
  ({
    schemaVersion: 1,
    migratedFrom: "legacy-v0",
    data: {
      frameThickness: 5,
      frameTemplates: [
        {
          id: "tpl",
          name: "합성 템플릿",
          type: "uploaded",
          targetSizeIds: ["size"],
          clockEnabled: false,
          textZones: [
            {
              key: "main",
              x: 50,
              y: 50,
              boxW: 80,
              fontSize: 8,
              align: "center",
              font: "Fixture Sans",
              bold: true,
              italic: true,
              color: "#112233",
              lineH: 1.2,
              letterSpacing: 0,
              rotation: 0,
            },
          ],
        },
      ],
      frameSizes: [{ id: "size", name: "합성 크기", aspect: 1.4 }],
      frameColors: [{ id: "black", name: "검정", fill: "#1A1A1A" }],
    },
  }) as CatalogDocumentV1;

const scene = (main: string) => ({
  schema: "space-scene-v1",
  design: {
    tplId: "tpl",
    sizeId: "size",
    colorId: "black",
    texts: { main, name: "", name2: "", date: "", sub: "" },
    photoUrl:
      "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/proofs%2Ffixture.png?alt=media",
    imgT: { scale: 1, x: 0, y: 0, rot: 0 },
    clockOn: false,
  },
  room: {
    bgId: null,
    guideIndex: null,
    pos: null,
    sunPos: null,
    controls: {},
    settings: null,
    common: null,
    gallery: [],
  },
});

describe("resolveSpaceFrameFontRequest", () => {
  it("requires the executor-compatible exact shorthand for nonempty authored text", () => {
    expect(resolveSpaceFrameFontRequest(catalog(), scene("문구"), 400)).toEqual({
      status: "required",
      requirements: [
        {
          shorthand: 'italic bold 32px "Fixture Sans", sans-serif',
          font: {
            family: "Fixture Sans",
            sizePx: 32,
            weight: "bold",
            italic: true,
            fallback: "sans-serif",
          },
        },
      ],
    });
  });

  it("does not require the browser font API when all current text values are empty", () => {
    expect(resolveSpaceFrameFontRequest(catalog(), scene(""), 400)).toEqual({ status: "none" });
  });

  it.each([0, Number.NaN, 400.5])("fails closed for an invalid logical width %s", (width) => {
    expect(resolveSpaceFrameFontRequest(catalog(), scene("문구"), width)).toEqual({
      status: "invalid",
    });
  });
});
