import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BackgroundFileJob,
  type BackgroundFileReaderPort,
  createRoomBackgroundFileJob as create,
} from "./background-file";

const jpeg = () =>
  new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
const request = (file: unknown = new Blob([jpeg()]), maxEdge: unknown = 8000) => ({
  file,
  budget: { maxEdge },
});
const fail = (code: string) => ({ ok: false, code: `ROOM_BACKGROUND_${code}` });
class Reader implements BackgroundFileReaderPort {
  result: unknown = jpeg().buffer;
  readyState = 2;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer = vi.fn((_blob: Blob) => {});
  abort = vi.fn(() => {
    this.onabort?.();
  });
}
function setup(reader = new Reader(), input = request()) {
  const createReader = vi.fn(() => reader);
  const made = create(input, { createReader });
  if (!made.ok) throw new Error("test setup failed");
  return { reader, job: made.job, createReader };
}
async function success(reader = new Reader()) {
  const { job } = setup(reader);
  const pending = job.run();
  reader.onload?.();
  const result = await pending;
  if (!result.ok) throw new Error("test read failed");
  return { job, result };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec105 bounded file ownership without decoding", () => {
  it.each(["png", "animation", "crc", "pixels"])("preserves %s preflight outcome", async (mode) => {
    const chunk = (type: string, data: number[]) => {
      const body = [...Array.from(type, (c) => c.charCodeAt(0)), ...data];
      let crc = 0xffffffff;
      for (const byte of body) {
        crc ^= byte;
        for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
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
    let bytes = new Uint8Array([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
      ...chunk("IHDR", [0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
      ...(mode === "animation" ? chunk("acTL", [0, 0, 0, 1, 0, 0, 0, 0]) : []),
      ...chunk("IDAT", [0]),
      ...chunk("IEND", []),
    ]);
    if (mode === "crc") bytes[29] ^= 1;
    if (mode === "pixels") {
      bytes = jpeg();
      bytes[7] = 5001 >> 8;
      bytes[8] = 5001 & 255;
      bytes[9] = 8000 >> 8;
      bytes[10] = 8000 & 255;
    }
    const reader = new Reader();
    reader.result = bytes.buffer;
    const { job } = setup(reader, request(new Blob([bytes])));
    const pending = job.run();
    reader.onload?.();
    const result = await pending;
    if (mode === "png") {
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.lease.takeBlob()?.type).toBe("image/png");
    } else
      expect(result).toEqual(
        fail(
          mode === "animation"
            ? "ANIMATED_INPUT"
            : mode === "crc"
              ? "MALFORMED_INPUT"
              : "PIXEL_LIMIT",
        ),
      );
    expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it("contains snapshot allocation failure", async () => {
    const input = request(),
      r = new Reader();
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct() {
          throw new Error("private allocation");
        },
      }),
    );
    vi.resetModules();
    const module = await import("./background-file");
    const made = module.createRoomBackgroundFileJob(input, { createReader: () => r });
    if (!made.ok) throw new Error("setup");
    const p = made.job.run();
    r.onload?.();
    expect(await p).toEqual(fail("FILE_READ_FAILED"));
  });
  it("uses exactly one snapshot and one preflight over the reader buffer", async () => {
    const input = request(),
      reader = new Reader();
    let snapshots = 0;
    vi.stubGlobal(
      "Blob",
      new Proxy(Blob, {
        construct(target, args) {
          snapshots++;
          return Reflect.construct(target, args);
        },
      }),
    );
    vi.resetModules();
    const checker = await import("./background-input");
    const inspect = vi.spyOn(checker, "inspectRoomBackgroundInput");
    const module = await import("./background-file");
    const made = module.createRoomBackgroundFileJob(input, { createReader: () => reader });
    expect(made.ok).toBe(true);
    expect(snapshots).toBe(0);
    if (!made.ok) return;
    const p = made.job.run();
    reader.onload?.();
    expect((await p).ok).toBe(true);
    expect(snapshots).toBe(1);
    expect(inspect).toHaveBeenCalledTimes(1);
    const arg = inspect.mock.calls[0][0] as { bytes: Uint8Array };
    expect(arg.bytes.buffer).toBe(reader.result);
    made.job.dispose();
  });
  it.each(["factory", "read", "abort-getter", "result", "state"])(
    "contains %s exception",
    async (point) => {
      const r = new Reader();
      if (point === "read")
        r.readAsArrayBuffer.mockImplementation(() => {
          throw new Error("private");
        });
      if (["abort-getter", "result", "state"].includes(point))
        Object.defineProperty(
          r,
          point === "abort-getter" ? "abort" : point === "state" ? "readyState" : "result",
          {
            get() {
              throw new Error("private");
            },
          },
        );
      const made = create(request(), {
        createReader() {
          if (point === "factory") throw new Error("private");
          return r;
        },
      });
      if (!made.ok) throw new Error("setup");
      const p = made.job.run();
      r.onload?.();
      expect(await p).toEqual(fail("FILE_READ_FAILED"));
    },
  );
  it("rejects non-DONE state and ignores subsequent load", async () => {
    const { reader, job } = setup();
    reader.readyState = 1;
    const p = job.run();
    const load = reader.onload;
    load?.();
    reader.readyState = 2;
    load?.();
    expect(await p).toEqual(fail("FILE_READ_FAILED"));
  });
  it("preserves cancellation during cleanup without resurrecting an unclaimed blob", async () => {
    const { reader, job } = setup();
    let handler: (() => void) | null = null;
    Object.defineProperty(reader, "onload", {
      get() {
        return handler;
      },
      set(value) {
        handler = value;
        if (value === null) job.cancel();
      },
    });
    const p = job.run();
    reader.onload?.();
    const result = await p;
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lease.takeBlob()).toBeNull();
  });
  it("does not eagerly construct a default native reader", () => {
    const ctor = vi.fn(() => new Reader());
    vi.stubGlobal("FileReader", ctor);
    const made = create(request());
    expect(made.ok).toBe(true);
    expect(ctor).not.toHaveBeenCalled();
    if (made.ok) {
      made.job.run();
      made.job.cancel();
    }
    expect(ctor).toHaveBeenCalledTimes(1);
  });
  it.each([null, undefined, 4, "x", [], {}, { file: null, budget: [] }])(
    "rejects invalid request %j",
    (input) => {
      const factory = vi.fn();
      expect(create(input, { createReader: factory })).toEqual(fail("FILE_INVALID_INPUT"));
      expect(factory).not.toHaveBeenCalled();
    },
  );
  it.each([null, 0, -1, 1.2, Infinity, NaN, "8000", 40_000_001])(
    "requires valid maxEdge %j",
    (edge) => {
      expect(create(request(undefined, edge), { createReader: vi.fn() })).toEqual(
        fail("FILE_INVALID_INPUT"),
      );
    },
  );
  it("requires maxEdge when omitted", () => {
    expect(create({ file: new Blob([jpeg()]), budget: {} }, {})).toEqual(
      fail("FILE_INVALID_INPUT"),
    );
  });
  it.each([
    {},
    { size: 28 },
    new Proxy(new Blob([jpeg()]), {}),
    new (class extends Blob {})([jpeg()]),
    Object.create(Blob.prototype),
  ])("refuses nonstandard blobs", (file) => {
    expect(create(request(file), {})).toEqual(fail("FILE_INVALID_INPUT"));
  });
  it.each([null, {}, [], { createReader: 0 }])(
    "does not fall back from invalid environment",
    (env) => {
      expect(create(request(), env)).toEqual(fail("FILE_INVALID_INPUT"));
    },
  );
  it.each(["file", "budget", "maxEdge"])("contains throwing input getter %s", (key) => {
    const value = request();
    const getter = vi.fn(() => {
      throw new Error("private name");
    });
    Object.defineProperty(key === "maxEdge" ? value.budget : value, key, { get: getter });
    expect(create(value, {})).toEqual(fail("FILE_INVALID_INPUT"));
    expect(getter).toHaveBeenCalledTimes(1);
  });
  it("captures request fields and environment once, preserving factory receiver", () => {
    const reader = new Reader();
    const file = new Blob([jpeg()]);
    const f = vi.fn(() => file),
      e = vi.fn(() => 8000),
      b = vi.fn(() => ({
        get maxEdge() {
          return e();
        },
      }));
    const env = {
      createReader() {
        expect(this).toBe(env);
        return reader;
      },
    };
    const getter = vi.spyOn(env, "createReader");
    const made = create(
      {
        get file() {
          return f();
        },
        get budget() {
          return b();
        },
      },
      env,
    );
    expect(made.ok).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    if (made.ok) {
      made.job.run();
      made.job.cancel();
    }
    for (const spy of [f, e, b, getter]) expect(spy).toHaveBeenCalledTimes(1);
  });
  it("ignores instance overrides and reads a bounded nameless blob", () => {
    const file = new File([jpeg()], "untrusted-name.gif", { type: "image/gif" });
    const getter = vi.fn(() => {
      throw new Error("do not invoke");
    });
    for (const key of ["size", "name", "type", "arrayBuffer", "slice"])
      Object.defineProperty(file, key, { get: getter });
    const { job, reader } = setup(new Reader(), request(file));
    job.run();
    const bounded = reader.readAsArrayBuffer.mock.calls[0][0];
    expect(bounded.size).toBe(28);
    expect(bounded).not.toBe(file);
    expect(bounded).not.toBeInstanceOf(File);
    expect(getter).not.toHaveBeenCalled();
    job.cancel();
  });
  it.each([0, 20_000_001])("rejects size %i before reader creation", (size) => {
    const factory = vi.fn();
    expect(create(request(new Blob([new Uint8Array(size)])), { createReader: factory })).toEqual(
      fail(size ? "BYTE_LIMIT" : "FILE_INVALID_INPUT"),
    );
    expect(factory).not.toHaveBeenCalled();
  });
  it("accepts the exact byte cap with one immutable snapshot", async () => {
    const bytes = new Uint8Array(20_000_000),
      base = jpeg();
    bytes.set(base.subarray(0, 2));
    let at = 2,
      remaining = bytes.length - base.length;
    while (remaining > 0) {
      let n = Math.min(remaining, 65537);
      if (remaining > n && remaining - n < 4) n -= 4;
      bytes.set([255, 254, (n - 2) >> 8, (n - 2) & 255], at);
      at += n;
      remaining -= n;
    }
    bytes.set(base.subarray(2), at);
    const reader = new Reader();
    reader.result = bytes.buffer;
    const { job, createReader } = setup(reader, request(new Blob([bytes])));
    const pending = job.run();
    reader.onload?.();
    const result = await pending;
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lease.takeBlob()?.size).toBe(20_000_000);
    expect(createReader).toHaveBeenCalledTimes(1);
    expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it("keeps snapshot bytes independent of returned mutable buffer", async () => {
    const reader = new Reader(),
      original = jpeg();
    const { result, job } = await success(reader);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.lease)).toBe(true);
    expect(result.preflight).toMatchObject({
      kind: "preflight-only",
      format: "jpeg",
      decodeAllowed: false,
      orientation: "NOT_VERIFIED",
    });
    new Uint8Array(reader.result as ArrayBuffer).fill(0);
    const blob = result.lease.takeBlob();
    expect(blob?.type).toBe("image/jpeg");
    expect(new Uint8Array(await (blob as Blob).arrayBuffer())).toEqual(original);
    expect(result.lease.takeBlob()).toBeNull();
    job.cancel();
    job.dispose();
    result.lease.release();
    expect(blob?.size).toBe(28);
    expect(reader.abort).not.toHaveBeenCalled();
    for (const key of ["onload", "onabort", "onerror", "onloadend"] as const)
      expect(reader[key]).toBeNull();
  });
  it.each(["release", "cancel", "dispose"] as const)(
    "invalidates unclaimed lease via %s",
    async (action) => {
      const { job, result } = await success();
      if (action === "release") result.lease.release();
      else job[action]();
      expect(result.lease.takeBlob()).toBeNull();
      expect(await job.run()).toBe(result);
    },
  );
  it("returns the same promise without starting duplicate reads", async () => {
    const { job, reader, createReader } = setup();
    const p = job.run();
    expect(job.run()).toBe(p);
    reader.onload?.();
    await p;
    expect(job.run()).toBe(p);
    expect(createReader).toHaveBeenCalledTimes(1);
    expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it.each(["cancel", "dispose"] as const)("%s before run performs no read", async (action) => {
    const { job, createReader } = setup();
    job[action]();
    const p = job.run();
    expect(job.run()).toBe(p);
    expect(await p).toEqual(fail(action === "cancel" ? "FILE_CANCELLED" : "FILE_DISPOSED"));
    expect(createReader).not.toHaveBeenCalled();
  });
  it.each(["cancel", "dispose"] as const)(
    "%s pending ignores late results and abort failure",
    async (action) => {
      const { job, reader } = setup();
      reader.abort.mockImplementation(() => {
        throw new Error("private error");
      });
      const p = job.run();
      const late = reader.onload;
      job[action]();
      job[action]();
      late?.();
      expect(await p).toEqual(fail(action === "cancel" ? "FILE_CANCELLED" : "FILE_DISPOSED"));
      expect(reader.abort).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["onerror", "onabort", "onloadend"] as const)("maps %s to safe failure", async (key) => {
    const { job, reader } = setup();
    const p = job.run();
    reader[key]?.();
    expect(await p).toEqual(fail("FILE_READ_FAILED"));
  });
  it.each([27, 29])("rejects mismatched result length %i", async (n) => {
    const r = new Reader();
    r.result = new ArrayBuffer(n);
    const { job } = setup(r);
    const p = job.run();
    r.onload?.();
    expect(await p).toEqual(fail("FILE_LENGTH_MISMATCH"));
  });
  it.each([
    null,
    "raw",
    jpeg(),
    new SharedArrayBuffer(28),
    new Proxy(new ArrayBuffer(28), {}),
    runInNewContext("new ArrayBuffer(28)"),
    Reflect.construct(ArrayBuffer, [28, { maxByteLength: 56 }]),
  ])("rejects invalid read result", async (value) => {
    const r = new Reader();
    r.result = value;
    const { job } = setup(r);
    const p = job.run();
    r.onload?.();
    expect(await p).toEqual(fail("FILE_READ_FAILED"));
  });
  it("rejects detached result", async () => {
    const r = new Reader();
    const buffer = new ArrayBuffer(28);
    structuredClone(buffer, { transfer: [buffer] });
    r.result = buffer;
    const { job } = setup(r);
    const p = job.run();
    r.onload?.();
    expect(await p).toEqual(fail("FILE_READ_FAILED"));
  });
  it("propagates preflight failure without snapshot or retry", async () => {
    const r = new Reader();
    r.result = new ArrayBuffer(28);
    const { job } = setup(r);
    const p = job.run();
    r.onload?.();
    expect(await p).toEqual(fail("UNSUPPORTED_FORMAT"));
    expect(r.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it("applies maxEdge after reading without inventing a default", async () => {
    const r = new Reader();
    const { job } = setup(r, request(undefined, 2));
    const p = job.run();
    r.onload?.();
    expect(await p).toEqual(fail("EDGE_LIMIT"));
    expect(r.readAsArrayBuffer).toHaveBeenCalledTimes(1);
  });
  it.each(["success", "throw", "cancel"])("defers synchronous startup %s", async (mode) => {
    const { reader, job } = setup();
    reader.readAsArrayBuffer.mockImplementation(() => {
      reader.onload?.();
      if (mode === "throw") throw new Error("private");
      if (mode === "cancel") job.cancel();
    });
    const value = await job.run();
    if (mode === "success") expect(value.ok).toBe(true);
    else expect(value).toEqual(fail(mode === "throw" ? "FILE_READ_FAILED" : "FILE_CANCELLED"));
  });
  it("rejects an event during handler installation", async () => {
    const r = new Reader();
    Object.defineProperty(r, "onload", {
      set(fn) {
        fn?.();
      },
      get() {
        return null;
      },
    });
    const { job } = setup(r);
    expect(await job.run()).toEqual(fail("FILE_READ_FAILED"));
    expect(r.readAsArrayBuffer).not.toHaveBeenCalled();
  });
  it("cleans a reader returned after factory reentrant cancellation", async () => {
    const reader = new Reader();
    let job: BackgroundFileJob;
    const made = create(request(), {
      createReader() {
        job.cancel();
        return reader;
      },
    });
    if (!made.ok) throw new Error("setup");
    job = made.job;
    expect(await job.run()).toEqual(fail("FILE_CANCELLED"));
    expect(reader.readAsArrayBuffer).not.toHaveBeenCalled();
  });
  it.each(["readAsArrayBuffer", "abort", "readyState", "result"])(
    "handles cancellation in %s getter",
    async (key) => {
      const { job, reader } = setup();
      const old = reader[key as keyof Reader];
      Object.defineProperty(reader, key, {
        get() {
          job.cancel();
          return old;
        },
      });
      const p = job.run();
      reader.onload?.();
      expect(await p).toEqual(fail("FILE_CANCELLED"));
    },
  );
  it("guards nested load from a result getter", async () => {
    const { job, reader } = setup();
    const bytes = jpeg().buffer;
    const getter = vi.fn(() => {
      reader.onload?.();
      return bytes;
    });
    Object.defineProperty(reader, "result", { get: getter });
    const p = job.run();
    reader.onload?.();
    expect((await p).ok).toBe(true);
    expect(getter).toHaveBeenCalledTimes(1);
  });
  it("keeps separate jobs independent of late callbacks", async () => {
    const a = setup(),
      b = setup();
    const pa = a.job.run(),
      late = a.reader.onload;
    a.job.cancel();
    const pb = b.job.run();
    late?.();
    b.reader.onload?.();
    expect(await pa).toEqual(fail("FILE_CANCELLED"));
    expect((await pb).ok).toBe(true);
  });
  it("reports unavailable default reader without constructing one", () => {
    const prior = globalThis.FileReader;
    vi.stubGlobal("FileReader", undefined);
    expect(create(request())).toEqual(fail("FILE_UNAVAILABLE"));
    vi.stubGlobal("FileReader", prior);
    vi.unstubAllGlobals();
  });
});
