import { describe, expect, it, vi } from "vitest";
import { SPACE_V2_ASSET_CONTENT_TYPE, SPACE_V2_ASSET_MAX_BYTES } from "@denn/firebase/space-write";
import {
  createAdminProofDraftOwner,
  type AdminProofDraftPorts,
  type AdminProofImageElementPort,
} from "./browser-proof-draft";

/** A real `HTMLImageElement` must satisfy the element port (compile-time only). */
const _elementPortIsStructural: AdminProofImageElementPort = null as unknown as HTMLImageElement;
void _elementPortIsStructural;

interface Harness {
  readonly ports: AdminProofDraftPorts;
  /** Every image the owner created, in order, so a superseded load can be driven on purpose. */
  readonly images: FakeImage[];
  readonly created: string[];
  readonly revoked: string[];
  readonly blobs: Uint8Array[];
}

class FakeImage implements AdminProofImageElementPort {
  onload: ((...args: never[]) => unknown) | null = null;
  onerror: ((...args: never[]) => unknown) | null = null;
  src = "";
  naturalWidth = 1200;
  naturalHeight = 800;

  succeed(width = this.naturalWidth, height = this.naturalHeight): void {
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload?.();
  }

  fail(): void {
    this.onerror?.();
  }
}

function harness(overrides: Partial<AdminProofDraftPorts> = {}): Harness {
  const images: FakeImage[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const blobs: Uint8Array[] = [];
  let sequence = 0;
  const ports: AdminProofDraftPorts = {
    readBytes: async (file) => file as Uint8Array,
    createBlob: (bytes) => {
      blobs.push(bytes);
      return bytes as unknown as Blob;
    },
    createObjectUrl: () => {
      sequence += 1;
      const url = `blob:fake/${sequence}`;
      created.push(url);
      return url;
    },
    revokeObjectUrl: (url) => {
      revoked.push(url);
    },
    createImage: () => {
      const image = new FakeImage();
      images.push(image);
      return image;
    },
    ...overrides,
  };
  return { ports, images, created, revoked, blobs };
}

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("createAdminProofDraftOwner", () => {
  it("agrees with the package's asset contract without importing it into the bundle", async () => {
    // The owner states the content type and the byte cap locally so the write barrel stays out of
    // the admin's eager entry. This is the drift check that keeps that copy honest.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./browser-proof-draft.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toContain('from "@denn/firebase/space-write"');
    expect(source).toContain(`const PROOF_CONTENT_TYPE = "${SPACE_V2_ASSET_CONTENT_TYPE}"`);
    expect(SPACE_V2_ASSET_MAX_BYTES).toBe(20 * 1024 * 1024 - 1);
    expect(source).toContain("const PROOF_MAX_BYTES = 20 * 1024 * 1024 - 1;");
  });

  it("starts idle and holds no drawable", () => {
    const { ports } = harness();
    const owner = createAdminProofDraftOwner({ ports });
    expect(owner.getSnapshot()).toEqual({ status: "idle" });
    expect(owner.bindings.get("admin-proof-1")).toBeUndefined();
    expect(owner.freeze()).toBeNull();
  });

  it("loads a PNG into a ready state with a synthetic ref and the decoded size", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    expect(owner.getSnapshot().status).toBe("loading");
    await settle();
    h.images[0]?.succeed(1200, 800);

    const state = owner.getSnapshot();
    expect(state).toEqual({
      status: "ready",
      imageRef: "admin-proof-1",
      intrinsicWidth: 1200,
      intrinsicHeight: 800,
    });
    if (state.status !== "ready") return;
    expect(owner.bindings.get(state.imageRef)).toBe(h.images[0]);
    // A key nobody bound resolves to nothing — never a "closest" match.
    expect(owner.bindings.get("admin-proof-2")).toBeUndefined();
    // The blob was built from a COPY of the caller's bytes.
    expect(h.blobs[0]).not.toBe(PNG);
    expect(h.blobs[0]).toEqual(PNG);
  });

  it("keeps the picked file's name, MIME and URL out of the public state", async () => {
    const h = harness({
      readBytes: async (file) => (file as { bytes: Uint8Array }).bytes,
    });
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load({ name: "고객사진-2026.png", type: "image/png", bytes: PNG });
    await settle();
    h.images[0]?.succeed();
    const serialized = JSON.stringify(owner.getSnapshot());
    expect(serialized).not.toContain("고객사진");
    expect(serialized).not.toContain("image/png");
    expect(serialized).not.toContain("blob:");
  });

  it("exports a fresh copy of the exact bytes it previewed", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    const source = new Uint8Array(PNG);
    owner.load(source);
    await settle();
    h.images[0]?.succeed();

    const frozen = owner.freeze();
    expect(frozen).not.toBeNull();
    if (frozen === null) return;
    const first = await frozen.exportProofPng();
    const second = await frozen.exportProofPng();
    expect(first).toEqual(PNG);
    expect(second).toEqual(PNG);
    // Fresh every call: one consumer cannot corrupt another's bytes.
    expect(first).not.toBe(second);
    first[0] = 0;
    expect(await frozen.exportProofPng()).toEqual(PNG);
    // And the caller's own array cannot reach the export after the fact.
    source.fill(0);
    expect(await frozen.exportProofPng()).toEqual(PNG);
  });

  it("keeps the frozen handle independent of a later replace or clear", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();
    h.images[0]?.succeed();
    const frozen = owner.freeze();

    const replacement = new Uint8Array([9, 9, 9]);
    owner.load(replacement);
    await settle();
    h.images[1]?.succeed(64, 64);
    expect(await frozen?.exportProofPng()).toEqual(PNG);

    owner.clear();
    expect(owner.getSnapshot()).toEqual({ status: "idle" });
    expect(await frozen?.exportProofPng()).toEqual(PNG);
  });

  it("refuses an unreadable file, an empty file and one at the asset limit", async () => {
    const unreadable = harness({
      readBytes: async () => {
        throw new Error("permission denied for /Users/operator/photo.png");
      },
    });
    const owner = createAdminProofDraftOwner({ ports: unreadable.ports });
    owner.load({});
    await settle();
    expect(owner.getSnapshot()).toEqual({ status: "failed", code: "ADMIN_PROOF_READ_FAILED" });
    expect(JSON.stringify(owner.getSnapshot())).not.toContain("operator");

    const sized = harness();
    const owner2 = createAdminProofDraftOwner({ ports: sized.ports });
    owner2.load(new Uint8Array(0));
    await settle();
    expect(owner2.getSnapshot()).toEqual({
      status: "failed",
      code: "ADMIN_PROOF_SIZE_REJECTED",
    });
    // No blob, no URL and no image were created for a rejected size.
    expect(sized.created).toEqual([]);
    expect(sized.images).toEqual([]);

    owner2.load(new Uint8Array(SPACE_V2_ASSET_MAX_BYTES + 1));
    await settle();
    expect(owner2.getSnapshot()).toEqual({
      status: "failed",
      code: "ADMIN_PROOF_SIZE_REJECTED",
    });
  });

  it("fails closed when the bytes cannot be decoded, and exports nothing", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    // A JPEG (or anything else) renamed to .png reaches this path: the Blob's type is FIXED to
    // image/png by the owner, so the browser decode is what decides, not the file's own MIME.
    owner.load(new Uint8Array([255, 216, 255, 224]));
    await settle();
    h.images[0]?.fail();
    expect(owner.getSnapshot()).toEqual({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
    expect(owner.freeze()).toBeNull();
    expect(owner.bindings.get("admin-proof-1")).toBeUndefined();
    expect(h.revoked).toEqual(h.created);
  });

  it("rejects a decode whose intrinsic size is not a positive integer pair", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();
    h.images[0]?.succeed(0, 800);
    expect(owner.getSnapshot()).toEqual({
      status: "failed",
      code: "ADMIN_PROOF_INVALID_DIMENSIONS",
    });

    owner.load(PNG);
    await settle();
    h.images[1]?.succeed(1200.5, 800);
    expect(owner.getSnapshot()).toEqual({
      status: "failed",
      code: "ADMIN_PROOF_INVALID_DIMENSIONS",
    });
    expect(owner.freeze()).toBeNull();
  });

  it("lets a superseded decode settle without overwriting the current draft", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();
    owner.load(new Uint8Array([1, 2, 3, 4]));
    await settle();

    // The SECOND load wins even though the first one finishes afterwards.
    h.images[1]?.succeed(640, 480);
    h.images[0]?.succeed(4000, 4000);
    expect(owner.getSnapshot()).toEqual({
      status: "ready",
      imageRef: "admin-proof-1",
      intrinsicWidth: 640,
      intrinsicHeight: 480,
    });
    expect(await owner.freeze()?.exportProofPng()).toEqual(new Uint8Array([1, 2, 3, 4]));
    // The abandoned load's URL was revoked exactly once.
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("revokes each object URL exactly once across replace, clear and dispose", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();
    h.images[0]?.succeed();
    owner.load(PNG);
    await settle();
    h.images[1]?.succeed();
    expect(h.revoked).toEqual([h.created[0]]);

    owner.clear();
    expect(h.revoked).toEqual([h.created[0], h.created[1]]);

    owner.load(PNG);
    await settle();
    h.images[2]?.succeed();
    owner.dispose();
    expect(h.revoked).toEqual([h.created[0], h.created[1], h.created[2]]);
    expect(new Set(h.revoked).size).toBe(h.revoked.length);
  });

  it("does nothing after dispose", async () => {
    const h = harness();
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.dispose();
    owner.load(PNG);
    await settle();
    expect(h.images).toEqual([]);
    expect(owner.getSnapshot()).toEqual({ status: "idle" });
    expect(owner.freeze()).toBeNull();
    expect(owner.subscribe(() => undefined)()).toBeUndefined();
  });

  it("survives a throwing subscriber and a throwing revoke port", async () => {
    const h = harness({
      revokeObjectUrl: () => {
        throw new Error("revoked twice");
      },
    });
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    const listener = vi.fn(() => {
      throw new Error("subscriber exploded");
    });
    owner.subscribe(listener);
    owner.load(PNG);
    await settle();
    h.images[0]?.succeed();
    expect(owner.getSnapshot().status).toBe("ready");
    expect(() => owner.clear()).not.toThrow();
    expect(listener).toHaveBeenCalled();
  });

  it("revokes the URL it already made when a later step of the same load throws", async () => {
    // The failure Codex reproduced: the URL exists, `createImage()` throws, and the load returns
    // through a catch that only publishes. Nothing else in the owner knows that URL any more, so
    // unless THIS path releases it the object URL outlives the page.
    const h = harness({
      createImage: () => {
        throw new Error("no element for you");
      },
    });
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();

    expect(owner.getSnapshot()).toEqual({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
    expect(h.created).toHaveLength(1);
    expect(h.revoked).toEqual(h.created);
    // Nothing survives the failure: no drawable, no frozen handle.
    expect(owner.bindings.get("admin-proof-1")).toBeUndefined();
    expect(owner.freeze()).toBeNull();

    // Exactly once: the release that clear() and dispose() perform cannot revoke it a second time.
    owner.clear();
    owner.dispose();
    expect(h.revoked).toEqual(h.created);
  });

  it("keeps created and revoked equal when the image source assignment throws", async () => {
    // A browser that refuses the assignment is the same shape of failure, one step later.
    const h = harness({
      createImage: () => {
        const image = new FakeImage();
        Object.defineProperty(image, "src", {
          set: () => {
            throw new Error("refused");
          },
        });
        return image;
      },
    });
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();

    expect(owner.getSnapshot()).toEqual({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
    expect(h.revoked).toEqual(h.created);
    expect(new Set(h.revoked).size).toBe(h.revoked.length);
    expect(owner.freeze()).toBeNull();
  });

  it("fails closed when the object URL port refuses the bytes", async () => {
    const h = harness({
      createObjectUrl: () => {
        throw new Error("no URL for you");
      },
    });
    const owner = createAdminProofDraftOwner({ ports: h.ports });
    owner.load(PNG);
    await settle();
    expect(owner.getSnapshot()).toEqual({ status: "failed", code: "ADMIN_PROOF_DECODE_FAILED" });
    expect(h.images).toEqual([]);
  });
});
