import { describe, expect, it } from "vitest";
import { resolvePublicImageSource } from "./trust";

const TOKEN = "TOKEN_MARKER_SHOULD_NOT_LEAK";
const TRUSTED = `https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/templates%2Fa.png?alt=media&token=${TOKEN}`;

describe("resolvePublicImageSource — data-image", () => {
  it("passes a data: value through without URL judgement", () => {
    const r = resolvePublicImageSource({ kind: "data-image", value: "data:image/png;base64,QUJD" });
    expect(r).toEqual({ ok: true, src: "data:image/png;base64,QUJD", kind: "data-image" });
  });

  it("rejects an empty value as missing", () => {
    expect(resolvePublicImageSource({ kind: "data-image", value: "" })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects a non-data string tagged as data-image", () => {
    expect(resolvePublicImageSource({ kind: "data-image", value: "http://x/y" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("resolvePublicImageSource — https trust", () => {
  it("accepts the Firebase Storage host + known bucket path", () => {
    const r = resolvePublicImageSource({ kind: "https-image", value: TRUSTED });
    expect(r).toEqual({ ok: true, src: TRUSTED, kind: "firebase-download-image" });
  });

  it.each([
    ["different host", "https://evil.example.test/v0/b/denn-products.firebasestorage.app/o/a.png"],
    [
      "wrong bucket path",
      "https://firebasestorage.googleapis.com/v0/b/other-bucket.appspot.com/o/a.png",
    ],
    [
      "userinfo spoof",
      "https://firebasestorage.googleapis.com@evil.example.test/v0/b/denn-products.firebasestorage.app/o/a.png",
    ],
  ])("rejects %s as untrusted", (_label, value) => {
    expect(resolvePublicImageSource({ kind: "https-image", value })).toEqual({
      ok: false,
      reason: "untrusted",
    });
  });

  it.each([
    [
      "http",
      "http://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/a.png",
    ],
    ["malformed", "https://"],
    ["relative", "v0/b/denn-products.firebasestorage.app/o/a.png"],
  ])("rejects %s as invalid", (_label, value) => {
    expect(resolvePublicImageSource({ kind: "https-image", value })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("keeps token/query only in src — never in a failure reason or serialized failure", () => {
    const bad = `https://evil.example.test/o/a.png?token=${TOKEN}`;
    const r = resolvePublicImageSource({ kind: "https-image", value: bad });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(TOKEN); // failure result carries no url/token
  });

  it("carries the token only inside src on success", () => {
    const r = resolvePublicImageSource({ kind: "https-image", value: TRUSTED });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.src).toContain(TOKEN); // allowed: this is the eventual img[src]
      expect(Object.keys(r).sort()).toEqual(["kind", "ok", "src"]);
    }
  });
});
