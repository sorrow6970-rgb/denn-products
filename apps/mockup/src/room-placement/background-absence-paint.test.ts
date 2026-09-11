import { describe, expect, it, vi } from "vitest";
import {
  createRoomBackgroundAbsenceDecodeWork,
  createRoomBackgroundAbsencePaintWork,
} from "./background-absence-decode";
import type { BackgroundFileReaderPort } from "./background-file";
import type { BackgroundPaintLease } from "./background-paint-lease";

const jpeg = () =>
  new Uint8Array([
    255, 216, 255, 192, 0, 11, 8, 0, 2, 0, 3, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 17,
    255, 217,
  ]);
class Reader implements BackgroundFileReaderPort {
  result: unknown = jpeg().buffer;
  readyState = 2;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer = vi.fn((_blob: Blob) => {});
  abort = vi.fn(() => this.onabort?.());
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const request = () => ({ target: {}, rect: { x: -3, y: 4, width: 6, height: 4 } });
const failed = (suffix: string) => ({ ok: false, code: `ROOM_BACKGROUND_PAINT_${suffix}` });
function setup() {
  const reader = new Reader(),
    file = new Blob([jpeg()]);
  let resolve!: (v: unknown) => void, reject!: (v?: unknown) => void;
  const pending = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const decode = vi.fn((_blob: Blob) => pending),
    createReader = vi.fn(() => reader);
  const made = createRoomBackgroundAbsencePaintWork({ decode, createReader });
  if (!made.ok) throw new Error("setup");
  const start = () => {
    const r = made.work.start({ file, budget: { maxEdge: 64 } });
    if (!r.ok) throw new Error("setup");
    return r.task;
  };
  const resource = { width: 3, height: 2, close: vi.fn(), copyTo: vi.fn() };
  return { reader, file, resolve, reject, decode, createReader, work: made.work, start, resource };
}
async function ready(s: ReturnType<typeof setup>) {
  const task = s.start();
  s.reader.onload?.();
  await flush();
  s.resolve(s.resource);
  expect(await task.result).toEqual({ ok: true });
  const lease = task.takeLease();
  if (!lease) throw new Error("setup");
  return { task, lease };
}

describe("spec125 explicit background paint work", () => {
  it("has no default I/O and needs a trusted decoder", () => {
    expect(createRoomBackgroundAbsencePaintWork(null)).toEqual({
      ok: false,
      code: "ROOM_BACKGROUND_WORK_INVALID_INPUT",
    });
    const s = setup();
    expect(s.work.getState()).toBe("idle");
    expect(s.createReader).not.toHaveBeenCalled();
    expect(s.decode).not.toHaveBeenCalled();
  });
  it("keeps size-only factory surface and never touches copyTo", async () => {
    const s = setup(),
      getter = vi.fn(() => {
        throw new Error("private");
      });
    const made = createRoomBackgroundAbsenceDecodeWork({
      decode: s.decode,
      createReader: s.createReader,
    });
    if (!made.ok) throw new Error("setup");
    const r = made.work.start({ file: s.file, budget: { maxEdge: 64 } });
    if (!r.ok) throw new Error("setup");
    s.reader.onload?.();
    await flush();
    s.resolve(Object.defineProperty(s.resource, "copyTo", { get: getter }));
    expect(await r.task.result).toEqual({ ok: true });
    const lease = r.task.takeLease();
    expect(Object.keys(lease ?? {}).sort()).toEqual(["height", "release", "width"]);
    expect(getter).not.toHaveBeenCalled();
    lease?.release();
    expect(s.resource.close).toHaveBeenCalledTimes(1);
  });
  it("transfers a frozen private paint lease once using exactly one checked decode", async () => {
    const s = setup(),
      { task, lease } = await ready(s),
      input = request();
    expect(Object.isFrozen(lease)).toBe(true);
    expect(Object.keys(lease).sort()).toEqual(["height", "paint", "release", "width"]);
    expect(task.takeLease()).toBeNull();
    expect(lease.paint(input)).toEqual({ ok: true });
    expect(s.resource.copyTo.mock.calls).toEqual([
      [input.target, { x: 0, y: 0, width: 3, height: 2 }, input.rect],
    ]);
    expect(s.decode).toHaveBeenCalledTimes(1);
    expect(s.reader.readAsArrayBuffer).toHaveBeenCalledTimes(1);
    const blob = s.decode.mock.calls[0][0];
    expect(blob).not.toBe(s.file);
    expect(blob.type).toBe("image/jpeg");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(jpeg());
    lease.release();
    task.release();
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    expect(lease.paint(input)).toEqual(failed("RELEASED"));
  });
  it("captures copyTo once with receiver", async () => {
    const s = setup(),
      reads = vi.fn();
    const fn = vi.fn(function (this: unknown) {
      expect(this).toBe(s.resource);
    });
    Object.defineProperty(s.resource, "copyTo", {
      get() {
        reads();
        return fn;
      },
    });
    const { lease } = await ready(s);
    expect(lease.paint(request())).toEqual({ ok: true });
    expect(lease.paint(request())).toEqual({ ok: true });
    expect(reads).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(2);
    lease.release();
  });
  it.each(["missing", "throw", "wrong"])(
    "rejects %s copy capability and closes once",
    async (mode) => {
      const s = setup(),
        task = s.start();
      s.reader.onload?.();
      await flush();
      const r = {
        width: 3,
        height: 2,
        close: s.resource.close,
        get copyTo() {
          if (mode === "throw") throw new Error("private");
          return mode === "missing" ? undefined : 3;
        },
      };
      s.resolve(r);
      expect(await task.result).toEqual({ ok: false, code: "ROOM_BACKGROUND_DECODE_FAILED" });
      expect(task.takeLease()).toBeNull();
      expect(r.close).toHaveBeenCalledTimes(1);
      expect(s.work.getState()).toBe("idle");
    },
  );
  it.each(["cancel", "dispose"])(
    "copy getter %s closes before authority can escape",
    async (action) => {
      const s = setup(),
        task = s.start(),
        copy = vi.fn();
      s.reader.onload?.();
      await flush();
      s.resolve({
        width: 3,
        height: 2,
        close: s.resource.close,
        get copyTo() {
          if (action === "cancel") task.cancel();
          else s.work.dispose();
          return copy;
        },
      });
      expect((await task.result).ok).toBe(false);
      expect(task.takeLease()).toBeNull();
      expect(copy).not.toHaveBeenCalled();
      expect(s.resource.close).toHaveBeenCalledTimes(1);
    },
  );
  it("size mismatch never reads copy capability", async () => {
    const s = setup(),
      getter = vi.fn(),
      task = s.start();
    s.reader.onload?.();
    await flush();
    s.resolve({
      width: 4,
      height: 2,
      close: s.resource.close,
      get copyTo() {
        getter();
        return vi.fn();
      },
    });
    expect(await task.result).toEqual({ ok: false, code: "ROOM_BACKGROUND_DECODE_SIZE_MISMATCH" });
    expect(getter).not.toHaveBeenCalled();
    expect(s.resource.close).toHaveBeenCalledTimes(1);
  });
  it("metadata never starts decode", async () => {
    const s = setup();
    s.reader.result = new Uint8Array([255, 216, 255, 224, 0, 2, ...jpeg().slice(2)]).buffer;
    const file = new Blob([s.reader.result as ArrayBuffer]);
    const r = s.work.start({ file, budget: { maxEdge: 64 } });
    if (!r.ok) throw new Error("setup");
    s.reader.onload?.();
    expect((await r.task.result).ok).toBe(false);
    expect(s.decode).not.toHaveBeenCalled();
  });
  it("read cancellation does not decode", async () => {
    const s = setup(),
      task = s.start(),
      late = s.reader.onload;
    task.cancel();
    late?.();
    await flush();
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.reader.abort).toHaveBeenCalledTimes(1);
    expect(task.takeLease()).toBeNull();
  });
  it.each(["cancel", "dispose"])(
    "late result after %s closes without reading copyTo",
    async (action) => {
      const s = setup(),
        task = s.start(),
        getter = vi.fn();
      s.reader.onload?.();
      await flush();
      if (action === "cancel") task.cancel();
      else s.work.dispose();
      const next = s.work.start({
        get file() {
          throw new Error("must not read");
        },
      });
      expect(next.ok).toBe(false);
      s.resolve({
        width: 3,
        height: 2,
        close: s.resource.close,
        get copyTo() {
          getter();
          return vi.fn();
        },
      });
      await flush();
      expect(getter).not.toHaveBeenCalled();
      expect(s.resource.close).toHaveBeenCalledTimes(1);
      expect(task.takeLease()).toBeNull();
    },
  );
  it("pending cancel stays BUSY until late rejection", async () => {
    const s = setup(),
      task = s.start();
    s.reader.onload?.();
    await flush();
    task.cancel();
    expect(s.work.getState()).toBe("pending");
    s.reject(new Error("private"));
    await flush();
    expect(s.work.getState()).toBe("idle");
    expect(task.takeLease()).toBeNull();
  });
  it.each([
    null,
    [],
    {},
    { target: {}, rect: { x: 0, y: 0, width: 6, height: 5 } },
    { target: {}, rect: { x: Infinity, y: 0, width: 6, height: 4 } },
    { target: {}, rect: { x: 0, y: 0, width: 0, height: 4 } },
    { target: {}, rect: { x: 0, y: 0, width: Number.MIN_VALUE, height: Number.MIN_VALUE } },
  ])("keeps lease for invalid paint %s", async (input) => {
    const s = setup(),
      { lease } = await ready(s);
    expect(lease.paint(input)).toEqual(failed("INVALID_INPUT"));
    expect(s.resource.copyTo).not.toHaveBeenCalled();
    expect(s.resource.close).not.toHaveBeenCalled();
    expect(lease.paint(request())).toEqual({ ok: true });
    lease.release();
  });
  it("uses uniform scale within numeric tolerance", async () => {
    const s = setup(),
      { lease } = await ready(s);
    const input = { target: {}, rect: { x: 0, y: 0, width: 6, height: 4 + 1e-10 } };
    expect(lease.paint(input)).toEqual({ ok: true });
    expect(s.resource.copyTo.mock.calls[0][2]).toEqual({ x: 0, y: 0, width: 6, height: 4 });
    lease.release();
  });
  it("captures target/rect/coordinates once with no mutation", async () => {
    const s = setup(),
      { lease } = await ready(s),
      keys: string[] = [],
      target = {};
    const rect = {
      get x() {
        keys.push("x");
        return 0;
      },
      get y() {
        keys.push("y");
        return 0;
      },
      get width() {
        keys.push("width");
        return 6;
      },
      get height() {
        keys.push("height");
        return 4;
      },
    };
    expect(
      lease.paint({
        get target() {
          keys.push("target");
          return target;
        },
        get rect() {
          keys.push("rect");
          return rect;
        },
      }),
    ).toEqual({ ok: true });
    expect(keys).toEqual(["target", "rect", "x", "y", "width", "height"]);
    lease.release();
  });
  it.each(["target", "rect", "x", "y", "width", "height"])(
    "release at %s getter prevents later getters/copy",
    async (stopAt) => {
      const s = setup(),
        { lease } = await ready(s),
        keys: string[] = [],
        all = ["target", "rect", "x", "y", "width", "height"];
      const visit = (key: string) => {
        keys.push(key);
        if (key === stopAt) lease.release();
      };
      const rect = {
        get x() {
          visit("x");
          return 0;
        },
        get y() {
          visit("y");
          return 0;
        },
        get width() {
          visit("width");
          return 6;
        },
        get height() {
          visit("height");
          return 4;
        },
      };
      expect(
        lease.paint({
          get target() {
            visit("target");
            return {};
          },
          get rect() {
            visit("rect");
            return rect;
          },
        }),
      ).toEqual(failed("RELEASED"));
      expect(keys).toEqual(all.slice(0, all.indexOf(stopAt) + 1));
      expect(s.resource.copyTo).not.toHaveBeenCalled();
      expect(s.resource.close).toHaveBeenCalledTimes(1);
    },
  );
  it("getter throw is safe and preserves the lease", async () => {
    const s = setup(),
      { lease } = await ready(s);
    expect(
      lease.paint({
        get target() {
          throw new Error("private");
        },
      }),
    ).toEqual(failed("INVALID_INPUT"));
    expect(s.resource.close).not.toHaveBeenCalled();
    lease.release();
  });
  it("nested paint is BUSY but outer copy completes once", async () => {
    const s = setup(),
      { lease } = await ready(s);
    s.resource.copyTo.mockImplementation(() => {
      expect(lease.paint(request())).toEqual(failed("BUSY"));
    });
    expect(lease.paint(request())).toEqual({ ok: true });
    expect(s.resource.copyTo).toHaveBeenCalledTimes(1);
    lease.release();
  });
  it.each(["release", "cancel", "dispose"])(
    "%s inside copy cannot return success",
    async (action) => {
      const s = setup(),
        { task, lease } = await ready(s);
      s.resource.copyTo.mockImplementation(() => {
        if (action === "dispose") s.work.dispose();
        else if (action === "cancel") task.cancel();
        else lease.release();
      });
      expect(lease.paint(request())).toEqual(
        failed(action === "dispose" ? "DISPOSED" : "RELEASED"),
      );
      expect(s.resource.copyTo).toHaveBeenCalledTimes(1);
      expect(s.resource.close).toHaveBeenCalledTimes(1);
    },
  );
  it("throwing copy retires lease without retry", async () => {
    const s = setup(),
      { lease } = await ready(s);
    s.resource.copyTo.mockImplementation(() => {
      throw new Error("private");
    });
    expect(lease.paint(request())).toEqual(failed("FAILED"));
    expect(lease.paint(request())).toEqual(failed("RELEASED"));
    expect(s.resource.close).toHaveBeenCalledTimes(1);
    expect(s.resource.copyTo).toHaveBeenCalledTimes(1);
  });
  it("dispose from failed-copy cleanup takes precedence", async () => {
    const s = setup(),
      { lease } = await ready(s);
    s.resource.copyTo.mockImplementation(() => {
      throw new Error("private");
    });
    s.resource.close.mockImplementation(() => s.work.dispose());
    expect(lease.paint(request())).toEqual(failed("DISPOSED"));
  });
  it("close failure blocks new work and cannot reenter paint", async () => {
    const s = setup(),
      { lease } = await ready(s);
    s.resource.close.mockImplementation(() => {
      expect(lease.paint(request())).toEqual(failed("RELEASED"));
      throw new Error("private");
    });
    lease.release();
    expect(s.work.getState()).toBe("blocked");
    expect(s.work.start({}).ok).toBe(false);
    expect(s.resource.copyTo).not.toHaveBeenCalled();
  });
  it("disposed and released skip even hostile request getters", async () => {
    const s = setup(),
      { lease } = await ready(s),
      getter = vi.fn(() => {
        throw new Error("private");
      }),
      input = {
        get target() {
          return getter();
        },
      };
    lease.release();
    expect(lease.paint(input)).toEqual(failed("RELEASED"));
    s.work.dispose();
    expect(lease.paint(input)).toEqual(failed("DISPOSED"));
    expect(getter).not.toHaveBeenCalled();
  });
  it("old lease/task cannot paint or release a later work cohort", async () => {
    const s = setup(),
      old = await ready(s);
    old.lease.release();
    const nextResource = { width: 3, height: 2, close: vi.fn(), copyTo: vi.fn() };
    s.decode.mockImplementation(() => Promise.resolve(nextResource));
    const task = s.start();
    s.reader.onload?.();
    expect(await task.result).toEqual({ ok: true });
    const lease = task.takeLease() as BackgroundPaintLease;
    old.task.cancel();
    old.lease.release();
    expect(old.lease.paint(request())).toEqual(failed("RELEASED"));
    expect(lease.paint(request())).toEqual({ ok: true });
    expect(nextResource.close).not.toHaveBeenCalled();
    lease.release();
    expect(nextResource.close).toHaveBeenCalledTimes(1);
  });
});
