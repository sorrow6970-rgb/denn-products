import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpaceV2ProofObjectMetadata, SpaceV2ProofReadFirebaseFacade } from "./proof-facade";
import {
  createSpaceV2ProofBytesReader,
  createSpaceV2ProofBytesReaderWithTimeout,
  SPACE_V2_PROOF_READ_MAX_BYTES,
  SPACE_V2_PROOF_READ_TIMEOUT_MS,
} from "./proof-reader";

const OBJECT_PATH = "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png";
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const METADATA = { fullPath: OBJECT_PATH, contentType: "image/png", size: PNG.length };

function pngBuffer(): ArrayBuffer {
  return new Uint8Array(PNG).buffer;
}

interface Recorder {
  readonly facade: SpaceV2ProofReadFirebaseFacade;
  readonly order: string[];
  readonly metadataArgs: string[];
  readonly bytesArgs: { objectPath: string; maxBytes: number }[];
}

type Producer<T> = () => Promise<T> | T;

function recorder(
  metadata: Producer<unknown> = () => METADATA,
  bytes: Producer<unknown> = pngBuffer,
): Recorder {
  const order: string[] = [];
  const metadataArgs: string[] = [];
  const bytesArgs: { objectPath: string; maxBytes: number }[] = [];
  const facade = {
    readMetadata: (objectPath: string) => {
      order.push("metadata");
      metadataArgs.push(objectPath);
      return Promise.resolve(metadata()) as Promise<SpaceV2ProofObjectMetadata>;
    },
    readBytes: (objectPath: string, maxBytes: number) => {
      order.push("bytes");
      bytesArgs.push({ objectPath, maxBytes });
      return Promise.resolve(bytes()) as Promise<ArrayBuffer>;
    },
  };
  return { facade, order, metadataArgs, bytesArgs };
}

const request = (overrides: Record<string, unknown> = {}) => ({
  objectPath: OBJECT_PATH,
  maxBytes: SPACE_V2_PROOF_READ_MAX_BYTES,
  ...overrides,
});

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // The promise is handed to the reader, which attaches its handlers immediately, so settling it
  // late never produces an unhandled rejection here either.
  return { promise, resolve, reject };
}

/**
 * Attaches the rejection handler in the SAME tick the read starts. Waiting until after the timers
 * advance would make the reader's own (correct) rejection look like an unhandled one.
 */
function capture(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("space V2 proof bytes reader — request and path validation", () => {
  const malformed: [string, unknown][] = [
    ["null", null],
    ["a primitive", "path"],
    ["an array", [OBJECT_PATH, 8]],
    ["an extra key", { ...request(), bucket: "denn-products" }],
    ["a missing key", { objectPath: OBJECT_PATH }],
  ];

  for (const [label, value] of malformed) {
    it(`refuses ${label} without calling the facade`, async () => {
      const seam = recorder();
      await expect(
        createSpaceV2ProofBytesReader(seam.facade).read(value as never),
      ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_INVALID_REQUEST" });
      expect(seam.order).toEqual([]);
    });
  }

  it("refuses a non-enumerable own key", async () => {
    const seam = recorder();
    const hidden = { objectPath: OBJECT_PATH };
    Object.defineProperty(hidden, "maxBytes", { value: 8, enumerable: false });
    await expect(
      createSpaceV2ProofBytesReader(seam.facade).read(hidden as never),
    ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_INVALID_REQUEST" });
    expect(seam.order).toEqual([]);
  });

  const badPaths = [
    "REBUILD-SPACE-ASSETS/objects/123E4567-E89B-42D3-A456-426614174000.PNG",
    "rebuild-space-assets/objects/123E4567-E89B-42D3-A456-426614174000.png",
    "admin/state.json",
    "published/state.json",
    "rebuild-admin-state/objects/123e4567-e89b-42d3-a456-426614174000.png",
    "gs://denn-products.firebasestorage.app/rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
    "https://example.test/rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
    "rebuild-space-assets/objects/../../admin/state.json",
    "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png?alt=media",
    "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png#fragment",
    "rebuild-space-assets/objects/123e4567-e89b-12d3-a456-426614174000.png",
    "rebuild-space-assets/objects/123e4567-e89b-42d3-c456-426614174000.png",
    "rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.jpg",
    "/rebuild-space-assets/objects/123e4567-e89b-42d3-a456-426614174000.png",
    "",
  ];

  for (const objectPath of badPaths) {
    it(`refuses the path ${JSON.stringify(objectPath)} without calling the facade`, async () => {
      const seam = recorder();
      await expect(
        createSpaceV2ProofBytesReader(seam.facade).read(request({ objectPath }) as never),
      ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_INVALID_REQUEST" });
      expect(seam.order).toEqual([]);
    });
  }

  const badCeilings: unknown[] = [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    SPACE_V2_PROOF_READ_MAX_BYTES + 1,
    Number.MAX_SAFE_INTEGER,
    "8",
    null,
  ];

  for (const maxBytes of badCeilings) {
    it(`refuses the ceiling ${String(maxBytes)} without calling the facade`, async () => {
      const seam = recorder();
      await expect(
        createSpaceV2ProofBytesReader(seam.facade).read(request({ maxBytes }) as never),
      ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_INVALID_REQUEST" });
      expect(seam.order).toEqual([]);
    });
  }

  it("reads a hostile getter once so the checked path is the fetched path", async () => {
    const seam = recorder();
    let reads = 0;
    const hostile = {
      get objectPath() {
        reads += 1;
        return reads === 1 ? OBJECT_PATH : "admin/state.json";
      },
      maxBytes: PNG.length,
    };
    await expect(createSpaceV2ProofBytesReader(seam.facade).read(hostile)).resolves.toBeDefined();
    expect(reads).toBe(1);
    expect(seam.metadataArgs).toEqual([OBJECT_PATH]);
    expect(seam.bytesArgs).toEqual([{ objectPath: OBJECT_PATH, maxBytes: PNG.length }]);
  });

  it("refuses a throwing getter without calling the facade", async () => {
    const seam = recorder();
    const hostile = {
      get objectPath(): string {
        throw new Error("hostile");
      },
      maxBytes: PNG.length,
    };
    await expect(createSpaceV2ProofBytesReader(seam.facade).read(hostile)).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_INVALID_REQUEST",
    });
    expect(seam.order).toEqual([]);
  });

  it("refuses a facade without both read methods", async () => {
    const seam = recorder();
    const partial = { readMetadata: seam.facade.readMetadata } as SpaceV2ProofReadFirebaseFacade;
    await expect(createSpaceV2ProofBytesReader(partial).read(request())).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_INVALID_FACADE",
    });
    expect(seam.order).toEqual([]);
  });
});

describe("space V2 proof bytes reader — metadata gate", () => {
  const rejected: [string, unknown][] = [
    ["a substituted fullPath", { ...METADATA, fullPath: "admin/state.json" }],
    ["a missing fullPath", { contentType: "image/png", size: PNG.length }],
    ["a non-PNG content type", { ...METADATA, contentType: "image/jpeg" }],
    ["an absent content type", { ...METADATA, contentType: undefined }],
    ["a zero size", { ...METADATA, size: 0 }],
    ["a negative size", { ...METADATA, size: -1 }],
    ["a fractional size", { ...METADATA, size: 8.5 }],
    ["a string size", { ...METADATA, size: "8" }],
    ["a non-object result", "image/png"],
    ["a null result", null],
  ];

  for (const [label, metadata] of rejected) {
    it(`downloads no bytes for ${label}`, async () => {
      const seam = recorder(() => metadata);
      await expect(
        createSpaceV2ProofBytesReader(seam.facade).read(request()),
      ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_METADATA_REJECTED" });
      expect(seam.order).toEqual(["metadata"]);
    });
  }

  it("downloads no bytes when the object is larger than the caller's ceiling", async () => {
    const seam = recorder(() => ({ ...METADATA, size: 9 }));
    await expect(
      createSpaceV2ProofBytesReader(seam.facade).read(request({ maxBytes: 8 })),
    ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_METADATA_REJECTED" });
    expect(seam.order).toEqual(["metadata"]);
  });

  it("downloads no bytes and does not retry when metadata rejects", async () => {
    const seam = recorder(() => Promise.reject(new Error("firebase/unauthorized")));
    await expect(createSpaceV2ProofBytesReader(seam.facade).read(request())).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE",
    });
    expect(seam.order).toEqual(["metadata"]);
  });

  it("downloads no bytes when the facade throws synchronously", async () => {
    const facade = {
      readMetadata: () => {
        throw new Error("firebase/internal");
      },
      readBytes: () => Promise.resolve(pngBuffer()),
    } as unknown as SpaceV2ProofReadFirebaseFacade;
    await expect(createSpaceV2ProofBytesReader(facade).read(request())).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE",
    });
  });
});

describe("space V2 proof bytes reader — byte gate", () => {
  const rejected: [string, unknown][] = [
    ["a Uint8Array instead of an ArrayBuffer", new Uint8Array(PNG)],
    ["a Blob-like object", { size: PNG.length, type: "image/png" }],
    ["a string", "bytes"],
    ["null", null],
  ];

  for (const [label, bytes] of rejected) {
    it(`refuses ${label}`, async () => {
      const seam = recorder(
        () => METADATA,
        () => bytes,
      );
      await expect(
        createSpaceV2ProofBytesReader(seam.facade).read(request()),
      ).rejects.toMatchObject({ code: "SPACE_V2_PROOF_READ_BYTES_REJECTED" });
      expect(seam.order).toEqual(["metadata", "bytes"]);
    });
  }

  it("refuses a payload whose length disagrees with the metadata size", async () => {
    const seam = recorder(
      () => METADATA,
      () => new Uint8Array([1, 2, 3]).buffer,
    );
    await expect(createSpaceV2ProofBytesReader(seam.facade).read(request())).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_BYTES_REJECTED",
    });
  });

  it("does not retry when the byte read rejects", async () => {
    const seam = recorder(
      () => METADATA,
      () => Promise.reject(new Error("firebase/retry-limit")),
    );
    await expect(createSpaceV2ProofBytesReader(seam.facade).read(request())).rejects.toMatchObject({
      code: "SPACE_V2_PROOF_READ_BYTES_UNAVAILABLE",
    });
    expect(seam.order).toEqual(["metadata", "bytes"]);
  });
});

describe("space V2 proof bytes reader — success shape", () => {
  it("calls metadata then bytes exactly once each and returns only the agreed keys", async () => {
    const seam = recorder();
    const result = await createSpaceV2ProofBytesReader(seam.facade).read(request());
    expect(seam.order).toEqual(["metadata", "bytes"]);
    expect(seam.metadataArgs).toEqual([OBJECT_PATH]);
    expect(seam.bytesArgs).toEqual([
      { objectPath: OBJECT_PATH, maxBytes: SPACE_V2_PROOF_READ_MAX_BYTES },
    ]);
    expect(Object.keys(result)).toEqual(["bytes", "contentType"]);
    expect(result.contentType).toBe("image/png");
    expect([...result.bytes]).toEqual(PNG);
  });

  it("hands back a detached copy the caller may mutate", async () => {
    const source = pngBuffer();
    const seam = recorder(
      () => METADATA,
      () => source,
    );
    const reader = createSpaceV2ProofBytesReader(seam.facade);
    const first = await reader.read(request());
    first.bytes[0] = 0;
    expect([...new Uint8Array(source)]).toEqual(PNG);
    const second = await reader.read(request());
    expect([...second.bytes]).toEqual(PNG);
    expect(second.bytes.buffer).not.toBe(first.bytes.buffer);
    expect(second.bytes.buffer).not.toBe(source);
  });

  it("keeps every failure message free of the path, bucket and raw SDK text", async () => {
    const seam = recorder(() =>
      Promise.reject({ code: "storage/unauthorized", serverResponse: OBJECT_PATH }),
    );
    const error = await createSpaceV2ProofBytesReader(seam.facade)
      .read(request())
      .then(
        () => null,
        (thrown: unknown) => thrown as Error & { code: string },
      );
    expect(error?.code).toBe("SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE");
    expect(error?.message).toBe("SPACE_V2_PROOF_READ_METADATA_UNAVAILABLE");
    expect(Object.keys(error ?? {})).toEqual(["name", "code"]);
    expect(JSON.stringify({ message: error?.message, code: error?.code })).not.toContain(
      "rebuild-space-assets",
    );
    expect(error?.message).not.toContain("storage/unauthorized");
  });
});

describe("space V2 proof bytes reader — single wall-clock budget", () => {
  it("exports the 20 second contract budget", () => {
    expect(SPACE_V2_PROOF_READ_TIMEOUT_MS).toBe(20_000);
  });

  it("times out a hanging metadata read and downloads no bytes", async () => {
    vi.useFakeTimers();
    const seam = recorder(() => new Promise<never>(() => {}));
    const settled = capture(createSpaceV2ProofBytesReader(seam.facade).read(request()));
    await vi.advanceTimersByTimeAsync(SPACE_V2_PROOF_READ_TIMEOUT_MS);
    expect(await settled).toMatchObject({ code: "SPACE_V2_PROOF_READ_TIMEOUT" });
    expect(seam.order).toEqual(["metadata"]);
  });

  it("spends one shared budget across both steps rather than 20 seconds each", async () => {
    vi.useFakeTimers();
    const seam = recorder(
      () => new Promise((resolve) => setTimeout(() => resolve(METADATA), 15_000)),
      () => new Promise<never>(() => {}),
    );
    const settled = capture(createSpaceV2ProofBytesReader(seam.facade).read(request()));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(seam.order).toEqual(["metadata", "bytes"]);
    // Only 5s of the byte read has elapsed; a per-step budget would still be waiting here.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await settled).toMatchObject({ code: "SPACE_V2_PROOF_READ_TIMEOUT" });
  });

  it("discards a late success without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const late = deferred<ArrayBuffer>();
      const seam = recorder(
        () => METADATA,
        () => late.promise,
      );
      const settled = capture(createSpaceV2ProofBytesReader(seam.facade).read(request()));
      await vi.advanceTimersByTimeAsync(SPACE_V2_PROOF_READ_TIMEOUT_MS);
      expect(await settled).toMatchObject({ code: "SPACE_V2_PROOF_READ_TIMEOUT" });
      late.resolve(pngBuffer());
      await vi.advanceTimersByTimeAsync(0);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("discards a late rejection without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const late = deferred<never>();
      const seam = recorder(() => late.promise);
      const settled = capture(createSpaceV2ProofBytesReader(seam.facade).read(request()));
      await vi.advanceTimersByTimeAsync(SPACE_V2_PROOF_READ_TIMEOUT_MS);
      expect(await settled).toMatchObject({ code: "SPACE_V2_PROOF_READ_TIMEOUT" });
      late.reject(new Error("late network failure"));
      await vi.advanceTimersByTimeAsync(0);
      expect(unhandled).toEqual([]);
      expect(seam.order).toEqual(["metadata"]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("clears the timer on success so nothing keeps running after the read", async () => {
    vi.useFakeTimers();
    const seam = recorder();
    await createSpaceV2ProofBytesReaderWithTimeout(seam.facade, 50).read(request());
    expect(vi.getTimerCount()).toBe(0);
  });
});
