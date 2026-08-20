import { describe, expect, it } from "vitest";
import { classifySpaceV1FrameReplay, resolveSpaceProofImageUrl } from "./proof-image";

const TOKEN = "PRIVATE_TOKEN_MARKER";
const proofUrl = (
  objectPath = "proofs/1700000000000-photo.png",
  query = `alt=media&token=${TOKEN}`,
) =>
  `https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/${encodeURIComponent(objectPath)}?${query}`;

describe("resolveSpaceProofImageUrl", () => {
  it("accepts the exact bucket, once-encoded proof object and constrained media query", () => {
    const src = proofUrl();
    expect(resolveSpaceProofImageUrl(src)).toEqual({
      ok: true,
      value: { kind: "firebase-proof-image", src },
    });
    expect(
      resolveSpaceProofImageUrl(proofUrl("proofs/nested/photo 한글.png", "token=x&alt=media")).ok,
    ).toBe(true);
    expect(resolveSpaceProofImageUrl(proofUrl("proofs/public.png", "alt=media"))).toMatchObject({
      ok: true,
    });
  });

  it.each([undefined, null, ""])("rejects missing input without throwing: %s", (value) => {
    expect(resolveSpaceProofImageUrl(value)).toEqual({
      ok: false,
      code: "SPACE_PROOF_IMAGE_MISSING",
    });
  });

  it.each([
    "not-a-url",
    ` ${proofUrl()}`,
    proofUrl().replace("https:", "http:"),
    proofUrl().replace("googleapis.com", "googleapis.com:444"),
    proofUrl().replace("?alt", "#fragment?alt"),
    proofUrl().replace("%2F", "%ZZ"),
  ])("rejects malformed URL forms without echoing them", (src) => {
    const result = resolveSpaceProofImageUrl(src);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(src);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it.each([
    proofUrl().replace("firebasestorage.googleapis.com", "evil.example.test"),
    proofUrl().replace("/v0/b/denn-products", "/v0/b/other-products"),
    proofUrl("templates/photo.png"),
    proofUrl("proofs/"),
    proofUrl("proofs%2Fdouble.png"),
    proofUrl().replace("%2F", "/"),
    proofUrl().replace("https://", "https://user:pass@"),
  ])("rejects an untrusted host, bucket, object or authority", (src) => {
    const result = resolveSpaceProofImageUrl(src);
    expect(result).toEqual({ ok: false, code: "SPACE_PROOF_IMAGE_UNTRUSTED" });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it.each([
    ["missing alt", `token=${TOKEN}`],
    ["wrong alt", `alt=json&token=${TOKEN}`],
    ["duplicate alt", `alt=media&alt=media&token=${TOKEN}`],
    ["empty token", "alt=media&token="],
    ["duplicate token", "alt=media&token=a&token=b"],
    ["unknown key", `alt=media&token=${TOKEN}&download=1`],
  ])("rejects %s", (_label, query) => {
    const result = resolveSpaceProofImageUrl(proofUrl("proofs/photo.png", query));
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("fails closed for hostile access", () => {
    const hostile = new Proxy(Object("x"), {
      get: () => {
        throw new Error("PRIVATE_ERROR");
      },
    });
    expect(resolveSpaceProofImageUrl(hostile)).toEqual({
      ok: false,
      code: "SPACE_PROOF_IMAGE_INVALID",
    });
  });
});

describe("classifySpaceV1FrameReplay", () => {
  it.each([
    { scale: 1, x: 0, y: 0 },
    { scale: 1, x: -0, y: 0, rot: 0 },
    { scale: 3.5, x: 0, y: 0, rot: 0 },
  ])("does not treat centered V1 state as exact without orientation evidence", (input) => {
    expect(classifySpaceV1FrameReplay(input)).toEqual({
      ok: false,
      code: "SPACE_PROOF_ORIENTATION_UNCONFIRMED",
    });
  });

  it.each([
    { scale: 0.99, x: 0, y: 0 },
    { scale: 5.01, x: 0, y: 0 },
    { scale: 1, x: 1, y: 0 },
    { scale: 1, x: 0, y: -1 },
    { scale: 1, x: 0, y: 0, rot: 1 },
    { scale: 1, x: 0, y: 0, rot: -90 },
    { scale: 1, x: 0, y: 0, rot: 0.5 },
  ])("rejects unsupported legacy state without clamp or coercion", (input) => {
    expect(classifySpaceV1FrameReplay(input)).toEqual({
      ok: false,
      code: "SPACE_PROOF_TRANSFORM_UNSUPPORTED",
    });
  });

  it.each([
    null,
    undefined,
    [],
    {},
    { scale: "1", x: 0, y: 0 },
    { scale: 1, x: Number.NaN, y: 0 },
    { scale: 1, x: 0, y: 0, rot: Number.POSITIVE_INFINITY },
    { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 },
    { scale: 1, x: 0, y: 0, frameOrientation: "portrait" },
  ])("rejects malformed state: %s", (input) => {
    expect(classifySpaceV1FrameReplay(input)).toEqual({
      ok: false,
      code: "SPACE_PROOF_TRANSFORM_INVALID",
    });
  });

  it("snapshots each field once without mutating input", () => {
    const reads = { scale: 0, x: 0, y: 0, rot: 0 };
    const input = {} as Record<string, unknown>;
    for (const key of ["scale", "x", "y", "rot"] as const) {
      Object.defineProperty(input, key, {
        enumerable: true,
        get() {
          reads[key] += 1;
          if (reads[key] > 1) throw new Error("PRIVATE_SECOND_READ");
          return key === "scale" ? 1 : 0;
        },
      });
    }
    const result = classifySpaceV1FrameReplay(input);
    expect(result).toEqual({ ok: false, code: "SPACE_PROOF_ORIENTATION_UNCONFIRMED" });
    expect(reads).toEqual({ scale: 1, x: 1, y: 1, rot: 1 });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SECOND_READ");
  });

  it("does not mutate plain input and catches hostile access without leaking details", () => {
    const input = { scale: 1, x: 0, y: 0 };
    const before = JSON.stringify(input);
    expect(classifySpaceV1FrameReplay(input)).toEqual({
      ok: false,
      code: "SPACE_PROOF_ORIENTATION_UNCONFIRMED",
    });
    expect(JSON.stringify(input)).toBe(before);
    const hostile = new Proxy(input, {
      get: () => {
        throw new Error("PRIVATE_ERROR");
      },
    });
    const result = classifySpaceV1FrameReplay(hostile);
    expect(result).toEqual({
      ok: false,
      code: "SPACE_PROOF_TRANSFORM_INVALID",
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_ERROR");
  });
});
