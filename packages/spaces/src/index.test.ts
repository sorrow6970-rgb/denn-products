import { describe, expect, it } from "vitest";
import { SPACE_SCENE_VERSION, type SpaceRef, type SpaceToken } from "./index";

describe("@denn/spaces", () => {
  it("fixes the only defined space scene identifier", () => {
    expect(SPACE_SCENE_VERSION).toBe("space-scene-v1");
  });

  it("keeps SpaceRef.version aligned with the current identifier", () => {
    const ref: SpaceRef = {
      token: "abc" as SpaceToken,
      version: SPACE_SCENE_VERSION,
    };
    expect(ref.version).toBe("space-scene-v1");
  });
});
