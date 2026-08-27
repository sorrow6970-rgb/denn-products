import { describe, expect, it } from "vitest";
import type { LocalImageElementPort } from "../canvas/localImageBinding";
import {
  createSpaceV2ProofDecoderOwner,
  type SpaceV2ProofDecoderPorts,
} from "./browser-png-decoder";

const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13];

class FakeImage implements LocalImageElementPort {
  onload: ((...args: never[]) => unknown) | null = null;
  onerror: ((...args: never[]) => unknown) | null = null;
  src = "";
  naturalWidth = 0;
  naturalHeight = 0;
}

interface Harness {
  readonly ports: SpaceV2ProofDecoderPorts;
  readonly blobs: { readonly bytes: Uint8Array; readonly type: string }[];
  readonly images: FakeImage[];
  readonly created: string[];
  readonly revoked: string[];
}

function harness(): Harness {
  const blobs: { bytes: Uint8Array; type: string }[] = [];
  const images: FakeImage[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  let sequence = 0;
  const ports: SpaceV2ProofDecoderPorts = {
    createBlob: (bytes) => {
      blobs.push({ bytes, type: "image/png" });
      return { bytes } as unknown as Blob;
    },
    createObjectUrl: () => {
      sequence += 1;
      const url = `blob:synthetic-${sequence}`;
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
  };
  return { ports, blobs, images, created, revoked };
}

function succeed(image: FakeImage, width: number, height: number): void {
  image.naturalWidth = width;
  image.naturalHeight = height;
  image.onload?.();
}

describe("space V2 browser PNG decoder — inertness", () => {
  it("touches no browser API at factory time", () => {
    const h = harness();
    createSpaceV2ProofDecoderOwner({ ports: h.ports });
    expect(h.blobs).toEqual([]);
    expect(h.images).toEqual([]);
    expect(h.created).toEqual([]);
  });

  it("builds its default browser ports without reading Image, URL or Blob", () => {
    // `Image` does not exist in this environment: constructing the owner must not reach for it.
    expect(() => createSpaceV2ProofDecoderOwner()).not.toThrow();
  });

  it("refuses a non-Uint8Array payload without creating a blob", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    await expect(owner.decoder.decode("bytes" as never)).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_DECODE_INVALID_INPUT",
    });
    expect(h.blobs).toEqual([]);
    expect(h.created).toEqual([]);
  });
});

describe("space V2 browser PNG decoder — decode", () => {
  it("copies the bytes, fixes the MIME and returns the natural size", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const input = new Uint8Array(PNG);
    const pending = owner.decoder.decode(input);

    expect(h.blobs).toHaveLength(1);
    expect(h.blobs[0]?.type).toBe("image/png");
    expect([...(h.blobs[0]?.bytes ?? [])]).toEqual(PNG);
    // The caller's array is never the one handed to the browser.
    expect(h.blobs[0]?.bytes).not.toBe(input);
    input[0] = 0;
    expect([...(h.blobs[0]?.bytes ?? [])]).toEqual(PNG);

    const image = h.images[0];
    expect(image).toBeDefined();
    if (!image) throw new Error("expected an image port");
    expect(image.src).toBe(h.created[0]);
    succeed(image, 16, 24);

    const decoded = await pending;
    expect(decoded.intrinsicWidth).toBe(16);
    expect(decoded.intrinsicHeight).toBe(24);
    expect(Object.keys(decoded).sort()).toEqual(["imageRef", "intrinsicHeight", "intrinsicWidth"]);
    // The synthetic key carries no path, URL or MIME, and satisfies the plan's identifier grammar.
    expect(decoded.imageRef).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(decoded.imageRef).not.toContain("blob:");
  });

  it("binds exactly the decoded drawable under the returned key", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    const image = h.images[0];
    if (!image) throw new Error("expected an image port");
    succeed(image, 4, 6);
    const decoded = await pending;

    expect(owner.bindings.get(decoded.imageRef)).toBe(image);
    expect(owner.bindings.get(`${decoded.imageRef}-other`)).toBeUndefined();
  });

  it("revokes the private URL exactly once on success", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    const image = h.images[0];
    if (!image) throw new Error("expected an image port");
    succeed(image, 4, 6);
    await pending;

    expect(h.revoked).toEqual([h.created[0]]);
    owner.clear();
    owner.dispose();
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("rejects a browser decode error and still revokes exactly once", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    h.images[0]?.onerror?.();
    await expect(pending).rejects.toMatchObject({ code: "SPACE_V2_PROOF_DECODE_FAILED" });
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("rejects a decode whose natural size is not a positive pair", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    const image = h.images[0];
    if (!image) throw new Error("expected an image port");
    succeed(image, 0, 24);
    await expect(pending).rejects.toMatchObject({ code: "SPACE_V2_PROOF_DECODE_FAILED" });
    expect(owner.bindings.get("user-image-1")).toBeUndefined();
  });

  it("never leaks the object URL or the MIME into a failure", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    h.images[0]?.onerror?.();
    const error = await pending.then(
      () => null,
      (thrown: unknown) => thrown as Error,
    );
    expect(error?.message).toBe("SPACE_V2_PROOF_DECODE_FAILED");
    expect(error?.message).not.toContain("blob:");
    expect(error?.message).not.toContain("image/png");
  });
});

describe("space V2 browser PNG decoder — lifecycle", () => {
  it("supersedes an in-flight decode and ignores its late completion", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const first = owner.decoder.decode(new Uint8Array(PNG));
    const firstImage = h.images[0];
    const second = owner.decoder.decode(new Uint8Array(PNG));
    const secondImage = h.images[1];
    if (!firstImage || !secondImage) throw new Error("expected two image ports");

    await expect(first).rejects.toMatchObject({ code: "SPACE_V2_PROOF_DECODE_SUPERSEDED" });
    // The superseded load is detached, so its late success cannot reach the binding at all.
    expect(firstImage.onload).toBeNull();
    succeed(firstImage, 999, 999);
    succeed(secondImage, 8, 12);

    const decoded = await second;
    expect(decoded.intrinsicWidth).toBe(8);
    expect(owner.bindings.get(decoded.imageRef)).toBe(secondImage);
    expect(h.revoked).toEqual(h.created);
  });

  it("clears the binding and settles a waiting decode", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    owner.clear();
    await expect(pending).rejects.toMatchObject({ code: "SPACE_V2_PROOF_DECODE_SUPERSEDED" });
    expect(h.revoked).toEqual([h.created[0]]);
  });

  it("drops the ready binding on clear and decodes again afterwards", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const first = owner.decoder.decode(new Uint8Array(PNG));
    const firstImage = h.images[0];
    if (!firstImage) throw new Error("expected an image port");
    succeed(firstImage, 4, 6);
    const decoded = await first;
    expect(owner.bindings.get(decoded.imageRef)).toBe(firstImage);

    owner.clear();
    expect(owner.bindings.get(decoded.imageRef)).toBeUndefined();

    const second = owner.decoder.decode(new Uint8Array(PNG));
    const secondImage = h.images[1];
    if (!secondImage) throw new Error("expected a second image port");
    succeed(secondImage, 4, 6);
    const again = await second;
    expect(owner.bindings.get(again.imageRef)).toBe(secondImage);
  });

  it("settles a waiting decode on dispose and refuses later decodes", async () => {
    const h = harness();
    const owner = createSpaceV2ProofDecoderOwner({ ports: h.ports });
    const pending = owner.decoder.decode(new Uint8Array(PNG));
    owner.dispose();
    await expect(pending).rejects.toMatchObject({ code: "SPACE_V2_PROOF_DECODE_DISPOSED" });
    await expect(owner.decoder.decode(new Uint8Array(PNG))).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_DECODE_DISPOSED",
    });
    expect(h.images).toHaveLength(1);
    expect(h.revoked).toEqual([h.created[0]]);
  });
});
