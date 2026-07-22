import { describe, expect, it } from "vitest";
import { WARM_TAUPE } from "./index";

describe("@denn/ui warm taupe tokens", () => {
  it("uses the confirmed warm taupe values", () => {
    expect(WARM_TAUPE.accent).toBe("#9F887A");
    expect(WARM_TAUPE.accent2).toBe("#BAA598");
    expect(WARM_TAUPE.accentSoft).toBe("#EEE8E1");
    expect(WARM_TAUPE.kakao).toBe("#FEE500");
  });

  it("uses ink (#191A1D) as accent-ink, not white", () => {
    expect(WARM_TAUPE.accentInk).toBe("#191A1D");
    expect(WARM_TAUPE.accentInk).not.toBe("#FFFFFF");
    expect(WARM_TAUPE.accentInk).not.toBe("#ffffff");
  });
});
