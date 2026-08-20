import { describe, expect, it, vi } from "vitest";
import {
  composeSpaceFramePlan,
  type SourceBoundProofResolver,
  type SourceBoundTemplateArtResolver,
} from "./frame-plan";

const scene = (imgT: unknown = { scale: 1, x: 0, y: 0, rot: 0 }) => ({
  schema: "space-scene-v1",
  design: {
    tplId: "PRIVATE_TEMPLATE_ID",
    sizeId: "PRIVATE_SIZE_ID",
    colorId: "PRIVATE_COLOR_ID",
    texts: { main: "PRIVATE_CUSTOMER_TEXT", name: "", name2: "", date: "", sub: "" },
    photoUrl: "https://private.example.test/proof.png",
    imgT,
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

function harness(sceneInput: unknown = scene()) {
  const proofResolve = vi.fn(() => ({
    ok: true,
    imageRef: "must-not-be-used",
    intrinsicSize: { width: 1, height: 1 },
  }));
  const artResolve = vi.fn(() => ({ ok: true, imageRef: "must-not-be-used" }));
  const measureText = vi.fn(() => 1);
  const input = {
    get document(): unknown {
      throw new Error("PRIVATE_DOCUMENT_ACCESS");
    },
    scene: sceneInput,
    get logicalWidth(): unknown {
      throw new Error("PRIVATE_WIDTH_ACCESS");
    },
    proof: { resolve: proofResolve } as SourceBoundProofResolver,
    templateArt: { resolve: artResolve } as SourceBoundTemplateArtResolver,
    measureText,
  };
  return { input, proofResolve, artResolve, measureText };
}

describe("composeSpaceFramePlan V1 replay gate", () => {
  it.each([
    { scale: 1, x: 0, y: 0 },
    { scale: 1, x: -0, y: 0, rot: 0 },
    { scale: 5, x: 0, y: 0, rot: 0 },
  ])("fails closed for centered V1 transform without orientation evidence", (imgT) => {
    const h = harness(scene(imgT));
    const result = composeSpaceFramePlan(h.input);
    expect(result).toEqual({ ok: false, code: "SPACE_VIEW_ORIENTATION_UNCONFIRMED" });
    expect(h.proofResolve).not.toHaveBeenCalled();
    expect(h.artResolve).not.toHaveBeenCalled();
    expect(h.measureText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });

  it.each([
    { scale: 0.3, x: 0, y: 0 },
    { scale: 5.1, x: 0, y: 0 },
    { scale: 1, x: 1, y: 0 },
    { scale: 1, x: 0, y: -1 },
    { scale: 1, x: 0, y: 0, rot: 90 },
  ])("rejects unsupported legacy transform before every downstream port", (imgT) => {
    const h = harness(scene(imgT));
    expect(composeSpaceFramePlan(h.input)).toEqual({
      ok: false,
      code: "SPACE_VIEW_TRANSFORM_UNSUPPORTED",
    });
    expect(h.proofResolve).not.toHaveBeenCalled();
    expect(h.artResolve).not.toHaveBeenCalled();
    expect(h.measureText).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { schema: "space-scene-v2", design: {}, room: {} },
    scene(null),
    scene({ scale: "1", x: 0, y: 0 }),
  ])("returns safe invalid input for malformed or non-V1 scenes", (value) => {
    const h = harness(value);
    const result = composeSpaceFramePlan(h.input);
    expect(result).toEqual({ ok: false, code: "SPACE_VIEW_INVALID_INPUT" });
    expect(h.proofResolve).not.toHaveBeenCalled();
    expect(h.artResolve).not.toHaveBeenCalled();
    expect(h.measureText).not.toHaveBeenCalled();
  });

  it("contains hostile scene access and never reads catalog, width or downstream ports", () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("PRIVATE_SCENE_ACCESS");
        },
      },
    );
    const h = harness(hostile);
    const result = composeSpaceFramePlan(h.input);
    expect(result).toEqual({ ok: false, code: "SPACE_VIEW_INVALID_INPUT" });
    expect(h.proofResolve).not.toHaveBeenCalled();
    expect(h.artResolve).not.toHaveBeenCalled();
    expect(h.measureText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SCENE_ACCESS");
  });
});
