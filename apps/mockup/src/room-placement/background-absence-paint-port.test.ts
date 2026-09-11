import { describe, expect, it, vi } from "vitest";
import {
  createRoomBackgroundAbsencePaintPreparationPort,
  createRoomBackgroundAbsencePreparationPort,
} from "./background-absence-preparation-port";
import type { BackgroundFileReaderPort } from "./background-file";
import { createRoomPaintPreparationController } from "./preparation";

const jpeg = (metadata = false) =>
  new Uint8Array([
    255,
    216,
    ...(metadata ? [255, 224, 0, 2] : []),
    255,
    192,
    0,
    11,
    8,
    0,
    2,
    0,
    3,
    1,
    1,
    17,
    0,
    255,
    218,
    0,
    8,
    1,
    1,
    0,
    0,
    63,
    0,
    17,
    255,
    217,
  ]);
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
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
const paintInput = () => ({
  target: {},
  frameRect: { x: 2, y: 3, width: 8, height: 4 },
  backgroundRect: { x: 0, y: 0, width: 6, height: 4 },
});
function setup(metadata = false) {
  const bytes = jpeg(metadata),
    reader = new Reader(bytes),
    file = new Blob([bytes]),
    identity = {},
    sourceIdentity = {};
  let source = {
    identity: sourceIdentity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
  };
  let resolve!: (value: unknown) => void;
  const pending = new Promise<unknown>((yes) => {
    resolve = yes;
  });
  const readRequest = vi.fn((_identity: object): unknown => ({
    identity,
    file,
    budget: { maxEdge: 64 },
  }));
  const decode = vi.fn((_blob: Blob, _options: unknown): unknown => pending);
  const environment = { readRequest, decode, createReader: vi.fn(() => reader) };
  const made = createRoomBackgroundAbsencePaintPreparationPort(environment);
  if (!made.ok) throw new Error("setup");
  const order: string[] = [];
  const resource = {
    width: 3,
    height: 2,
    close: vi.fn(),
    copyTo: vi.fn(() => {
      order.push("background");
    }),
  };
  const frame = {
    width: 4,
    height: 2,
    release: vi.fn(),
    paint: vi.fn((_r: unknown): unknown => {
      order.push("frame");
      return { ok: true };
    }),
  };
  const controllerResult = createRoomPaintPreparationController({
    readSource: () => source,
    captureFrame: () => frame,
    startBackground: made.port.startBackground,
  });
  if (!controllerResult.ok) throw new Error("setup");
  return {
    file,
    bytes,
    identity,
    sourceIdentity,
    reader,
    readRequest,
    decode,
    environment,
    port: made.port,
    controller: controllerResult.controller,
    order,
    resource,
    frame,
    resolve,
    request: { sourceIdentity, backgroundIdentity: identity },
    changeSource: () => {
      source = { ...source, identity: {} };
    },
  };
}
async function ready(s: ReturnType<typeof setup>) {
  const pending = s.controller.prepare(s.request);
  s.reader.onload?.();
  await flush();
  s.resolve(s.resource);
  expect(await pending).toEqual({ ok: true });
  const view = s.controller.readPaintPrepared(s.request);
  if (!view) throw new Error("setup");
  return view;
}
const dispose = (s: ReturnType<typeof setup>) => {
  s.controller.dispose();
  s.port.dispose();
};
describe("spec127 actual preparation / paint port / checked decode chain", () => {
  it("does no factory I/O and keeps the decoded byte object private", async () => {
    const s = setup();
    expect(s.readRequest).not.toHaveBeenCalled();
    expect(s.environment.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
    const view = await ready(s),
      input = paintInput();
    expect(view.paint(input)).toEqual({ ok: true });
    expect(s.order).toEqual(["background", "frame"]);
    expect(s.readRequest).toHaveBeenCalledTimes(1);
    expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    expect(s.decode).toHaveBeenCalledTimes(1);
    const checkedBlob = s.decode.mock.calls[0][0];
    expect(checkedBlob).not.toBe(s.file);
    expect(checkedBlob.type).toBe("image/jpeg");
    expect(new Uint8Array(await checkedBlob.arrayBuffer())).toEqual(s.bytes);
    expect(s.decode.mock.calls[0][1]).toEqual({ imageOrientation: "from-image" });
    expect(Object.keys(view).sort()).toEqual(["backgroundSize", "frameSize", "paint"]);
    dispose(s);
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    expect(s.frame.release).toHaveBeenCalledTimes(1);
    expect(s.port.getState()).toBe("disposed");
  });
  it("metadata is rejected before decode and pair is not exposed", async () => {
    const s = setup(true),
      pending = s.controller.prepare(s.request);
    s.reader.onload?.();
    expect(await pending).toEqual({ ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" });
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.controller.readPaintPrepared(s.request)).toBeNull();
    expect(s.frame.release).toHaveBeenCalledTimes(1);
    expect(s.order).toEqual([]);
    dispose(s);
  });
  it("wrong identity lookup does no reader/decode", async () => {
    const s = setup();
    s.readRequest.mockReturnValue({ identity: {}, file: s.file, budget: { maxEdge: 64 } });
    expect(await s.controller.prepare(s.request)).toEqual({
      ok: false,
      code: "ROOM_PREPARATION_BACKGROUND_FAILED",
    });
    expect(s.environment.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
    dispose(s);
  });
  it.each(["clear", "dispose"] as const)(
    "%s pending decode closes late result exactly once",
    async (action) => {
      const s = setup(),
        pending = s.controller.prepare(s.request);
      s.reader.onload?.();
      await flush();
      expect(s.decode).toHaveBeenCalledTimes(1);
      s.controller[action]();
      if (action === "dispose") s.port.dispose();
      expect(await pending).toEqual({
        ok: false,
        code: action === "clear" ? "ROOM_PREPARATION_CANCELLED" : "ROOM_PREPARATION_DISPOSED",
      });
      s.resolve(s.resource);
      await flush();
      expect(s.resource.close).toHaveBeenCalledTimes(1);
      expect(s.resource.copyTo).not.toHaveBeenCalled();
      expect(s.frame.release).toHaveBeenCalledTimes(1);
      expect(s.controller.readPaintPrepared(s.request)).toBeNull();
      dispose(s);
    },
  );
  it("source changes prevent both copies and close checked decode", async () => {
    const s = setup(),
      view = await ready(s);
    s.changeSource();
    expect(view.paint(paintInput())).toEqual({
      ok: false,
      code: "ROOM_PREPARED_PAINT_SOURCE_CHANGED",
    });
    expect(s.order).toEqual([]);
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    dispose(s);
  });
  it("port-only dispose is a failed paint, never successful pair", async () => {
    const s = setup(),
      view = await ready(s);
    s.port.dispose();
    expect(view.paint(paintInput())).toEqual({ ok: false, code: "ROOM_PREPARED_PAINT_FAILED" });
    expect(s.order).toEqual([]);
    expect(s.frame.release).toHaveBeenCalledTimes(1);
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    expect(s.controller.getState()).toBe("empty");
    dispose(s);
  });
  it("copy throw retires pair and does not paint frame", async () => {
    const s = setup(),
      view = await ready(s);
    s.resource.copyTo.mockImplementation(() => {
      throw new Error("private");
    });
    expect(view.paint(paintInput())).toEqual({ ok: false, code: "ROOM_PREPARED_PAINT_FAILED" });
    expect(s.frame.paint).not.toHaveBeenCalled();
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    dispose(s);
  });
  it("old size port never inspects decoder copyTo", async () => {
    const s = setup(),
      made = createRoomBackgroundAbsencePreparationPort(s.environment);
    if (!made.ok) throw new Error("setup");
    const getter = vi.fn(() => {
      throw new Error("hidden");
    });
    Object.defineProperty(s.resource, "copyTo", { get: getter });
    const complete = vi.fn((lease: { release(): void }) => lease.release()),
      fail = vi.fn();
    made.port.startBackground(s.identity, { complete, fail });
    s.reader.onload?.();
    await flush();
    s.resolve(s.resource);
    await flush();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(fail).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
    expect(Object.keys(complete.mock.calls[0][0]).sort()).toEqual(["height", "release", "width"]);
    made.port.dispose();
    dispose(s);
  });
});
