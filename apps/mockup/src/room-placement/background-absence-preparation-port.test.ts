import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoomBackgroundAbsencePreparationPort as create } from "./background-absence-preparation-port";
import type { BackgroundFileReaderPort } from "./background-file";
import { createRoomPreparationController } from "./preparation";

// Synthetic envelopes and fake decoder only: not native integration or pixel evidence.
const jpeg = () =>
  new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
function widePng() {
  function chunk(name: string, data: number[]) {
    const body = [...Array.from(name, (c) => c.charCodeAt(0)), ...data];
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
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
  }
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk("IHDR", [0, 15, 66, 65, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
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
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const bitmap = () => ({ width: 3, height: 2, close: vi.fn() });
const sinkOf = () => ({ complete: vi.fn(), fail: vi.fn() });
function owner(environment: unknown) {
  const result = create(environment);
  if (!result.ok) throw new Error("setup");
  return result.port;
}
function setup(bytes = jpeg()) {
  const reader = new Reader(bytes),
    file = new Blob([bytes], { type: "image/gif" }),
    identity = {};
  const request = { identity, file, budget: { maxEdge: 2_000_000 } };
  let resolve!: (value: unknown) => void, reject!: (value?: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const order: string[] = [];
  const readRequest = vi.fn((_identity: object): unknown => {
    order.push("lookup");
    return request;
  });
  reader.readAsArrayBuffer.mockImplementation(() => {
    order.push("read");
  });
  const decode = vi.fn((_blob: Blob, _options: unknown): unknown => {
    order.push("decode");
    return promise;
  });
  const createReader = vi.fn(() => reader);
  const port = owner({ readRequest, decode, createReader });
  const sink = sinkOf();
  const start = () => port.startBackground(identity, sink);
  return {
    reader,
    file,
    identity,
    request,
    resolve,
    reject,
    order,
    readRequest,
    decode,
    createReader,
    port,
    sink,
    start,
  };
}
async function decoding(s: ReturnType<typeof setup>) {
  const handle = s.start();
  s.reader.onload?.();
  await flush();
  expect(s.decode).toHaveBeenCalledTimes(1);
  return handle;
}
function harness(bytes = jpeg()) {
  const s = setup(bytes),
    request = { sourceIdentity: {}, backgroundIdentity: s.identity };
  const source = {
    identity: request.sourceIdentity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
  };
  const frames: { width: number; height: number; release: ReturnType<typeof vi.fn> }[] = [];
  const captureFrame = vi.fn(() => {
    s.order.push("capture");
    const frame = { width: 640, height: 480, release: vi.fn() };
    frames.push(frame);
    return frame;
  });
  const made = createRoomPreparationController({
    readSource: () => source,
    captureFrame,
    startBackground: s.port.startBackground,
  });
  if (!made.ok) throw new Error("setup");
  return {
    ...s,
    controller: made.controller,
    prepareRequest: request,
    source,
    frames,
    captureFrame,
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("spec123 absence preparation bridge", () => {
  it.each([
    null,
    [],
    () => {},
    {},
    { readRequest: () => {} },
    { readRequest: () => {}, decode: () => {}, createReader: 3 },
  ])("rejects invalid factory %s", (value) => {
    expect(create(value)).toEqual({ ok: false, code: "ROOM_BACKGROUND_WORK_INVALID_INPUT" });
  });
  it("captures environment once with receiver and does no factory I/O", async () => {
    const s = setup(),
      reads: string[] = [];
    const environment = {
      get readRequest() {
        reads.push("lookup");
        return function (this: unknown, identity: object) {
          expect(this).toBe(environment);
          return s.readRequest(identity);
        };
      },
      get decode() {
        reads.push("decode");
        return function (this: unknown, blob: Blob, options: unknown) {
          expect(this).toBe(environment);
          return s.decode(blob, options);
        };
      },
      get createReader() {
        reads.push("reader");
        return function (this: unknown) {
          expect(this).toBe(environment);
          return s.reader;
        };
      },
    };
    const p = owner(environment);
    expect(Object.isFrozen(p)).toBe(true);
    expect(s.order).toEqual([]);
    p.startBackground(s.identity, s.sink);
    s.reader.onload?.();
    await flush();
    expect(reads).toEqual(["lookup", "decode", "reader"]);
    s.reject();
    await flush();
  });
  it.each(["readRequest", "decode", "createReader"])("contains factory %s getter errors", (key) => {
    expect(
      create(
        Object.defineProperty({}, key, {
          get() {
            throw new Error("private");
          },
        }),
      ),
    ).toEqual({ ok: false, code: "ROOM_BACKGROUND_WORK_INVALID_INPUT" });
  });
  it.each([null, [], () => {}, 1])("rejects identity before lookup %s", (identity) => {
    const s = setup();
    expect(() => s.port.startBackground(identity, s.sink)).toThrow(
      "ROOM_BACKGROUND_WORK_INVALID_INPUT",
    );
    expect(s.readRequest).not.toHaveBeenCalled();
  });
  it.each([
    () => null,
    () => ({}),
    () => ({ complete: 3, fail: () => {} }),
    () => ({
      complete: () => {},
      get fail() {
        throw new Error("private");
      },
    }),
  ])("rejects sink safely %s", (makeSink) => {
    const s = setup();
    expect(() => s.port.startBackground(s.identity, makeSink())).toThrow(
      /^ROOM_BACKGROUND_WORK_INVALID_INPUT$/,
    );
    expect(s.readRequest).not.toHaveBeenCalled();
  });
  it("blocks mismatched identity before file getter", async () => {
    const s = setup(),
      file = vi.fn();
    s.readRequest.mockReturnValue({
      identity: {},
      get file() {
        file();
        return s.file;
      },
    });
    s.start();
    await flush();
    expect(file).not.toHaveBeenCalled();
    expect(s.createReader).not.toHaveBeenCalled();
    expect(s.sink.fail.mock.calls).toEqual([[]]);
  });
  it("captures input once and snapshots maxEdge against later mutation", async () => {
    const s = setup(),
      seen: string[] = [];
    let edge = 3;
    s.readRequest.mockReturnValue({
      get identity() {
        seen.push("identity");
        return s.identity;
      },
      get file() {
        seen.push("file");
        return s.file;
      },
      get budget() {
        seen.push("budget");
        return {
          get maxEdge() {
            seen.push("edge");
            return edge;
          },
        };
      },
    });
    s.start();
    edge = 1;
    s.reader.onload?.();
    await flush();
    s.resolve(bitmap());
    await flush();
    expect(seen).toEqual(["identity", "file", "budget", "edge"]);
    expect(s.sink.complete).toHaveBeenCalledTimes(1);
    s.port.dispose();
  });
  it.each(["lookup", "identity", "file", "budget", "edge"])(
    "stops immediately after reentrant dispose at %s",
    (where) => {
      const s = setup(),
        seen: string[] = [];
      const visit = (key: string) => {
        seen.push(key);
        if (key === where) s.port.dispose();
      };
      s.readRequest.mockImplementation(() => {
        visit("lookup");
        return {
          get identity() {
            visit("identity");
            return s.identity;
          },
          get file() {
            visit("file");
            return s.file;
          },
          get budget() {
            visit("budget");
            return {
              get maxEdge() {
                visit("edge");
                return 3;
              },
            };
          },
        };
      });
      s.start();
      expect(seen).toEqual(
        ["lookup", "identity", "file", "budget", "edge"].slice(
          0,
          ["lookup", "identity", "file", "budget", "edge"].indexOf(where) + 1,
        ),
      );
      expect(s.createReader).not.toHaveBeenCalled();
      expect(s.decode).not.toHaveBeenCalled();
      expect(s.sink.fail).not.toHaveBeenCalled();
    },
  );
  it.each(["lookup", "identity", "file", "budget", "edge"])(
    "contains request errors at %s",
    async (where) => {
      const s = setup();
      const visit = (key: string) => {
        if (key === where) throw new Error("private");
      };
      s.readRequest.mockImplementation(() => {
        visit("lookup");
        return {
          get identity() {
            visit("identity");
            return s.identity;
          },
          get file() {
            visit("file");
            return s.file;
          },
          get budget() {
            visit("budget");
            return {
              get maxEdge() {
                visit("edge");
                return 3;
              },
            };
          },
        };
      });
      s.start();
      await flush();
      expect(s.createReader).not.toHaveBeenCalled();
      expect(s.sink.fail.mock.calls).toEqual([[]]);
    },
  );
  it("passes only frozen size lease and preserves sink receiver", async () => {
    const s = setup(),
      b = bitmap(),
      reads: string[] = [];
    const sink = {
      get complete() {
        reads.push("complete");
        return function (this: unknown, value: unknown) {
          expect(this).toBe(sink);
          expect(Object.keys(value as object).sort()).toEqual(["height", "release", "width"]);
          expect(Object.isFrozen(value)).toBe(true);
          s.sink.complete(value);
        };
      },
      get fail() {
        reads.push("fail");
        return s.sink.fail;
      },
    };
    const handle = s.port.startBackground(s.identity, sink);
    expect(Object.isFrozen(handle)).toBe(true);
    s.reader.onload?.();
    await flush();
    const [blob, options] = s.decode.mock.calls[0];
    expect(blob).not.toBe(s.file);
    expect(blob.type).toBe("image/jpeg");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(jpeg());
    expect(options).toEqual({ imageOrientation: "from-image" });
    s.resolve(b);
    await flush();
    expect(reads).toEqual(["complete", "fail"]);
    expect(s.sink.complete).toHaveBeenCalledTimes(1);
    handle.cancel();
    handle.cancel();
    expect(b.close).toHaveBeenCalledTimes(1);
  });
  it("disposed owner refuses input lookup with one safe failure", () => {
    const s = setup();
    s.port.dispose();
    s.start();
    expect(s.readRequest).not.toHaveBeenCalled();
    expect(s.sink.fail.mock.calls).toEqual([[]]);
  });
  it("sink getter disposal prevents any request lookup", () => {
    const s = setup();
    s.port.startBackground(s.identity, {
      get complete() {
        s.port.dispose();
        return s.sink.complete;
      },
      fail: s.sink.fail,
    });
    expect(s.readRequest).not.toHaveBeenCalled();
  });
  it("nested lookup cannot bypass the already reserved slot", async () => {
    const s = setup(),
      nested = sinkOf();
    s.readRequest.mockImplementation(() => {
      s.port.startBackground(s.identity, nested);
      return s.request;
    });
    s.start();
    expect(s.readRequest).toHaveBeenCalledTimes(1);
    expect(nested.fail.mock.calls).toEqual([[]]);
    s.port.dispose();
    await flush();
  });
  it("read cancellation aborts once and suppresses stale load", async () => {
    const s = setup(),
      handle = s.start(),
      stale = s.reader.onload;
    handle.cancel();
    handle.cancel();
    stale?.();
    await flush();
    expect(s.reader.abort).toHaveBeenCalledTimes(1);
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.sink.fail).not.toHaveBeenCalled();
  });
  it.each(["cancel", "dispose"])("cleans late fulfillment after %s", async (mode) => {
    const s = setup(),
      handle = await decoding(s),
      b = bitmap();
    if (mode === "cancel") handle.cancel();
    else s.port.dispose();
    const nested = sinkOf();
    s.port.startBackground(s.identity, nested);
    expect(s.readRequest).toHaveBeenCalledTimes(1);
    expect(nested.fail).toHaveBeenCalledTimes(1);
    s.resolve(b);
    await flush();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(s.sink.complete).not.toHaveBeenCalled();
    expect(s.sink.fail).not.toHaveBeenCalled();
  });
  it("late rejection frees capacity but never emits cancellation callbacks", async () => {
    const s = setup(),
      handle = await decoding(s);
    handle.cancel();
    expect(s.port.getState()).toBe("pending");
    s.reject(new Error("private"));
    await flush();
    expect(s.port.getState()).toBe("idle");
    expect(s.sink.fail).not.toHaveBeenCalled();
  });
  it("never-settled decoder retains BUSY without retry", async () => {
    const s = setup(),
      handle = await decoding(s);
    handle.cancel();
    s.port.startBackground(s.identity, sinkOf());
    await flush();
    expect(s.port.getState()).toBe("pending");
    expect(s.readRequest).toHaveBeenCalledTimes(1);
    expect(s.decode).toHaveBeenCalledTimes(1);
    s.port.dispose();
  });
  it("cancel after task success but before sink reaction releases rather than hands off", async () => {
    const s = setup(),
      handle = await decoding(s),
      b = bitmap();
    s.resolve(b);
    await Promise.resolve();
    expect(s.port.getState()).toBe("held");
    handle.cancel();
    await flush();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(s.sink.complete).not.toHaveBeenCalled();
  });
  it.each(["reader", "decoder"])(
    "contains reentrant %s disposal and late cleanup",
    async (point) => {
      const s = setup(),
        b = bitmap();
      if (point === "reader") s.reader.readAsArrayBuffer.mockImplementation(() => s.port.dispose());
      else
        s.decode.mockImplementation(() => {
          s.port.dispose();
          return Promise.resolve(b);
        });
      s.start();
      s.reader.onload?.();
      await flush();
      expect(s.sink.complete).not.toHaveBeenCalled();
      expect(s.sink.fail).not.toHaveBeenCalled();
      if (point === "decoder") expect(b.close).toHaveBeenCalledTimes(1);
      else expect(s.decode).not.toHaveBeenCalled();
    },
  );
  it.each(["complete", "fail"] as const)(
    "contains reentrant throwing %s callbacks",
    async (kind) => {
      const s = setup(),
        b = bitmap();
      s.sink[kind].mockImplementation(() => {
        s.port.dispose();
        throw new Error("private");
      });
      await decoding(s);
      if (kind === "complete") s.resolve(b);
      else s.reject(new Error("private"));
      await flush();
      expect(s.sink[kind]).toHaveBeenCalledTimes(1);
      if (kind === "complete") {
        expect(b.close).toHaveBeenCalledTimes(1);
        expect(s.sink.fail).not.toHaveBeenCalled();
      }
    },
  );
  it("close reentrancy remains BUSY; throwing close blocks reuse", async () => {
    const s = setup(),
      b = bitmap(),
      nested = sinkOf();
    b.close.mockImplementation(() => {
      s.port.startBackground(s.identity, nested);
      throw new Error("private");
    });
    const handle = await decoding(s);
    s.resolve(b);
    await flush();
    handle.cancel();
    expect(s.port.getState()).toBe("blocked");
    s.port.startBackground(s.identity, nested);
    expect(s.readRequest).toHaveBeenCalledTimes(1);
    expect(b.close).toHaveBeenCalledTimes(1);
  });
  it.each(["metadata", "read", "size", "thenable", "readerThrow", "decodeThrow"])(
    "maps %s failures without raw output or retry",
    async (kind) => {
      const bytes =
          kind === "metadata"
            ? new Uint8Array([255, 216, 255, 224, 0, 2, ...jpeg().slice(2)])
            : jpeg(),
        s = setup(bytes);
      const then = vi.fn();
      if (kind === "thenable") s.decode.mockReturnValue({ then });
      if (kind === "readerThrow")
        s.reader.readAsArrayBuffer.mockImplementation(() => {
          throw new Error("private");
        });
      if (kind === "decodeThrow")
        s.decode.mockImplementation(() => {
          throw new Error("private");
        });
      s.start();
      if (kind === "read") s.reader.onerror?.();
      else s.reader.onload?.();
      await flush();
      if (kind === "size") s.resolve({ ...bitmap(), width: 4 });
      await flush();
      expect(s.sink.fail.mock.calls).toEqual([[]]);
      expect(s.sink.complete).not.toHaveBeenCalled();
      expect(then).not.toHaveBeenCalled();
      expect(s.readRequest).toHaveBeenCalledTimes(1);
      if (kind === "metadata" || kind === "read" || kind === "readerThrow")
        expect(s.decode).not.toHaveBeenCalled();
      if (kind === "thenable" || kind === "decodeThrow") expect(s.port.getState()).toBe("blocked");
    },
  );
  it("default FileReader is constructed only for a valid admitted start", async () => {
    const s = setup();
    const construct = vi.fn();
    class LocalReader extends Reader {
      constructor() {
        super(jpeg());
        construct();
      }
    }
    vi.stubGlobal("FileReader", LocalReader);
    const p = owner({ readRequest: s.readRequest, decode: s.decode });
    expect(construct).not.toHaveBeenCalled();
    p.startBackground(s.identity, s.sink);
    expect(construct).toHaveBeenCalledTimes(1);
    p.dispose();
    await flush();
  });
});

describe("spec123 actual preparation controller composition", () => {
  it("captures before lookup, copies only dimensions, and releases both on clear", async () => {
    const h = harness(),
      b = bitmap(),
      result = h.controller.prepare(h.prepareRequest);
    h.reader.onload?.();
    await flush();
    h.resolve(b);
    expect(await result).toEqual({ ok: true });
    expect(h.order).toEqual(["capture", "lookup", "read", "decode"]);
    const info = h.controller.readPrepared(h.prepareRequest);
    expect(info).toEqual({
      frameSize: { width: 640, height: 480 },
      backgroundSize: { width: 3, height: 2 },
    });
    if (!info) throw new Error("setup");
    Object.assign(info.backgroundSize, { width: 99 });
    expect(h.controller.readPrepared(h.prepareRequest)?.backgroundSize.width).toBe(3);
    expect(h.controller.readPrepared({ ...h.prepareRequest, backgroundIdentity: {} })).toBeNull();
    h.controller.clear();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
    h.port.dispose();
  });
  it.each(["source", "capture"])("%s rejection never looks up background", async (kind) => {
    const h = harness();
    if (kind === "source") h.source.projectionOk = false;
    else
      h.captureFrame.mockImplementation(() => {
        throw new Error("private");
      });
    expect((await h.controller.prepare(h.prepareRequest)).ok).toBe(false);
    expect(h.readRequest).not.toHaveBeenCalled();
  });
  it("pending replacement keeps one decode and cleans both frames", async () => {
    const h = harness(),
      first = h.controller.prepare(h.prepareRequest);
    h.reader.onload?.();
    await flush();
    const second = h.controller.prepare(h.prepareRequest);
    expect(await first).toEqual({ ok: false, code: "ROOM_PREPARATION_SUPERSEDED" });
    expect(await second).toEqual({ ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" });
    expect(h.readRequest).toHaveBeenCalledTimes(1);
    expect(h.createReader).toHaveBeenCalledTimes(1);
    expect(h.decode).toHaveBeenCalledTimes(1);
    for (const f of h.frames) expect(f.release).toHaveBeenCalledTimes(1);
    h.reject();
    await flush();
  });
  it("ready replacement releases old leases before another lookup", async () => {
    const h = harness(),
      b = bitmap(),
      first = h.controller.prepare(h.prepareRequest);
    h.reader.onload?.();
    await flush();
    h.resolve(b);
    await first;
    h.readRequest.mockImplementation(() => {
      expect(b.close).toHaveBeenCalledTimes(1);
      expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
      return h.request;
    });
    const second = h.controller.prepare(h.prepareRequest);
    expect(h.readRequest).toHaveBeenCalledTimes(2);
    h.controller.clear();
    expect((await second).ok).toBe(false);
    h.port.dispose();
  });
  it.each(["pending", "ready"])("source change at %s gate releases resources", async (when) => {
    const h = harness(),
      b = bitmap(),
      result = h.controller.prepare(h.prepareRequest);
    h.reader.onload?.();
    await flush();
    if (when === "pending") h.source.identity = {};
    h.resolve(b);
    await result;
    if (when === "ready") h.source.identity = {};
    expect(h.controller.readPrepared(h.prepareRequest)).toBeNull();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
  });
  it("controller.clear during lookup may start read once but never decode", async () => {
    const h = harness();
    h.readRequest.mockImplementation(() => {
      h.controller.clear();
      return h.request;
    });
    const result = h.controller.prepare(h.prepareRequest);
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_CANCELLED" });
    expect(h.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    h.reader.onload?.();
    await flush();
    expect(h.decode).not.toHaveBeenCalled();
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
    h.port.dispose();
  });
  it("joint disposal settles controller and cleans late bitmap", async () => {
    const h = harness(),
      result = h.controller.prepare(h.prepareRequest),
      b = bitmap();
    h.reader.onload?.();
    await flush();
    h.controller.dispose();
    h.port.dispose();
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_DISPOSED" });
    h.resolve(b);
    await flush();
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
  });
  it("port-only disposal does not own controller completion or frame", async () => {
    const h = harness(),
      done = vi.fn(),
      result = h.controller.prepare(h.prepareRequest);
    void result.then(done);
    h.reader.onload?.();
    await flush();
    h.port.dispose();
    await flush();
    expect(done).not.toHaveBeenCalled();
    expect(h.frames[0]?.release).not.toHaveBeenCalled();
    h.controller.dispose();
    await result;
    h.reject();
    await flush();
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
  });
  it("controller's existing cap rejects and releases otherwise admitted wide PNG", async () => {
    const h = harness(widePng()),
      b = { width: 1_000_001, height: 1, close: vi.fn() },
      result = h.controller.prepare(h.prepareRequest);
    h.reader.onload?.();
    await flush();
    expect(h.decode).toHaveBeenCalledTimes(1);
    h.resolve(b);
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" });
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
  });
});
