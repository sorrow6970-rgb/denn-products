import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BackgroundAbsenceJob,
  type BackgroundFileReaderPort,
  createRoomBackgroundAbsenceJob as create,
} from "./background-file";

// Synthetic envelopes, not actual photographs or native-decode proofs.
const jpeg = () =>
  new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
function png() {
  const chunk = (name: string, data: number[]) => {
    const body = [...Array.from(name, (c) => c.charCodeAt(0)), ...data];
    let crc = 0xffffffff;
    for (const b of body) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    return [
      0,
      0,
      0,
      data.length,
      ...body,
      crc >>> 24,
      (crc >>> 16) & 255,
      (crc >>> 8) & 255,
      crc & 255,
    ];
  };
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk("IHDR", [0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
    ...chunk("IDAT", [1]),
    ...chunk("IEND", []),
  ]);
}
class Reader implements BackgroundFileReaderPort {
  result: unknown;
  readyState = 2;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer = vi.fn((_blob: Blob) => {});
  abort = vi.fn(() => this.onabort?.());
  constructor(bytes: Uint8Array<ArrayBuffer>) {
    this.result = bytes.buffer;
  }
}
const failure = (suffix: string) => ({ ok: false, code: `ROOM_BACKGROUND_${suffix}` });
const request = (file: unknown, maxEdge: unknown = 8000) => ({ file, budget: { maxEdge } });
function setup(bytes = jpeg()) {
  const reader = new Reader(bytes);
  const file = new Blob([bytes], { type: "image/gif" });
  const factory = vi.fn(() => reader);
  const made = create(request(file), { createReader: factory });
  if (!made.ok) throw new Error("setup");
  return { reader, bytes, file, factory, job: made.job };
}
async function finish(s: ReturnType<typeof setup>) {
  const pending = s.job.run();
  s.reader.onload?.();
  const result = await pending;
  if (!result.ok) throw new Error("expected success");
  return result;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec119 core-only absence snapshot ownership", () => {
  it.each(["jpeg", "png"])("hands off identical immutable %s bytes once", async (format) => {
    const s = setup(format === "jpeg" ? jpeg() : png());
    const original = Array.from(s.bytes);
    expect(s.factory).not.toHaveBeenCalled();
    const pending = s.job.run();
    expect(s.job.run()).toBe(pending);
    s.reader.onload?.();
    const result = await pending;
    if (!result.ok) throw new Error("expected success");
    s.bytes.fill(0);
    const pair = result.lease.take();
    expect(pair).not.toBeNull();
    if (!pair) throw new Error("missing pair");
    expect(Object.isFrozen(pair)).toBe(true);
    expect(Object.isFrozen(result.lease)).toBe(true);
    expect(pair?.evidence).toMatchObject({
      format,
      metadataPolicy: "core-only-v1",
      orientationBasis: "encoded-pixels",
      validation: "METADATA_ABSENCE_ONLY",
      decodeAllowed: false,
    });
    expect(pair?.blob.type).toBe(`image/${format}`);
    expect(Array.from(new Uint8Array(await pair.blob.arrayBuffer()))).toEqual(original);
    expect(result.lease.take()).toBeNull();
    s.job.cancel();
    result.lease.release();
    expect(pair?.blob.size).toBe(original.length);
    expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it("does not mix two jobs", async () => {
    const a = setup(),
      b = setup(png());
    const ar = await finish(a),
      br = await finish(b);
    ar.lease.release();
    expect(ar.lease.take()).toBeNull();
    expect(br.lease.take()?.evidence.format).toBe("png");
  });
  it.each(["release", "cancel", "dispose"] as const)(
    "%s clears an unclaimed pair",
    async (action) => {
      const s = setup(),
        result = await finish(s);
      if (action === "release") result.lease.release();
      else s.job[action]();
      expect(result.lease.take()).toBeNull();
      expect(await s.job.run()).toBe(result);
    },
  );
  for (const action of ["cancel", "dispose"] as const) {
    it.each(["before", "pending", "result"])(
      `${action} at %s excludes late handoff`,
      async (when) => {
        const s = setup();
        if (when === "before") s.job[action]();
        if (when === "result")
          Object.defineProperty(s.reader, "result", {
            get() {
              s.job[action]();
              return s.bytes.buffer;
            },
          });
        const pending = s.job.run(),
          late = s.reader.onload;
        if (when === "pending") s.job[action]();
        late?.();
        late?.();
        expect(await pending).toEqual(
          failure(action === "cancel" ? "FILE_CANCELLED" : "FILE_DISPOSED"),
        );
        expect(s.job.run()).toBe(pending);
        expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(when === "before" ? 0 : 1);
        expect(s.reader.abort).toHaveBeenCalledTimes(when === "before" ? 0 : 1);
      },
    );
  }
  it.each(["factory", "read", "cleanup"])("contains reentrant cancellation in %s", async (when) => {
    const bytes = jpeg(),
      reader = new Reader(bytes);
    let job: BackgroundAbsenceJob;
    const made = create(request(new Blob([bytes])), {
      createReader() {
        if (when === "factory") job.cancel();
        return reader;
      },
    });
    if (!made.ok) throw new Error("setup");
    job = made.job;
    if (when === "read") reader.readAsArrayBuffer.mockImplementation(() => job.cancel());
    if (when === "cleanup") {
      let callback: (() => void) | null = null;
      Object.defineProperty(reader, "onload", {
        get: () => callback,
        set(v) {
          callback = v;
          if (v === null) job.cancel();
        },
      });
    }
    const pending = job.run();
    reader.onload?.();
    const result = await pending;
    if (when === "cleanup") {
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.lease.take()).toBeNull();
    } else expect(result).toEqual(failure("FILE_CANCELLED"));
  });
  it.each(["onerror", "onabort", "onloadend"] as const)(
    "contains %s without retry",
    async (event) => {
      const s = setup(),
        pending = s.job.run();
      s.reader[event]?.();
      expect(await pending).toEqual(failure("FILE_READ_FAILED"));
      expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["sync", "throw", "nested"])("preserves startup discipline for %s", async (mode) => {
    const s = setup();
    if (mode === "nested")
      Object.defineProperty(s.reader, "result", {
        get() {
          s.reader.onload?.();
          return s.bytes.buffer;
        },
      });
    else
      s.reader.readAsArrayBuffer.mockImplementation(() => {
        s.reader.onload?.();
        if (mode === "throw") throw new Error("private");
      });
    const pending = s.job.run();
    s.reader.onload?.();
    const result = await pending;
    if (mode === "throw") expect(result).toEqual(failure("FILE_READ_FAILED"));
    else {
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.lease.take()).not.toBeNull();
    }
  });
  it.each(["length", "shared", "resizable", "detached", "state"])(
    "rejects bad reader %s",
    async (mode) => {
      const s = setup();
      if (mode === "length") s.reader.result = new ArrayBuffer(1);
      if (mode === "shared") s.reader.result = new SharedArrayBuffer(s.bytes.length);
      if (mode === "resizable")
        s.reader.result = Reflect.construct(ArrayBuffer, [s.bytes.length, { maxByteLength: 100 }]);
      if (mode === "detached") structuredClone(s.bytes.buffer, { transfer: [s.bytes.buffer] });
      if (mode === "state") s.reader.readyState = 1;
      const pending = s.job.run();
      s.reader.onload?.();
      expect(await pending).toEqual(
        failure(mode === "length" ? "FILE_LENGTH_MISMATCH" : "FILE_READ_FAILED"),
      );
    },
  );
  it.each([0, 20_000_001])("rejects size%i without a reader", (n) => {
    const factory = vi.fn();
    expect(create(request(new Blob([new Uint8Array(n)])), { createReader: factory })).toEqual(
      failure(n ? "BYTE_LIMIT" : "FILE_INVALID_INPUT"),
    );
    expect(factory).not.toHaveBeenCalled();
  });
  it("captures fields once and ignores caller proof and Blob shadow getters", async () => {
    const s = setup(),
      unused = vi.fn(() => {
        throw new Error("private");
      });
    for (const name of ["size", "type", "name", "slice", "arrayBuffer"])
      Object.defineProperty(s.file, name, { get: unused });
    const file = vi.fn(() => s.file),
      edge = vi.fn(() => 8000);
    const budget = vi.fn(() => Object.defineProperty({}, "maxEdge", { get: edge }));
    const factory = vi.fn(() => () => s.reader);
    const made = create(
      Object.defineProperties(
        {},
        {
          file: { get: file },
          budget: { get: budget },
          evidence: { get: unused },
          mode: { get: unused },
          validator: { get: unused },
        },
      ),
      Object.defineProperty({}, "createReader", { get: factory }),
    );
    if (!made.ok) throw new Error("setup");
    const pending = made.job.run();
    s.reader.onload?.();
    expect((await pending).ok).toBe(true);
    for (const fn of [file, edge, budget, factory]) expect(fn).toHaveBeenCalledTimes(1);
    expect(unused).not.toHaveBeenCalled();
  });
  it.each(["metadata", "malformed", "edge"])("rejects %s before snapshot", async (mode) => {
    const bytes =
      mode === "metadata"
        ? new Uint8Array([255, 216, 255, 224, 0, 2, ...jpeg().subarray(2)])
        : jpeg();
    if (mode === "malformed") bytes[bytes.length - 1] = 0;
    const input = request(new Blob([bytes]), mode === "edge" ? 2 : 8000),
      reader = new Reader(bytes);
    const construct = vi.fn((target, args) => Reflect.construct(target, args));
    vi.stubGlobal("Blob", new Proxy(Blob, { construct }));
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundAbsenceJob(input, { createReader: () => reader });
    if (!made.ok) throw new Error("setup");
    const pending = made.job.run();
    reader.onload?.();
    expect(await pending).toEqual(
      failure(
        mode === "metadata"
          ? "METADATA_UNVERIFIED"
          : mode === "edge"
            ? "EDGE_LIMIT"
            : "MALFORMED_INPUT",
      ),
    );
    expect(construct).not.toHaveBeenCalled();
  });
  it.each(["throw", "length"])("contains snapshot %s without exposing a pair", async (mode) => {
    const s = setup(),
      input = request(s.file),
      wrong = new Blob(["x"]);
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct() {
          if (mode === "throw") throw new Error("private bytes");
          return wrong;
        },
      }),
    );
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundAbsenceJob(input, { createReader: () => s.reader });
    if (!made.ok) throw new Error("setup");
    const pending = made.job.run();
    s.reader.onload?.();
    expect(await pending).toEqual(failure("FILE_READ_FAILED"));
  });
  it("runs118 then snapshot on the same buffer, old factories never call118", async () => {
    const s = setup(),
      input = request(s.file),
      order: string[] = [];
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct(target, args) {
          order.push("snapshot");
          expect(args[0][0].buffer).toBe(s.bytes.buffer);
          return Reflect.construct(target, args);
        },
      }),
    );
    vi.resetModules();
    const im = await import("./background-input"),
      cm = await import("./background-container"),
      am = await import("./background-metadata-absence"),
      module = await import("./background-file");
    const preflight = vi.spyOn(im, "inspectRoomBackgroundInput"),
      orientation = vi.spyOn(cm, "inspectRoomBackgroundContainer");
    const real = am.inspectRoomBackgroundMetadataAbsence;
    const absence = vi.spyOn(am, "inspectRoomBackgroundMetadataAbsence").mockImplementation((r) => {
      order.push("inspect");
      return real(r);
    });
    for (const [factory, calls] of [
      [module.createRoomBackgroundFileJob, [1, 0, 0]],
      [module.createRoomBackgroundEvidenceJob, [1, 1, 0]],
      [module.createRoomBackgroundAbsenceJob, [1, 0, 1]],
    ] as const) {
      vi.clearAllMocks();
      order.length = 0;
      const reader = new Reader(s.bytes),
        made = factory(input, { createReader: () => reader });
      if (!made.ok) throw new Error("setup");
      const pending = made.job.run();
      reader.onload?.();
      expect((await pending).ok).toBe(true);
      [preflight, orientation, absence].forEach((spy, i) => {
        expect(spy).toHaveBeenCalledTimes(calls[i]);
      });
      expect(order).toEqual(calls[2] ? ["inspect", "snapshot"] : ["snapshot"]);
    }
  });
  it("does not create a reader/decoder/network on import or factory", async () => {
    const reader = vi.fn(),
      forbidden = vi.fn();
    vi.stubGlobal("FileReader", reader);
    for (const name of ["fetch", "Image", "createImageBitmap"]) vi.stubGlobal(name, forbidden);
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundAbsenceJob(request(new Blob([jpeg()])));
    expect(made.ok).toBe(true);
    if (made.ok) made.job.dispose();
    expect(reader).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });
});
