import { describe, expect, it, vi } from "vitest";
import {
  createRoomPaintPreparationController,
  createRoomPreparationController,
  type RoomBackgroundSink,
} from "./preparation";

const sourceOf = (identity: object) => ({
  identity,
  kind: "frame",
  projectionOk: true,
  planReady: true,
  clockPreview: null,
});
const fail = (suffix: string) => ({ ok: false, code: `ROOM_PREPARED_PAINT_${suffix}` });
const input = () => ({
  target: {},
  frameRect: { x: 2, y: 3, width: 20, height: 10 },
  backgroundRect: { x: 0, y: 0, width: 30, height: 20 },
});
function harness() {
  const request = { sourceIdentity: {}, backgroundIdentity: {} },
    order: string[] = [];
  let source: unknown = sourceOf(request.sourceIdentity);
  const lease = (kind: "frame" | "background") => ({
    width: kind === "frame" ? 4 : 3,
    height: 2,
    release: vi.fn(),
    paint: vi.fn((_request: unknown): unknown => {
      order.push(kind);
      return { ok: true };
    }),
  });
  const frames: ReturnType<typeof lease>[] = [],
    jobs: { sink: RoomBackgroundSink; cancel: ReturnType<typeof vi.fn> }[] = [];
  const ports = {
    readSource: vi.fn(() => source),
    captureFrame: vi.fn((_id: object): unknown => {
      const frame = lease("frame");
      frames.push(frame);
      return frame;
    }),
    startBackground: vi.fn((_id: object, sink: RoomBackgroundSink): unknown => {
      const job = { sink, cancel: vi.fn() };
      jobs.push(job);
      return job;
    }),
  };
  const made = createRoomPaintPreparationController(ports);
  if (!made.ok) throw new Error("setup");
  return {
    request,
    order,
    lease,
    frames,
    jobs,
    ports,
    controller: made.controller,
    setSource: (v: unknown) => {
      source = v;
    },
  };
}
async function ready(h: ReturnType<typeof harness>) {
  const pending = h.controller.prepare(h.request),
    background = h.lease("background");
  h.jobs.at(-1)?.sink.complete(background);
  expect(await pending).toEqual({ ok: true });
  const view = h.controller.readPaintPrepared(h.request);
  if (!view) throw new Error("setup");
  const frame = h.frames.at(-1);
  if (!frame) throw new Error("setup");
  return { view, background, frame };
}

describe("spec127 cohort-bound pair paint", () => {
  it("rejects normalized height overflow before painting background", async () => {
    const h = harness(),
      frame = h.lease("frame");
    frame.width = 1;
    frame.height = 3;
    h.ports.captureFrame.mockReturnValue(frame);
    const pending = h.controller.prepare(h.request),
      background = h.lease("background");
    h.jobs[0].sink.complete(background);
    expect(await pending).toEqual({ ok: true });
    const view = h.controller.readPaintPrepared(h.request);
    if (!view) throw new Error("setup");
    expect(
      view.paint({
        ...input(),
        frameRect: {
          x: 0,
          y: 0,
          width: (Number.MAX_VALUE / 3) * (1 + Number.EPSILON),
          height: Number.MAX_VALUE,
        },
      }),
    ).toEqual(fail("INVALID_INPUT"));
    expect(background.paint).not.toHaveBeenCalled();
    expect(frame.paint).not.toHaveBeenCalled();
    h.controller.dispose();
  });
  it.each(["clear", "dispose", "source"] as const)(
    "frame-side %s never returns success",
    async (action) => {
      const h = harness(),
        { view, frame } = await ready(h);
      frame.paint.mockImplementation(() => {
        if (action === "source") h.setSource(sourceOf({}));
        else h.controller[action]();
        return { ok: true };
      });
      expect(view.paint(input())).toEqual(
        fail(
          action === "source" ? "SOURCE_CHANGED" : action === "dispose" ? "DISPOSED" : "RELEASED",
        ),
      );
      expect(frame.release).toHaveBeenCalledTimes(1);
      h.controller.dispose();
    },
  );
  it.each(["frame", "background"] as const)(
    "%s throwing paint getter releases once",
    async (kind) => {
      const h = harness(),
        resource = h.lease(kind);
      Object.defineProperty(resource, "paint", {
        get() {
          throw new Error("private");
        },
      });
      if (kind === "frame") h.ports.captureFrame.mockReturnValue(resource);
      const pending = h.controller.prepare(h.request);
      if (kind === "background") h.jobs[0].sink.complete(resource);
      expect(await pending).toEqual({
        ok: false,
        code:
          kind === "frame"
            ? "ROOM_PREPARATION_CAPTURE_FAILED"
            : "ROOM_PREPARATION_BACKGROUND_FAILED",
      });
      expect(resource.release).toHaveBeenCalledTimes(1);
      h.controller.dispose();
    },
  );
  it("keeps size-only ports and getter isolation", async () => {
    const getter = vi.fn(() => {
      throw new Error("hidden");
    });
    const frame = Object.defineProperty({ width: 4, height: 2, release: vi.fn() }, "paint", {
      get: getter,
    });
    const background = Object.defineProperty({ width: 3, height: 2, release: vi.fn() }, "paint", {
      get: getter,
    });
    const identity = {};
    const made = createRoomPreparationController({
      readSource: () => sourceOf(identity),
      captureFrame: () => frame,
      startBackground: (_id: object, sink: RoomBackgroundSink) => {
        sink.complete(background);
        return { cancel() {} };
      },
    });
    if (!made.ok) throw new Error("setup");
    expect("readPaintPrepared" in made.controller).toBe(false);
    expect(
      await made.controller.prepare({ sourceIdentity: identity, backgroundIdentity: {} }),
    ).toEqual({ ok: true });
    expect(getter).not.toHaveBeenCalled();
    made.controller.dispose();
  });
  it("constructs without port calls; no pending or wrong-identity view", async () => {
    const h = harness();
    expect(h.ports.readSource).not.toHaveBeenCalled();
    expect(h.controller.readPaintPrepared(h.request)).toBeNull();
    const pending = h.controller.prepare(h.request);
    expect(h.controller.readPaintPrepared(h.request)).toBeNull();
    h.jobs[0].sink.complete(h.lease("background"));
    expect(await pending).toEqual({ ok: true });
    expect(h.controller.readPaintPrepared({ ...h.request, backgroundIdentity: {} })).toBeNull();
    h.controller.dispose();
  });
  it("returns frozen size copies, no raw leases, one background then frame", async () => {
    const h = harness(),
      { view, frame, background } = await ready(h),
      request = input();
    expect(Object.keys(view).sort()).toEqual(["backgroundSize", "frameSize", "paint"]);
    expect([view, view.frameSize, view.backgroundSize].every(Object.isFrozen)).toBe(true);
    expect(view).toBe(h.controller.readPaintPrepared(h.request));
    expect(view.paint(request)).toEqual({ ok: true });
    expect(h.order).toEqual(["background", "frame"]);
    expect(background.paint).toHaveBeenCalledWith({
      target: request.target,
      rect: request.backgroundRect,
    });
    expect(frame.paint).toHaveBeenCalledWith({ target: request.target, rect: request.frameRect });
    h.controller.clear();
    h.controller.dispose();
    expect(frame.release).toHaveBeenCalledTimes(1);
    expect(background.release).toHaveBeenCalledTimes(1);
  });
  it.each(["frame", "background"] as const)(
    "captures %s paint once with receiver",
    async (kind) => {
      const h = harness(),
        resource = h.lease(kind),
        getter = vi.fn(
          () =>
            function (this: unknown) {
              expect(this).toBe(resource);
              return { ok: true };
            },
        );
      Object.defineProperty(resource, "paint", { get: getter });
      if (kind === "frame") h.ports.captureFrame.mockReturnValue(resource);
      const pending = h.controller.prepare(h.request);
      h.jobs[0].sink.complete(kind === "background" ? resource : h.lease("background"));
      expect(await pending).toEqual({ ok: true });
      const view = h.controller.readPaintPrepared(h.request);
      if (!view) throw new Error("setup");
      expect(view.paint(input())).toEqual({ ok: true });
      expect(view.paint(input())).toEqual({ ok: true });
      expect(getter).toHaveBeenCalledTimes(1);
      h.controller.dispose();
    },
  );
  it.each([
    null,
    [],
    {},
    { target: null },
    { ...input(), frameRect: null },
    { ...input(), frameRect: { x: 0, y: 0, width: 4, height: 4 } },
    { ...input(), backgroundRect: { x: 0, y: 0, width: 3, height: 3 } },
    { ...input(), frameRect: { x: NaN, y: 0, width: 4, height: 2 } },
    { ...input(), backgroundRect: { x: 0, y: Infinity, width: 3, height: 2 } },
    { ...input(), frameRect: { x: 0, y: 0, width: 0, height: 0 } },
    { ...input(), backgroundRect: { x: 0, y: 0, width: -3, height: -2 } },
  ])("validates both rectangles before either copy %#", async (request) => {
    const h = harness(),
      { view } = await ready(h);
    expect(view.paint(request)).toEqual(fail("INVALID_INPUT"));
    expect(h.order).toEqual([]);
    expect(h.controller.getState()).toBe("ready");
    expect(view.paint(input())).toEqual({ ok: true });
    h.controller.dispose();
  });
  it.each(["clear", "dispose"] as const)(
    "%s closes view before hostile getters",
    async (action) => {
      const h = harness(),
        { view, frame, background } = await ready(h),
        getter = vi.fn(() => {
          throw new Error();
        });
      h.controller[action]();
      expect(
        view.paint({
          get target() {
            return getter();
          },
        }),
      ).toEqual(fail(action === "dispose" ? "DISPOSED" : "RELEASED"));
      expect(getter).not.toHaveBeenCalled();
      expect(h.order).toEqual([]);
      expect(frame.release).toHaveBeenCalledTimes(1);
      expect(background.release).toHaveBeenCalledTimes(1);
    },
  );
  it("same-identity replacement cannot revive or use old view", async () => {
    const h = harness(),
      old = await ready(h),
      fresh = await ready(h);
    expect(old.view.paint(input())).toEqual(fail("RELEASED"));
    expect(h.order).toEqual([]);
    expect(old.frame.release).toHaveBeenCalledTimes(1);
    expect(old.background.release).toHaveBeenCalledTimes(1);
    expect(fresh.frame.release).not.toHaveBeenCalled();
    expect(fresh.view.paint(input())).toEqual({ ok: true });
    h.controller.dispose();
  });
  it("source change retires pair without copying", async () => {
    const h = harness(),
      { view, frame, background } = await ready(h);
    h.setSource(sourceOf({}));
    expect(view.paint(input())).toEqual(fail("SOURCE_CHANGED"));
    expect(h.order).toEqual([]);
    expect(h.controller.getState()).toBe("empty");
    expect(frame.release).toHaveBeenCalledTimes(1);
    expect(background.release).toHaveBeenCalledTimes(1);
  });
  it.each(["target", "frameRect", "backgroundRect"])(
    "ends after request getter %s",
    async (key) => {
      const h = harness(),
        { view } = await ready(h),
        request = input(),
        getter = vi.fn();
      Object.defineProperty(request, key, {
        get() {
          h.controller.clear();
          return {};
        },
      });
      if (key === "target") Object.defineProperty(request, "frameRect", { get: getter });
      expect(view.paint(request)).toEqual(fail("RELEASED"));
      expect(h.order).toEqual([]);
      expect(getter).not.toHaveBeenCalled();
    },
  );
  it.each(["x", "y", "width", "height"])("ends after rectangle getter %s", async (key) => {
    const h = harness(),
      { view } = await ready(h),
      request = input();
    Object.defineProperty(request.frameRect, key, {
      get() {
        h.controller.dispose();
        return 4;
      },
    });
    expect(view.paint(request)).toEqual(fail("DISPOSED"));
    expect(h.order).toEqual([]);
  });
  it("stops source property reads immediately after disposal", async () => {
    const h = harness(),
      { view } = await ready(h),
      later = vi.fn();
    h.setSource({
      get identity() {
        h.controller.dispose();
        return h.request.sourceIdentity;
      },
      get kind() {
        return later();
      },
    });
    expect(view.paint(input())).toEqual(fail("DISPOSED"));
    expect(later).not.toHaveBeenCalled();
  });
  it("snapshots request fields once and preserves invalid getter failure", async () => {
    const h = harness(),
      { view } = await ready(h),
      request = input(),
      counts: string[] = [];
    const wrap = (v: object) =>
      Object.fromEntries(Object.entries(v).map(([key, value]) => [key, value]));
    const raw = wrap(request);
    for (const key of Object.keys(raw)) {
      const value = raw[key];
      Object.defineProperty(raw, key, {
        get() {
          counts.push(key);
          return value;
        },
      });
    }
    expect(view.paint(raw)).toEqual({ ok: true });
    expect(counts).toEqual(["target", "frameRect", "backgroundRect"]);
    expect(
      view.paint({
        get target() {
          throw new Error("private");
        },
      }),
    ).toEqual(fail("INVALID_INPUT"));
    expect(h.controller.getState()).toBe("ready");
    h.controller.dispose();
  });
  it.each(["false", "throw", "thenable"] as const)(
    "background paint %s retires both before frame",
    async (variant) => {
      const h = harness();
      const pending = h.controller.prepare(h.request),
        background = h.lease("background");
      background.paint.mockImplementation(() => {
        if (variant === "throw") throw new Error("private");
        return variant === "thenable"
          ? Promise.resolve({ ok: true })
          : { ok: false, code: "private" };
      });
      h.jobs[0].sink.complete(background);
      expect(await pending).toEqual({ ok: true });
      const view = h.controller.readPaintPrepared(h.request);
      if (!view) throw new Error("setup");
      expect(view.paint(input())).toEqual(fail("FAILED"));
      expect(h.frames[0].paint).not.toHaveBeenCalled();
      expect(background.release).toHaveBeenCalledTimes(1);
      expect(h.frames[0].release).toHaveBeenCalledTimes(1);
      expect(view.paint(input())).toEqual(fail("RELEASED"));
    },
  );
  it("frame failure after background requires caller to discard partial target", async () => {
    const h = harness(),
      { view, frame, background } = await ready(h);
    frame.paint.mockImplementation(() => {
      throw new Error("private");
    });
    expect(view.paint(input())).toEqual(fail("FAILED"));
    expect(background.paint).toHaveBeenCalledTimes(1);
    expect(frame.release).toHaveBeenCalledTimes(1);
    expect(background.release).toHaveBeenCalledTimes(1);
  });
  it.each(["clear", "dispose", "source", "replace"] as const)(
    "reentrant background %s prevents frame",
    async (action) => {
      const h = harness(),
        pending = h.controller.prepare(h.request),
        background = h.lease("background");
      let replacement: Promise<unknown> | undefined;
      background.paint.mockImplementation(() => {
        if (action === "source") h.setSource(sourceOf({}));
        else if (action === "replace") replacement = h.controller.prepare(h.request);
        else h.controller[action]();
        return { ok: true };
      });
      h.jobs[0].sink.complete(background);
      await pending;
      const view = h.controller.readPaintPrepared(h.request);
      if (!view) throw new Error("setup");
      expect(view.paint(input())).toEqual(
        fail(
          action === "source" ? "SOURCE_CHANGED" : action === "dispose" ? "DISPOSED" : "RELEASED",
        ),
      );
      expect(h.frames[0].paint).not.toHaveBeenCalled();
      if (replacement) {
        h.jobs[1].sink.complete(h.lease("background"));
        expect(await replacement).toEqual({ ok: true });
      }
      h.controller.dispose();
    },
  );
  it("nested pair paint is BUSY without extra copying", async () => {
    const h = harness(),
      { view, background } = await ready(h);
    background.paint.mockImplementation(() => {
      expect(view.paint(input())).toEqual(fail("BUSY"));
      return { ok: true };
    });
    expect(view.paint(input())).toEqual({ ok: true });
    expect(background.paint).toHaveBeenCalledTimes(1);
    h.controller.dispose();
  });
  it("result getter disposal stops second paint", async () => {
    const h = harness(),
      { view, background, frame } = await ready(h);
    background.paint.mockReturnValue({
      get ok() {
        h.controller.dispose();
        return true;
      },
    });
    expect(view.paint(input())).toEqual(fail("DISPOSED"));
    expect(frame.paint).not.toHaveBeenCalled();
  });
  it("cleanup disposal wins over paint failure; attempts each close once", async () => {
    const h = harness(),
      { view, background, frame } = await ready(h);
    background.paint.mockImplementation(() => {
      throw new Error("private");
    });
    frame.release.mockImplementation(() => {
      h.controller.dispose();
      throw new Error("cleanup");
    });
    expect(view.paint(input())).toEqual(fail("DISPOSED"));
    h.controller.dispose();
    expect(frame.release).toHaveBeenCalledTimes(1);
    expect(background.release).toHaveBeenCalledTimes(1);
  });
  it.each(["frame", "background"] as const)(
    "%s missing paint is rejected and released",
    async (kind) => {
      const h = harness(),
        resource = { width: 3, height: 2, release: vi.fn() };
      if (kind === "frame") h.ports.captureFrame.mockReturnValue(resource);
      const pending = h.controller.prepare(h.request);
      if (kind === "background") h.jobs[0].sink.complete(resource);
      expect(await pending).toEqual({
        ok: false,
        code:
          kind === "frame"
            ? "ROOM_PREPARATION_CAPTURE_FAILED"
            : "ROOM_PREPARATION_BACKGROUND_FAILED",
      });
      expect(resource.release).toHaveBeenCalledTimes(1);
      expect(h.controller.getState()).toBe("empty");
    },
  );
  it.each(["frame", "background"] as const)(
    "%s paint getter cancellation fails closed",
    async (kind) => {
      const h = harness(),
        resource = h.lease(kind),
        later = vi.fn();
      Object.defineProperty(resource, "paint", {
        get() {
          h.controller.clear();
          return later;
        },
      });
      if (kind === "frame") h.ports.captureFrame.mockReturnValue(resource);
      const pending = h.controller.prepare(h.request);
      if (kind === "background") h.jobs[0].sink.complete(resource);
      expect(await pending).toEqual({ ok: false, code: "ROOM_PREPARATION_CANCELLED" });
      expect(later).not.toHaveBeenCalled();
      expect(resource.release).toHaveBeenCalledTimes(1);
    },
  );
  it("late and duplicate resources cannot revive a cohort", async () => {
    const h = harness(),
      { view, background } = await ready(h),
      extra = h.lease("background");
    h.jobs[0].sink.complete(background);
    expect(background.release).not.toHaveBeenCalled();
    h.controller.clear();
    h.jobs[0].sink.complete(extra);
    h.jobs[0].sink.complete(extra);
    expect(extra.release).toHaveBeenCalledTimes(1);
    expect(view.paint(input())).toEqual(fail("RELEASED"));
  });
});
