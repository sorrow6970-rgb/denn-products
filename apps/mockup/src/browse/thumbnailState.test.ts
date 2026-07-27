import { describe, expect, it } from "vitest";
import { isThumbnailFailed } from "./thumbnailState";

const A = "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/a.png";
const B = "https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/b.png";

describe("isThumbnailFailed — stale-onError isolation", () => {
  it("is false before any failure", () => {
    expect(isThumbnailFailed(A, null)).toBe(false);
  });

  it("marks the failed source as failed", () => {
    expect(isThumbnailFailed(A, A)).toBe(true);
  });

  it("a stale failure for source A does NOT fail a new source B", () => {
    // Sequence: image A fails (failedSrc=A) → source changes to B → B must be shown, not placeholder.
    expect(isThumbnailFailed(B, A)).toBe(false);
  });

  it("B's own failure then fails B (single, stable — same B never toggles back)", () => {
    expect(isThumbnailFailed(B, B)).toBe(true);
    // Re-evaluating with the same (B, B) is stable → placeholder stays, no reset/loop.
    expect(isThumbnailFailed(B, B)).toBe(true);
  });

  it("no src (unavailable) is not 'failed' (placeholder comes from the null-src branch)", () => {
    expect(isThumbnailFailed(null, null)).toBe(false);
    expect(isThumbnailFailed(null, A)).toBe(false);
  });
});
