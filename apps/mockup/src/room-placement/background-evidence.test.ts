import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BackgroundEvidenceJob,
  type BackgroundFileReaderPort,
  createRoomBackgroundEvidenceJob as create,
} from "./background-file";

function tiff(value: number | null = 1, little = true): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value === null ? 14 : 26);
  const view = new DataView(bytes.buffer);
  bytes.set(little ? [73, 73] : [77, 77]);
  view.setUint16(2, 42, little);
  view.setUint32(4, 8, little);
  view.setUint16(8, value === null ? 0 : 1, little);
  if (value !== null) {
    view.setUint16(10, 274, little);
    view.setUint16(12, 3, little);
    view.setUint32(14, 1, little);
    view.setUint16(18, value, little);
  }
  return bytes;
}
const frame = [
  255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17, 255, 217,
];
function jpeg(profiles: Uint8Array<ArrayBuffer>[] = []): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    255,
    216,
    ...profiles.flatMap((p) => {
      const n = p.length + 8;
      return [255, 225, n >> 8, n & 255, 69, 120, 105, 102, 0, 0, ...p];
    }),
    ...frame,
  ]);
}
function chunk(name: string, bytes: number[]): number[] {
  const body = [...Array.from(name, (c) => c.charCodeAt(0)), ...bytes];
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
    bytes.length,
    ...body,
    crc >>> 24,
    (crc >>> 16) & 255,
    (crc >>> 8) & 255,
    crc & 255,
  ];
}
function png(profiles: Uint8Array<ArrayBuffer>[] = [], late = false): Uint8Array<ArrayBuffer> {
  const exif = profiles.flatMap((p) => chunk("eXIf", Array.from(p)));
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
    ...(late ? [] : exif),
    ...chunk("IDAT", [0]),
    ...(late ? exif : []),
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
const request = (file: unknown, maxEdge: unknown = 8000) => ({ file, budget: { maxEdge } });
const failure = (code: string) => ({ ok: false, code: `ROOM_BACKGROUND_${code}` });
function setup(bytes = jpeg([tiff(6)]), edge: unknown = 8000) {
  const file = new Blob([bytes], { type: "image/gif" });
  const reader = new Reader(bytes);
  const factory = vi.fn(() => reader);
  const made = create(request(file, edge), { createReader: factory });
  if (!made.ok) throw new Error("setup");
  return { job: made.job, reader, factory, file, bytes };
}
async function finish(s: ReturnType<typeof setup>) {
  const pending = s.job.run();
  s.reader.onload?.();
  const result = await pending;
  if (!result.ok) throw new Error("expected evidence");
  return result;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec109 immutable byte evidence ownership", () => {
  it.each([0, 20_000_001])("rejects size %i before allocating a reader", (size) => {
    const factory = vi.fn();
    const made = create(request(new Blob([new Uint8Array(size)])), { createReader: factory });
    expect(made).toEqual(failure(size ? "BYTE_LIMIT" : "FILE_INVALID_INPUT"));
    expect(factory).not.toHaveBeenCalled();
  });
  it("binds the exact byte cap without an additional read", async () => {
    const minimal = jpeg([tiff(4)]);
    const bytes = new Uint8Array(20_000_000);
    bytes.set(minimal.subarray(0, minimal.length - 2));
    bytes.set([255, 217], bytes.length - 2);
    const s = setup(bytes),
      result = await finish(s),
      pair = result.lease.take();
    expect(pair?.evidence).toMatchObject({ byteLength: 20_000_000, value: 4 });
    expect(pair?.blob.size).toBe(20_000_000);
    expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it.each([null, 0, 1.5, Infinity, 40_000_001])("rejects maxEdge %s before reading", (edge) => {
    const factory = vi.fn();
    expect(create(request(new Blob([jpeg()]), edge), { createReader: factory })).toEqual(
      failure("FILE_INVALID_INPUT"),
    );
    expect(factory).not.toHaveBeenCalled();
  });
  it.each([null, {}, [], { createReader: 1 }])(
    "does not replace an invalid explicit environment %#",
    (environment) => {
      expect(create(request(new Blob([jpeg()])), environment)).toEqual(
        failure("FILE_INVALID_INPUT"),
      );
    },
  );
  it("rejects a snapshot whose native length does not match", async () => {
    const s = setup(),
      input = request(s.file),
      wrong = new Blob([new Uint8Array(1)]);
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct() {
          return wrong;
        },
      }),
    );
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundEvidenceJob(input, { createReader: () => s.reader });
    if (!made.ok) throw new Error("setup");
    const p = made.job.run();
    s.reader.onload?.();
    expect(await p).toEqual(failure("FILE_READ_FAILED"));
  });
  it("allows cancellation during cleanup to invalidate the joint result", async () => {
    const s = setup();
    let handler: (() => void) | null = null;
    Object.defineProperty(s.reader, "onload", {
      get: () => handler,
      set(value) {
        handler = value;
        if (value === null) s.job.cancel();
      },
    });
    const result = await finish(s);
    expect(result.lease.take()).toBeNull();
  });
  for (const [format, build] of [
    ["jpeg", jpeg],
    ["png", png],
  ] as const) {
    for (const little of [true, false]) {
      it.each([1, 2, 3, 4, 5, 6, 7, 8])(
        `${format} little=${little} binds orientation %i without permission`,
        async (value) => {
          const s = setup(build([tiff(value, little)]));
          const original = Array.from(s.bytes);
          const result = await finish(s);
          s.bytes.fill(0);
          expect(Object.keys(result).sort()).toEqual(["lease", "ok"]);
          const pair = result.lease.take();
          expect(pair).not.toBeNull();
          if (!pair) return;
          expect(pair.evidence).toMatchObject({
            format,
            value,
            exifPresence: "present",
            tagPresence: "present",
            encodedWidth: 3,
            encodedHeight: 2,
            encodedPixels: 6,
            profileValidation: "PARTIAL",
            imageOrientation: "NOT_VERIFIED",
            decodeAllowed: false,
          });
          expect(pair.blob.type).toBe(`image/${format}`);
          expect(Array.from(new Uint8Array(await pair.blob.arrayBuffer()))).toEqual(original);
          expect([result, result.lease, pair, pair.evidence].every(Object.isFrozen)).toBe(true);
          expect(result.lease.take()).toBeNull();
          s.job.cancel();
          s.job.dispose();
          result.lease.release();
          expect(pair.blob.size).toBe(original.length);
          expect(s.reader.abort).not.toHaveBeenCalled();
        },
      );
    }
    it.each(["profile", "tag"])(
      `${format} distinguishes missing %s without default`,
      async (missing) => {
        const result = await finish(setup(build(missing === "profile" ? [] : [tiff(null)])));
        expect(result.lease.take()?.evidence).toMatchObject({
          value: null,
          exifPresence: missing === "profile" ? "absent" : "present",
          tagPresence: missing === "profile" ? "unavailable" : "absent",
          decodeAllowed: false,
        });
      },
    );
  }
  it.each(["duplicate", "unknown", "order", "tiff", "crc", "edge", "pixels"])(
    "rejects %s before snapshot",
    async (mode) => {
      let bytes = jpeg([tiff(1)]);
      if (mode === "duplicate") bytes = jpeg([tiff(1), tiff(1)]);
      if (mode === "unknown") bytes[6] = 88;
      if (mode === "order") bytes = png([tiff(1)], true);
      if (mode === "tiff") bytes = jpeg([tiff(9)]);
      if (mode === "crc") {
        bytes = png();
        bytes[29] ^= 1;
      }
      if (mode === "pixels") {
        bytes = jpeg();
        bytes[7] = 5001 >> 8;
        bytes[8] = 5001 & 255;
        bytes[9] = 8000 >> 8;
        bytes[10] = 8000 & 255;
      }
      const input = request(new Blob([bytes]), mode === "edge" ? 2 : 8000);
      const reader = new Reader(bytes);
      const construct = vi.fn((target: typeof Blob, args: ConstructorParameters<typeof Blob>) =>
        Reflect.construct(target, args),
      );
      vi.stubGlobal("Blob", new Proxy(Blob, { construct }));
      vi.resetModules();
      const module = await import("./background-file");
      const made = module.createRoomBackgroundEvidenceJob(input, { createReader: () => reader });
      if (!made.ok) throw new Error("setup");
      const p = made.job.run();
      reader.onload?.();
      const result = await p;
      expect(result.ok).toBe(false);
      const codes: Record<string, string> = {
        duplicate: "METADATA_DUPLICATE",
        unknown: "METADATA_UNSUPPORTED",
        order: "METADATA_ORDER",
        crc: "MALFORMED_INPUT",
        edge: "EDGE_LIMIT",
        pixels: "PIXEL_LIMIT",
      };
      if (mode !== "tiff") expect(result).toEqual(failure(codes[mode]));
      expect(construct).not.toHaveBeenCalled();
      expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    },
  );
  it("runs profile checking and its preflight once on the snapshot source", async () => {
    const bytes = jpeg([tiff(3)]),
      reader = new Reader(bytes),
      input = request(new Blob([bytes]));
    const order: string[] = [];
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct(target, args) {
          order.push("snapshot");
          expect((args[0][0] as Uint8Array).buffer).toBe(bytes.buffer);
          return Reflect.construct(target, args);
        },
      }),
    );
    vi.resetModules();
    const im = await import("./background-input"),
      cm = await import("./background-container");
    const inputCheck = vi.spyOn(im, "inspectRoomBackgroundInput");
    const real = cm.inspectRoomBackgroundContainer;
    const inspect = vi.spyOn(cm, "inspectRoomBackgroundContainer").mockImplementation((r) => {
      order.push("inspect");
      return real(r);
    });
    const module = await import("./background-file");
    const made = module.createRoomBackgroundEvidenceJob(input, { createReader: () => reader });
    if (!made.ok) throw new Error("setup");
    expect(order).toEqual([]);
    const p = made.job.run();
    expect(made.job.run()).toBe(p);
    reader.onload?.();
    expect((await p).ok).toBe(true);
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inputCheck).toHaveBeenCalledTimes(1);
    expect((inputCheck.mock.calls[0][0] as { bytes: Uint8Array }).bytes.buffer).toBe(bytes.buffer);
    expect(order).toEqual(["inspect", "snapshot"]);
  });
  it.each(["release", "cancel", "dispose"] as const)(
    "%s clears unclaimed joint ownership",
    async (action) => {
      const s = setup(),
        result = await finish(s);
      if (action === "release") result.lease.release();
      else s.job[action]();
      expect(result.lease.take()).toBeNull();
      expect(s.job.run()).resolves.toBe(result);
    },
  );
  for (const action of ["cancel", "dispose"] as const) {
    it.each(["before", "pending", "result-getter"])(
      `${action} at %s fixes termination and ignores late load`,
      async (when) => {
        const s = setup();
        if (when === "before") s.job[action]();
        if (when === "result-getter")
          Object.defineProperty(s.reader, "result", {
            get() {
              s.job[action]();
              return s.bytes.buffer;
            },
          });
        const p = s.job.run(),
          late = s.reader.onload;
        if (when === "pending") s.job[action]();
        late?.();
        expect(await p).toEqual(failure(action === "cancel" ? "FILE_CANCELLED" : "FILE_DISPOSED"));
        late?.();
        expect(s.job.run()).toBe(p);
        expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(when === "before" ? 0 : 1);
        expect(s.reader.abort).toHaveBeenCalledTimes(when === "before" ? 0 : 1);
      },
    );
  }
  it.each(["onerror", "onabort", "onloadend"] as const)(
    "contains %s without retry",
    async (key) => {
      const s = setup(),
        p = s.job.run();
      s.reader[key]?.();
      expect(await p).toEqual(failure("FILE_READ_FAILED"));
      expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["sync", "throw", "nested"])(
    "keeps startup and nested %s deterministic",
    async (mode) => {
      const s = setup();
      if (mode === "nested")
        Object.defineProperty(s.reader, "result", {
          get() {
            s.reader.onload?.();
            return s.bytes.buffer;
          },
        });
      s.reader.readAsArrayBuffer.mockImplementation(() => {
        s.reader.onload?.();
        if (mode === "throw") throw new Error("private");
      });
      const result = await s.job.run();
      if (mode === "throw") expect(result).toEqual(failure("FILE_READ_FAILED"));
      else {
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.lease.take()?.evidence.value).toBe(6);
      }
    },
  );
  it("isolates two jobs and cancels late prior work", async () => {
    const a = setup(),
      b = setup(jpeg([tiff(8)]));
    const ap = a.job.run(),
      late = a.reader.onload;
    a.job.cancel();
    const result = await finish(b);
    late?.();
    expect(await ap).toEqual(failure("FILE_CANCELLED"));
    expect(result.lease.take()?.evidence.value).toBe(8);
  });
  it.each([
    null,
    {},
    new Uint8Array(1),
    new SharedArrayBuffer(1),
    Reflect.construct(ArrayBuffer, [1, { maxByteLength: 2 }]),
    runInNewContext("new ArrayBuffer(1)"),
  ])("rejects invalid reader backing %#", async (value) => {
    const s = setup();
    s.reader.result = value;
    const p = s.job.run();
    s.reader.onload?.();
    expect(await p).toEqual(failure("FILE_READ_FAILED"));
  });
  it.each(["length", "detached", "state"])("rejects %s result", async (mode) => {
    const s = setup();
    if (mode === "length") s.reader.result = new ArrayBuffer(1);
    if (mode === "detached") structuredClone(s.bytes.buffer, { transfer: [s.bytes.buffer] });
    if (mode === "state") s.reader.readyState = 1;
    const p = s.job.run();
    s.reader.onload?.();
    expect(await p).toEqual(
      failure(mode === "length" ? "FILE_LENGTH_MISMATCH" : "FILE_READ_FAILED"),
    );
  });
  it.each([
    null,
    {},
    [],
    { file: {}, budget: { maxEdge: 1 } },
    { file: new Blob(), budget: { maxEdge: 1 } },
    { file: new Blob([jpeg()]), budget: {} },
  ])("rejects invalid request %# before factory", (input) => {
    const factory = vi.fn();
    expect(create(input, { createReader: factory }).ok).toBe(false);
    expect(factory).not.toHaveBeenCalled();
  });
  it("captures fields once and ignores caller validators and Blob shadows", async () => {
    const bytes = jpeg([tiff(2)]),
      reader = new Reader(bytes),
      file = new Blob([bytes]);
    const unused = vi.fn(() => {
      throw new Error("unused");
    });
    for (const key of ["size", "type", "name", "slice", "arrayBuffer"])
      Object.defineProperty(file, key, { get: unused });
    const edge = vi.fn(() => 8000),
      budget = vi.fn(() => Object.defineProperty({}, "maxEdge", { get: edge })),
      getFile = vi.fn(() => file);
    const env = {
      get createReader() {
        getFactory();
        return factory;
      },
    };
    const factory = function (this: unknown) {
        expect(this).toBe(env);
        return reader;
      },
      getFactory = vi.fn();
    const input = Object.defineProperties(
      {},
      {
        file: { get: getFile },
        budget: { get: budget },
        validator: { get: unused },
        mode: { get: unused },
        preflight: { get: unused },
      },
    );
    const made = create(input, env);
    if (!made.ok) throw new Error("setup");
    const p = made.job.run();
    reader.onload?.();
    expect((await p).ok).toBe(true);
    for (const f of [edge, budget, getFile, getFactory]) expect(f).toHaveBeenCalledTimes(1);
    expect(unused).not.toHaveBeenCalled();
  });
  it("contains snapshot construction failure", async () => {
    const s = setup(),
      input = request(s.file);
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct() {
          throw new Error("private bytes");
        },
      }),
    );
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundEvidenceJob(input, { createReader: () => s.reader });
    if (!made.ok) throw new Error("setup");
    const p = made.job.run();
    s.reader.onload?.();
    expect(await p).toEqual(failure("FILE_READ_FAILED"));
  });
  it("does not eagerly create a default reader or invoke image and network APIs", async () => {
    const reader = vi.fn(),
      forbidden = vi.fn();
    vi.stubGlobal("FileReader", reader);
    vi.stubGlobal("fetch", forbidden);
    vi.stubGlobal("Image", forbidden);
    vi.stubGlobal("createImageBitmap", forbidden);
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundEvidenceJob(request(new Blob([jpeg()])));
    expect(made.ok).toBe(true);
    if (made.ok) made.job.dispose();
    expect(reader).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("cleans a reader acquired during reentrant factory cancellation", async () => {
    const bytes = jpeg(),
      reader = new Reader(bytes);
    let job: BackgroundEvidenceJob;
    const made = create(request(new Blob([bytes])), {
      createReader() {
        job.cancel();
        return reader;
      },
    });
    if (!made.ok) throw new Error("setup");
    job = made.job;
    expect(await job.run()).toEqual(failure("FILE_CANCELLED"));
    expect(reader.readAsArrayBuffer).not.toHaveBeenCalled();
  });
});
