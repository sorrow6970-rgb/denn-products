import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BackgroundAbsenceDecodeTask,
  createRoomBackgroundAbsenceDecodeWork as create,
} from "./background-absence-decode";
import type { BackgroundFileReaderPort } from "./background-file";

// Envelope specimens only; fake decode does not prove native pixel support.
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
const bitmap = () => ({ width: 3, height: 2, close: vi.fn() });
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function setup(bytes = jpeg(), suppliedDecode?: (blob: Blob, options: unknown) => unknown) {
  const reader = new Reader(bytes),
    file = new Blob([bytes], { type: "image/gif" });
  let resolve!: (value: unknown) => void, reject!: (value?: unknown) => void;
  const pending = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const decode = vi.fn(suppliedDecode ?? (() => pending)),
    createReader = vi.fn(() => reader);
  const made = create({ decode, createReader });
  if (!made.ok) throw new Error("setup");
  const start = (input: unknown = request(file)) => {
    const begun = made.work.start(input);
    if (!begun.ok) throw new Error("start");
    return begun.task;
  };
  return { bytes, reader, file, decode, createReader, resolve, reject, work: made.work, start };
}
async function decoding(s: ReturnType<typeof setup>) {
  const task = s.start();
  s.reader.onload?.();
  await flush();
  expect(s.decode).toHaveBeenCalledTimes(1);
  return task;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec121 absence-bound decode work", () => {
  it.each(["jpeg", "png"])("decodes the checked immutable %s snapshot once", async (format) => {
    const s = setup(format === "png" ? png() : jpeg()),
      original = Array.from(s.bytes);
    const task = s.start({
      ...request(s.file),
      evidence: { decodeAllowed: true },
      blob: new Blob(["wrong"]),
    });
    s.reader.onload?.();
    s.bytes.fill(0);
    await flush();
    const [input, options] = s.decode.mock.calls[0];
    expect(input).not.toBe(s.file);
    expect(input.type).toBe(`image/${format}`);
    expect(Array.from(new Uint8Array(await input.arrayBuffer()))).toEqual(original);
    expect(options).toEqual({ imageOrientation: "from-image" });
    expect(Object.isFrozen(options)).toBe(true);
    const b = bitmap();
    s.resolve(b);
    expect(await task.result).toEqual({ ok: true });
    const lease = task.takeLease();
    expect(lease).toMatchObject({ width: 3, height: 2 });
    expect(lease && Object.keys(lease).sort()).toEqual(["height", "release", "width"]);
    expect(Object.isFrozen(lease)).toBe(true);
    expect(task.takeLease()).toBeNull();
    expect(Object.isFrozen(task)).toBe(true);
    expect(Object.isFrozen(await task.result)).toBe(true);
    expect(s.work.getState()).toBe("held");
    lease?.release();
    task.cancel();
    task.release();
    s.work.dispose();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    expect(s.decode).toHaveBeenCalledTimes(1);
  });
  it("factory does not start readers, decoders or browser I/O", () => {
    const s = setup();
    expect(s.work.getState()).toBe("idle");
    expect(s.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
    expect(create(undefined)).toEqual(failure("WORK_INVALID_INPUT"));
  });
  it.each([null, [], {}, { decode: 1 }, { decode: () => Promise.resolve(), createReader: 1 }])(
    "rejects invalid environment %j",
    (env) => {
      expect(create(env)).toEqual(failure("WORK_INVALID_INPUT"));
    },
  );
  it("captures environment getters once and preserves this", async () => {
    const bytes = jpeg(),
      reader = new Reader(bytes),
      b = bitmap();
    const decode = vi.fn(function (this: unknown) {
      expect(this).toBe(env);
      return Promise.resolve(b);
    });
    const read = vi.fn(function (this: unknown) {
      expect(this).toBe(env);
      return reader;
    });
    const getDecode = vi.fn(() => decode),
      getReader = vi.fn(() => read);
    const env = {
      get decode() {
        return getDecode();
      },
      get createReader() {
        return getReader();
      },
    };
    const made = create(env);
    if (!made.ok) throw new Error("setup");
    const begun = made.work.start(request(new Blob([bytes])));
    if (!begun.ok) throw new Error("start");
    reader.onload?.();
    expect(await begun.task.result).toEqual({ ok: true });
    expect(getDecode).toHaveBeenCalledTimes(1);
    expect(getReader).toHaveBeenCalledTimes(1);
    begun.task.release();
    expect(b.close).toHaveBeenCalledTimes(1);
  });
  it("uses native default reader only after explicit start", async () => {
    const reader = new Reader(jpeg()),
      ReaderFactory = vi.fn(function (this: unknown) {
        expect(this).toBeInstanceOf(ReaderFactory);
        return reader;
      });
    vi.stubGlobal("FileReader", ReaderFactory);
    const b = bitmap(),
      decode = vi.fn(() => Promise.resolve(b));
    const made = create({ decode });
    if (!made.ok) throw new Error("setup");
    expect(ReaderFactory).not.toHaveBeenCalled();
    const begun = made.work.start(request(new Blob([jpeg()])));
    if (!begun.ok) throw new Error("start");
    reader.onload?.();
    expect(await begun.task.result).toEqual({ ok: true });
    expect(ReaderFactory).toHaveBeenCalledTimes(1);
    begun.task.release();
  });
  it.each(["decode", "createReader"])("safe environment %s getter throw", (key) => {
    expect(
      create({
        decode: () => {},
        get [key]() {
          throw new Error("private");
        },
      }),
    ).toEqual(failure("WORK_INVALID_INPUT"));
  });
  it.each([
    null,
    {},
    { file: new Blob([]), budget: { maxEdge: 3 } },
    request(new Blob([jpeg()]), 0),
  ])("invalid request has zero I/O", async (input) => {
    const s = setup(),
      task = s.start(input);
    expect(await task.result).toEqual(failure("FILE_INVALID_INPUT"));
    expect(s.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.work.getState()).toBe("idle");
  });
  it("rejects byte limit before read", async () => {
    const s = setup(),
      task = s.start(request(new Blob([new Uint8Array(20_000_001)])));
    expect(await task.result).toEqual(failure("BYTE_LIMIT"));
    expect(s.createReader).not.toHaveBeenCalled();
  });
  it("captures request fields once and never reads supplied proof", async () => {
    const s = setup(),
      file = vi.fn(() => s.file),
      edge = vi.fn(() => 8000),
      budget = vi.fn(() => ({
        get maxEdge() {
          return edge();
        },
      }));
    const task = s.start({
      get file() {
        return file();
      },
      get budget() {
        return budget();
      },
      get evidence() {
        throw new Error("untrusted");
      },
    });
    s.reader.onload?.();
    await flush();
    s.resolve(bitmap());
    await task.result;
    task.release();
    expect(file).toHaveBeenCalledTimes(1);
    expect(budget).toHaveBeenCalledTimes(1);
    expect(edge).toHaveBeenCalledTimes(1);
  });
  it.each(["metadata", "edge", "structure", "crc"])("%s failure never decodes", async (kind) => {
    let bytes = kind === "crc" ? png() : jpeg();
    if (kind === "metadata") bytes = new Uint8Array([255, 216, 255, 224, 0, 2, ...bytes.slice(2)]);
    if (kind === "structure") bytes[2] = 0;
    if (kind === "crc") bytes[29] ^= 1;
    const s = setup(bytes),
      task = s.start(request(s.file, kind === "edge" ? 2 : 8000));
    s.reader.onload?.();
    const result = await task.result;
    expect(result.ok).toBe(false);
    if (kind === "metadata") expect(result).toEqual(failure("METADATA_UNVERIFIED"));
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.work.getState()).toBe("idle");
  });
  it("rejects read errors without decoder or raw error", async () => {
    const s = setup(),
      task = s.start();
    s.reader.onerror?.();
    expect(await task.result).toEqual(failure("FILE_READ_FAILED"));
    expect(s.decode).not.toHaveBeenCalled();
  });
  it.each(["cancel", "release", "dispose"])("%s during read prevents decode", async (action) => {
    const s = setup(),
      task = s.start(),
      late = s.reader.onload;
    if (action === "dispose") s.work.dispose();
    else task[action as "cancel" | "release"]();
    expect(await task.result).toEqual(
      failure(action === "dispose" ? "WORK_DISPOSED" : "WORK_CANCELLED"),
    );
    late?.();
    await flush();
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.reader.abort).toHaveBeenCalledTimes(1);
    expect(task.takeLease()).toBeNull();
    expect(s.work.getState()).toBe(action === "dispose" ? "disposed" : "idle");
  });
  it("cancel after read event but before microtask prevents decode", async () => {
    const s = setup(),
      task = s.start();
    s.reader.onload?.();
    task.cancel();
    await task.result;
    await flush();
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.work.getState()).toBe("idle");
  });
  it.each(["cancel", "release", "dispose"])(
    "%s pending decode waits for late close",
    async (action) => {
      const s = setup(),
        task = await decoding(s);
      if (action === "dispose") s.work.dispose();
      else task[action as "cancel" | "release"]();
      expect(await task.result).toEqual(
        failure(action === "dispose" ? "WORK_DISPOSED" : "WORK_CANCELLED"),
      );
      const touch = vi.fn(() => s.file);
      expect(
        s.work.start({
          get file() {
            return touch();
          },
        }),
      ).toEqual(failure(action === "dispose" ? "WORK_DISPOSED" : "WORK_BUSY"));
      expect(touch).not.toHaveBeenCalled();
      const b = {
        close: vi.fn(),
        get width() {
          throw new Error("late read");
        },
      };
      s.resolve(b);
      await flush();
      expect(b.close).toHaveBeenCalledTimes(1);
      expect(task.takeLease()).toBeNull();
      expect(s.work.getState()).toBe(action === "dispose" ? "disposed" : "idle");
    },
  );
  it("cancelled never-settled decode stays pending without retry", async () => {
    const s = setup(),
      task = await decoding(s);
    task.cancel();
    await task.result;
    await flush();
    expect(s.work.getState()).toBe("pending");
    expect(s.work.start(request(s.file))).toEqual(failure("WORK_BUSY"));
    expect(s.decode).toHaveBeenCalledTimes(1);
    s.reject();
    await flush();
    expect(s.work.getState()).toBe("idle");
  });
  it.each([false, true])("decode rejection cancelled=%s releases slot", async (cancel) => {
    const s = setup(),
      task = await decoding(s);
    if (cancel) task.cancel();
    s.reject(new Error("secret filename"));
    expect(await task.result).toEqual(failure(cancel ? "WORK_CANCELLED" : "DECODE_FAILED"));
    await flush();
    expect(s.work.getState()).toBe("idle");
    expect(task.takeLease()).toBeNull();
  });
  it("held work blocks all new input reads until released", async () => {
    const s = setup(),
      task = await decoding(s),
      b = bitmap();
    s.resolve(b);
    await task.result;
    const getter = vi.fn();
    expect(
      s.work.start({
        get file() {
          getter();
          return s.file;
        },
      }),
    ).toEqual(failure("WORK_BUSY"));
    expect(getter).not.toHaveBeenCalled();
    task.release();
    expect(s.work.getState()).toBe("idle");
  });
  it("old task cancellation cannot affect new work", async () => {
    const s = setup(),
      old = await decoding(s);
    s.resolve(bitmap());
    await old.result;
    old.release();
    const next = s.start();
    old.cancel();
    expect(s.work.getState()).toBe("pending");
    next.cancel();
    await next.result;
    await flush();
    expect(s.work.getState()).toBe("idle");
  });
  it.each(["cancel", "dispose"])("%s invalidates unclaimed success", async (action) => {
    const s = setup(),
      task = await decoding(s),
      b = bitmap();
    s.resolve(b);
    await task.result;
    if (action === "cancel") task.cancel();
    else s.work.dispose();
    expect(task.takeLease()).toBeNull();
    expect(await task.result).toEqual({ ok: true });
    expect(b.close).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 4, "3", 40_000_001])(
    "rejects decoded width %s",
    async (width) => {
      const s = setup(),
        task = await decoding(s),
        b = { width, height: 2, close: vi.fn() };
      s.resolve(b);
      expect(await task.result).toEqual(failure("DECODE_SIZE_MISMATCH"));
      expect(b.close).toHaveBeenCalledTimes(1);
      expect(s.work.getState()).toBe("idle");
      expect(task.takeLease()).toBeNull();
    },
  );
  it("rejects decoded height mismatch", async () => {
    const s = setup(),
      task = await decoding(s),
      b = { width: 3, height: 3, close: vi.fn() };
    s.resolve(b);
    expect(await task.result).toEqual(failure("DECODE_SIZE_MISMATCH"));
    expect(b.close).toHaveBeenCalledTimes(1);
  });
  it.each(["width", "height"])("%s getter throw closes safely", async (key) => {
    const s = setup(),
      task = await decoding(s),
      close = vi.fn();
    s.resolve({
      width: 3,
      height: 2,
      close,
      get [key]() {
        throw new Error("private");
      },
    });
    expect(await task.result).toEqual(failure("DECODE_FAILED"));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("captures close before dimensions once, with original this", async () => {
    const s = setup(),
      task = await decoding(s),
      order: string[] = [];
    const close = vi.fn(function (this: unknown) {
      expect(this).toBe(b);
      order.push("release");
    });
    const b = {
      get close() {
        order.push("close");
        return close;
      },
      get width() {
        order.push("width");
        return 3;
      },
      get height() {
        order.push("height");
        return 2;
      },
    };
    s.resolve(b);
    await task.result;
    task.takeLease()?.release();
    task.release();
    expect(order).toEqual(["close", "width", "height", "release"]);
  });
  it.each([null, {}, { close: 1 }])(
    "missing close blocks rather than releases capacity",
    async (b) => {
      const s = setup(),
        task = await decoding(s);
      s.resolve(b);
      expect(await task.result).toEqual(failure("DECODE_OUTCOME_UNKNOWN"));
      expect(s.work.getState()).toBe("blocked");
      expect(s.work.start(request(s.file))).toEqual(failure("WORK_BLOCKED"));
    },
  );
  it("close getter throw blocks", async () => {
    const s = setup(),
      task = await decoding(s);
    s.resolve({
      get close() {
        throw new Error("private");
      },
    });
    expect(await task.result).toEqual(failure("DECODE_OUTCOME_UNKNOWN"));
    expect(s.work.getState()).toBe("blocked");
  });
  it.each([false, true])("close throw cancelled=%s blocks", async (cancel) => {
    const s = setup(),
      task = await decoding(s),
      close = vi.fn(() => {
        throw new Error("private");
      });
    if (cancel) task.cancel();
    s.resolve({ width: 3, height: 2, close });
    await task.result;
    await flush();
    task.release();
    expect(close).toHaveBeenCalledTimes(1);
    expect(s.work.getState()).toBe("blocked");
  });
  it.each(["throw", "thenable"])(
    "broken decoder %s blocks without untrusted then",
    async (kind) => {
      const then = vi.fn(),
        s = setup(jpeg(), () => {
          if (kind === "throw") throw new Error("private");
          return { then };
        });
      const task = await decoding(s);
      expect(await task.result).toEqual(failure("DECODE_OUTCOME_UNKNOWN"));
      expect(then).not.toHaveBeenCalled();
      expect(s.work.getState()).toBe("blocked");
    },
  );
  it.each(["close", "width", "height"])(
    "cancel inside %s getter never grants lease",
    async (key) => {
      const s = setup(),
        task = await decoding(s),
        close = vi.fn(),
        later = vi.fn();
      s.resolve({
        get close() {
          if (key === "close") task.cancel();
          return close;
        },
        get width() {
          if (key === "width") task.cancel();
          if (key === "close") later();
          return 3;
        },
        get height() {
          if (key === "height") task.cancel();
          else later();
          return 2;
        },
      });
      expect(await task.result).toEqual(failure("WORK_CANCELLED"));
      await flush();
      expect(later).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalledTimes(1);
      expect(task.takeLease()).toBeNull();
    },
  );
  it("dispose during request capture prevents read", async () => {
    const s = setup(),
      task = s.start({
        get file() {
          s.work.dispose();
          return s.file;
        },
        budget: { maxEdge: 8000 },
      });
    expect(await task.result).toEqual(failure("WORK_DISPOSED"));
    await flush();
    expect(s.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
  });
  it("dispose during reader creation prevents read and decode", async () => {
    const reader = new Reader(jpeg());
    let dispose = () => {};
    const decode = vi.fn(),
      made = create({
        decode,
        createReader() {
          dispose();
          return reader;
        },
      });
    if (!made.ok) throw new Error("setup");
    dispose = made.work.dispose;
    const begun = made.work.start(request(new Blob([jpeg()])));
    if (!begun.ok) throw new Error("start");
    expect(await begun.task.result).toEqual(failure("WORK_DISPOSED"));
    await flush();
    expect(reader.readAsArrayBuffer).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });
  it("cancel reentrantly inside decoder still observes late bitmap", async () => {
    let task: BackgroundAbsenceDecodeTask;
    const b = bitmap();
    const s = setup(jpeg(), () => {
      task.cancel();
      return Promise.resolve(b);
    });
    task = s.start();
    s.reader.onload?.();
    expect(await task.result).toEqual(failure("WORK_CANCELLED"));
    await flush();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(s.work.getState()).toBe("idle");
  });
  it("close reentry cannot reserve until cleanup returns", async () => {
    const s = setup(),
      task = await decoding(s),
      close = vi.fn(() => {
        expect(s.work.start(request(s.file))).toEqual(failure("WORK_BUSY"));
      });
    s.resolve({ width: 3, height: 2, close });
    await task.result;
    task.release();
    expect(close).toHaveBeenCalledTimes(1);
    expect(s.work.getState()).toBe("idle");
  });
  it("permanent dispose rejects starts before request access", () => {
    const s = setup(),
      get = vi.fn();
    s.work.dispose();
    s.work.dispose();
    expect(
      s.work.start({
        get file() {
          get();
          return s.file;
        },
      }),
    ).toEqual(failure("WORK_DISPOSED"));
    expect(get).not.toHaveBeenCalled();
  });
});
