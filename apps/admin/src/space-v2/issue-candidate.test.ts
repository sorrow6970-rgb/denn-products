// Unit contract for the local space V2 issue candidate projector (spec 065 §4). Synthetic fixtures
// only — no real product names/ids/images, no token/password/UID/email, no URL/base64 secret, no
// network, no Firebase, no DOM/Canvas. The SHA-256 port is always injected, so the default Web
// Crypto port is never exercised here.

import { readFileSync } from "node:fs";
import { encodeFrameReplayEvidenceV1, verifyFrameReplayEvidenceDigestV1 } from "@denn/spaces";
import type { CatalogDocumentV1, FramePreviewSelection } from "@denn/shared";
import { projectFramePreviewGeometry } from "@denn/shared";
import { describe, expect, it, vi } from "vitest";
import {
  createSpaceV2FrameIssueCandidate,
  type SpaceV2FrameIssueCandidateInput,
} from "./issue-candidate";

// --- fixtures ----------------------------------------------------------------

const doc = (data: Record<string, unknown>): CatalogDocumentV1 =>
  ({ schemaVersion: 1, migratedFrom: "legacy-v0", data }) as unknown as CatalogDocumentV1;

/** Portrait: `aspect` is H / W, so 1.4 must pair with `frameOrientation: "portrait"`. */
const SIZE = { id: "s1", name: "사이즈", aspect: 1.4, frameThickness: 4 };
/** Image-only: uploaded, no design source, and an EXPLICIT clock opt-out (spec 031). */
const TEMPLATE = { id: "ft1", name: "템플릿", type: "uploaded", clockEnabled: false };

const frameDoc = (
  template: Record<string, unknown> = TEMPLATE,
  size: Record<string, unknown> = SIZE,
  extra: Record<string, unknown> = {},
) => doc({ frameSizes: [size], frameTemplates: [template], ...extra });

const SELECTION: FramePreviewSelection = { frameSizeId: "s1", templateId: "ft1" };

const PROOF = {
  objectPath: "rebuild-space-assets/objects/0f9c1b2a-4d3e-4f5a-9b6c-7d8e9f0a1b2c.png",
  sha256: `${"A".repeat(43)}=`,
  byteLength: 2048,
  contentType: "image/png",
  intrinsicWidth: 1200,
  intrinsicHeight: 1680,
} as const;

const TRANSFORM = { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 } as const;

const input = (
  over: Partial<SpaceV2FrameIssueCandidateInput> = {},
): SpaceV2FrameIssueCandidateInput => ({
  catalog: frameDoc(),
  selection: SELECTION,
  frameOrientation: "portrait",
  logicalWidth: 1000,
  frameColor: "#191A1D",
  transform: TRANSFORM,
  proofAsset: PROOF,
  ...over,
});

const DIGEST_BYTES = Uint8Array.from({ length: 32 }, (_, index) => index);
const DIGEST_VALUE = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

/** Records every call so "the port ran exactly once, on these bytes" is assertable. */
const recordingPort = () => {
  const calls: Uint8Array[] = [];
  return {
    calls,
    digest: vi.fn(async (bytes: Uint8Array) => {
      calls.push(bytes);
      return DIGEST_BYTES;
    }),
  };
};

const EXPECTED_EVIDENCE = {
  replayContract: "frame-logical-plan-v1",
  frameOrientation: "portrait",
  logicalWidth: 1000,
  geometry: { aspect: 1.4, borderPercentOfWidth: 4, matColor: "#FFFFFF", contentInsetPx: 8 },
  frameColor: "#191A1D",
  transformEncoding: "normalized-max-pan-v1",
  transform: { scale: 1.25, x: 0.5, y: -0.25, rotationQuarterTurns: 0 },
  proofAsset: { ...PROOF },
  templateArt: { kind: "none" },
  textMode: "none",
  clockMode: "off",
} as const;

const EXPECTED_CANDIDATE = {
  schema: "space-scene-v2",
  productKind: "frame",
  frameEvidence: EXPECTED_EVIDENCE,
  frameEvidenceDigest: {
    algorithm: "SHA-256",
    encoding: "denn-frame-evidence-v1",
    value: DIGEST_VALUE,
  },
  roomCapability: "unsupported",
} as const;

// --- success -----------------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — success", () => {
  it("assembles the exact V2 scene candidate from an image-only single-rect catalog", async () => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(input(), port);

    expect(result).toEqual({ ok: true, value: EXPECTED_CANDIDATE });
  });

  it("takes geometry from the projection, not from a raw catalog re-read", async () => {
    // The size thickness wins over the top-level one and the mat colour alias is canonicalised to
    // upper-case hex — both are projection behaviour that a raw field read would get wrong.
    const catalog = frameDoc(
      { ...TEMPLATE, backgroundEnabled: true, paperColor: "#aabbcc" },
      SIZE,
      { frameThickness: 5.5 },
    );
    const projected = projectFramePreviewGeometry(catalog, SELECTION);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    const result = await createSpaceV2FrameIssueCandidate(input({ catalog }), recordingPort());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frameEvidence.geometry).toEqual({
      aspect: projected.value.aspect,
      borderPercentOfWidth: projected.value.borderPercentOfWidth,
      matColor: projected.value.matColor,
      contentInsetPx: projected.value.contentInsetPx,
    });
    expect(result.value.frameEvidence.geometry.matColor).toBe("#AABBCC");
    expect(result.value.frameEvidence.geometry.borderPercentOfWidth).toBe(4);
  });

  it("accepts a landscape frame whose projected aspect agrees", async () => {
    const catalog = frameDoc(TEMPLATE, { ...SIZE, aspect: 0.75 });
    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog, frameOrientation: "landscape" }),
      recordingPort(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frameEvidence.frameOrientation).toBe("landscape");
    expect(result.value.frameEvidence.geometry.aspect).toBe(0.75);
  });

  it("calls the injected port exactly once, with the canonical evidence bytes", async () => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(input(), port);

    expect(result.ok).toBe(true);
    expect(port.digest).toHaveBeenCalledTimes(1);
    const encoded = encodeFrameReplayEvidenceV1(EXPECTED_EVIDENCE);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(port.calls[0]).toEqual(encoded.value.bytes);
  });

  it("produces a candidate the spec 064 verifier accepts unchanged", async () => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(input(), port);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const verified = await verifyFrameReplayEvidenceDigestV1(
      result.value.frameEvidence,
      result.value.frameEvidenceDigest,
      port,
    );
    expect(verified).toEqual({ ok: true, value: EXPECTED_EVIDENCE });
  });

  it("returns a detached value: mutating the input afterwards cannot change it", async () => {
    const transform = { ...TRANSFORM };
    const proofAsset = { ...PROOF };
    const selection = { ...SELECTION };
    const mutable = input({ transform, proofAsset, selection });

    const result = await createSpaceV2FrameIssueCandidate(mutable, recordingPort());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    (transform as { scale: number }).scale = 4;
    (proofAsset as { byteLength: number }).byteLength = 9;
    (selection as { templateId: string }).templateId = "other";
    (mutable as { logicalWidth: number }).logicalWidth = 7;

    expect(result.value).toEqual(EXPECTED_CANDIDATE);
  });
});

// --- first capability --------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — first capability", () => {
  const textZone = {
    key: "main",
    x: 50,
    y: 20,
    boxW: 80,
    fontSize: 6,
    align: "center",
    font: "DM Sans",
    bold: false,
    italic: false,
    color: "#111111",
    lineH: 1.25,
    letterSpacing: 0,
    rotation: 0,
  };

  it.each([
    ["an operator text zone", { ...TEMPLATE, textZones: [textZone] }],
    ["a physical clock", { id: "ft1", name: "템플릿", type: "uploaded" }],
    ["real template art", { ...TEMPLATE, dataUrl: "https://example.invalid/art.png" }],
    ["art whose absence cannot be proven", { ...TEMPLATE, dataUrl: "javascript:alert(1)" }],
  ])("refuses %s without calling the digest port", async (_label, template) => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog: frameDoc(template) }),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("still accepts a generated-preview template as provably art-free", async () => {
    const catalog = frameDoc({
      ...TEMPLATE,
      generatedDetailPreview: true,
      dataUrl: "https://example.invalid/preview.png",
    });
    const result = await createSpaceV2FrameIssueCandidate(input({ catalog }), recordingPort());

    expect(result.ok).toBe(true);
  });
});

// --- rejected input ----------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — rejected input", () => {
  it.each([
    ["a document without data", { schemaVersion: 1 }],
    ["a document whose data is not an object", { schemaVersion: 1, data: 7 }],
    ["a null document", null],
  ])("reports a failed catalog projection for %s", async (_label, catalog) => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog: catalog as unknown as CatalogDocumentV1 }),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown frame size", { frameSizes: [], frameTemplates: [TEMPLATE] }],
    ["an unknown template", { frameSizes: [SIZE], frameTemplates: [] }],
    [
      "a size without a usable aspect",
      { frameSizes: [{ id: "s1", name: "s" }], frameTemplates: [TEMPLATE] },
    ],
    [
      "a multi-zone template a rectangle cannot represent",
      {
        frameSizes: [SIZE],
        frameTemplates: [
          {
            ...TEMPLATE,
            photoZones: [
              { x: 0, y: 0, w: 50, h: 50 },
              { x: 50, y: 0, w: 50, h: 50 },
            ],
          },
        ],
      },
    ],
  ])("reports a failed catalog projection for %s", async (_label, data) => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(input({ catalog: doc(data) }), port);

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it.each([
    ["a null selection", { selection: null }],
    ["a selection with an extra key", { selection: { ...SELECTION, extra: 1 } }],
    ["a non-string selection id", { selection: { frameSizeId: 1, templateId: "ft1" } }],
    ["an unknown orientation", { frameOrientation: "square" }],
    ["an orientation that contradicts the projected aspect", { frameOrientation: "landscape" }],
    ["a non-integer logical width", { logicalWidth: 1000.5 }],
    ["a zero logical width", { logicalWidth: 0 }],
    ["a lower-case frame colour", { frameColor: "#191a1d" }],
    ["a frame colour that is not #RRGGBB", { frameColor: "black" }],
    ["a transform scale below the contract range", { transform: { ...TRANSFORM, scale: 0.5 } }],
    ["a pan outside the contract range", { transform: { ...TRANSFORM, x: 1.5 } }],
    ["an unknown quarter turn", { transform: { ...TRANSFORM, rotationQuarterTurns: 4 } }],
    ["a transform with a missing key", { transform: { scale: 1, x: 0, y: 0 } }],
    [
      "a proof path outside the space asset prefix",
      { proofAsset: { ...PROOF, objectPath: "a.png" } },
    ],
    ["a proof hash that is not 32 base64 bytes", { proofAsset: { ...PROOF, sha256: "AAAA" } }],
    ["a non-png proof", { proofAsset: { ...PROOF, contentType: "image/jpeg" } }],
    ["a proof with a missing key", { proofAsset: { ...PROOF, intrinsicHeight: undefined } }],
    ["a proof with an extra key", { proofAsset: { ...PROOF, storagePath: "admin/state.json" } }],
    ["an input with an extra key", { unexpected: true }],
  ])("rejects %s without calling the digest port", async (_label, over) => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(
      input(over as Partial<SpaceV2FrameIssueCandidateInput>),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it.each([
    ["null", null],
    ["a primitive", "issue"],
    ["an array", []],
  ])("rejects %s as the whole input", async (_label, value) => {
    const port = recordingPort();
    const result = await createSpaceV2FrameIssueCandidate(
      value as unknown as SpaceV2FrameIssueCandidateInput,
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });
});

// --- digest failures ---------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — digest failures", () => {
  it.each([
    [
      "a port that throws",
      {
        digest: () => {
          throw new Error("token=abc123 secret path /admin/state.json");
        },
      },
    ],
    [
      "a port that rejects",
      { digest: async () => Promise.reject(new Error("uid=operator-1 password=hunter2")) },
    ],
    ["a port that returns the wrong length", { digest: async () => new Uint8Array(16) }],
    ["a port that returns a non-Uint8Array", { digest: async () => [1, 2, 3] }],
  ])("maps %s to a safe digest failure", async (_label, port) => {
    const result = await createSpaceV2FrameIssueCandidate(
      input(),
      port as unknown as Parameters<typeof createSpaceV2FrameIssueCandidate>[1],
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_DIGEST_FAILED" });
  });
});

// --- hostile input -----------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — hostile input", () => {
  it("fails closed on a throwing getter instead of throwing", async () => {
    const hostile = {
      catalog: frameDoc(),
      selection: SELECTION,
      get frameOrientation(): "portrait" {
        throw new Error("revoked");
      },
      logicalWidth: 1000,
      frameColor: "#191A1D",
      transform: TRANSFORM,
      proofAsset: PROOF,
    };
    const port = recordingPort();

    const result = await createSpaceV2FrameIssueCandidate(
      hostile as unknown as SpaceV2FrameIssueCandidateInput,
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("fails closed on a revoked Proxy document", async () => {
    const revocable = Proxy.revocable(frameDoc(), {});
    revocable.revoke();
    const port = recordingPort();

    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog: revocable.proxy }),
      port,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED");
    expect(port.digest).not.toHaveBeenCalled();
  });

  // The catalog is detached once, so both projections describe the same instant. A template whose
  // art reference drifts between reads cannot be seen as "has art" by one projection and "no art"
  // by the other.
  it("refuses a template whose FIRST art read has art, however it drifts afterwards", async () => {
    let reads = 0;
    const template = {
      id: "ft1",
      name: "템플릿",
      type: "uploaded",
      clockEnabled: false,
      get dataUrl() {
        reads += 1;
        return reads === 1 ? "https://example.invalid/art.png" : "";
      },
    };
    const port = recordingPort();

    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog: frameDoc(template) }),
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY" });
    expect(port.digest).not.toHaveBeenCalled();
    expect(reads).toBe(1);
  });

  it("decides from the FIRST art read when the template only grows art afterwards", async () => {
    let reads = 0;
    const template = {
      id: "ft1",
      name: "템플릿",
      type: "uploaded",
      clockEnabled: false,
      get dataUrl() {
        reads += 1;
        return reads === 1 ? "" : "https://example.invalid/art.png";
      },
    };

    const result = await createSpaceV2FrameIssueCandidate(
      input({ catalog: frameDoc(template) }),
      recordingPort(),
    );

    expect(result).toEqual({ ok: true, value: EXPECTED_CANDIDATE });
    expect(reads).toBe(1);
  });

  it("reads a drifting value once, so the second read cannot reach the result", async () => {
    let reads = 0;
    const drifting = {
      ...input(),
      get logicalWidth() {
        reads += 1;
        return reads === 1 ? 1000 : 4;
      },
    };

    const result = await createSpaceV2FrameIssueCandidate(
      drifting as unknown as SpaceV2FrameIssueCandidateInput,
      recordingPort(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frameEvidence.logicalWidth).toBe(1000);
    expect(reads).toBe(1);
  });

  it("fails closed on a circular input without throwing", async () => {
    const circular = input() as unknown as Record<string, unknown>;
    circular.selection = circular;
    const port = recordingPort();

    const result = await createSpaceV2FrameIssueCandidate(
      circular as unknown as SpaceV2FrameIssueCandidateInput,
      port,
    );

    expect(result).toEqual({ ok: false, code: "SPACE_V2_ISSUE_INVALID_INPUT" });
    expect(port.digest).not.toHaveBeenCalled();
  });

  it("never mutates the caller's input", async () => {
    const original = input();
    const before = JSON.parse(JSON.stringify(original));

    await createSpaceV2FrameIssueCandidate(original, recordingPort());

    expect(JSON.parse(JSON.stringify(original))).toEqual(before);
  });
});

// --- boundary ----------------------------------------------------------------

describe("createSpaceV2FrameIssueCandidate — boundary", () => {
  const failures: SpaceV2FrameIssueCandidateInput[] = [
    input({ selection: null as unknown as FramePreviewSelection }),
    input({ catalog: doc({}) }),
    input({ catalog: frameDoc({ ...TEMPLATE, dataUrl: "https://example.invalid/art.png" }) }),
    input({ frameColor: "#191a1d" }),
  ];

  it("never leaks anything but a code on failure", async () => {
    for (const candidate of failures) {
      const result = await createSpaceV2FrameIssueCandidate(candidate, recordingPort());
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(Object.keys(result).sort()).toEqual(["code", "ok"]);
      expect(result.code).toMatch(/^SPACE_V2_ISSUE_[A-Z_]+$/);
      // no path, id, colour, digest, token, password, UID/email or thrown message.
      expect(JSON.stringify(result)).not.toMatch(
        /rebuild-space-assets|ft1|s1|#|AAECAw|token|password|uid|@|Error/i,
      );
    }
  });

  it("touches no network, Web Crypto, DOM or Canvas", async () => {
    const fetchSpy = vi.fn();
    const subtleSpy = vi.spyOn(globalThis.crypto.subtle, "digest");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    try {
      const result = await createSpaceV2FrameIssueCandidate(input(), recordingPort());
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      subtleSpy.mockRestore();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(subtleSpy).not.toHaveBeenCalled();
    expect("document" in globalThis).toBe(false);
  });

  it("stays out of the admin UI: App.tsx never imports or calls it", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    // Spec 083 composed the Space V2 issue PANEL into the admin shell, so `space-v2` is no longer a
    // usable proxy for "this module is unwired" — the panel's import path contains it. What this
    // test has always been about is THIS module, and that assertion is unchanged: the candidate
    // projector is still never imported or called by the admin screen.
    expect(app).not.toContain("issue-candidate");
    expect(app).not.toContain("createSpaceV2FrameIssueCandidate");
  });
});
