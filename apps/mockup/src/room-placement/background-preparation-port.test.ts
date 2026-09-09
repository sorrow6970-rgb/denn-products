import { describe, expect, it, vi } from "vitest";
import { createRoomBackgroundPreparationPort as create } from "./background-preparation-port";
import { createRoomPreparationController, type RoomBackgroundSink } from "./preparation";
function deferred() {
  let resolve!: (value: unknown) => void, reject!: () => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
function owner(start: (identity: object) => unknown) {
  const r = create(start);
  if (!r.ok) throw new Error("setup");
  return r.port;
}
const resource = () => ({ width: 640, height: 480, release: vi.fn() });
function harness() {
  const request = { sourceIdentity: {}, backgroundIdentity: {} };
  const source = {
    identity: request.sourceIdentity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
  };
  const jobs: ReturnType<typeof deferred>[] = [],
    frames: ReturnType<typeof resource>[] = [],
    order: string[] = [];
  const start = vi.fn(() => {
    order.push("start");
    const d = deferred();
    jobs.push(d);
    return d.promise;
  });
  const port = owner(start);
  const c = createRoomPreparationController({
    readSource: () => source,
    captureFrame: () => {
      order.push("capture");
      const r = resource();
      frames.push(r);
      return r;
    },
    startBackground: port.startBackground,
  });
  if (!c.ok) throw new Error("setup");
  return { controller: c.controller, port, start, jobs, frames, order, source, request };
}
describe("spec114 preparation bridge", () => {
  it("has no default I/O and rejects invalid producers", () => {
    expect(create(null)).toEqual({ ok: false, code: "ROOM_BACKGROUND_WORK_INVALID_INPUT" });
    const start = vi.fn();
    const p = owner(start);
    expect(p.getState()).toBe("idle");
    expect(start).not.toHaveBeenCalled();
  });
  it("validates sink before calling the producer", () => {
    const start = vi.fn(),
      p = owner(start);
    expect(() => p.startBackground({}, null as unknown as RoomBackgroundSink)).toThrow(
      "ROOM_BACKGROUND_WORK_INVALID_INPUT",
    );
    expect(start).not.toHaveBeenCalled();
  });
  it("captures sink methods with their receiver and transfers only a size lease", async () => {
    const d = deferred(),
      p = owner(() => d.promise),
      r = resource();
    let lease: { release(): void } | undefined;
    const reads: string[] = [];
    const sink = {
      get complete() {
        reads.push("complete");
        return function (this: unknown, value: unknown) {
          expect(this).toBe(sink);
          expect(Object.keys(value as object).sort()).toEqual(["height", "release", "width"]);
          lease = value as { release(): void };
        };
      },
      get fail() {
        reads.push("fail");
        return vi.fn();
      },
    };
    p.startBackground({}, sink);
    d.resolve(r);
    await flush();
    expect(reads).toEqual(["complete", "fail"]);
    expect(p.getState()).toBe("held");
    lease?.release();
    expect(r.release).toHaveBeenCalledTimes(1);
  });
  it("captures a frame before starting and releases both on clear", async () => {
    const h = harness(),
      r = resource(),
      result = h.controller.prepare(h.request);
    expect(h.order).toEqual(["capture", "start"]);
    h.jobs[0]?.resolve(r);
    expect(await result).toEqual({ ok: true });
    expect(h.controller.readPrepared(h.request)).toEqual({
      frameSize: { width: 640, height: 480 },
      backgroundSize: { width: 640, height: 480 },
    });
    h.controller.clear();
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(h.frames[0]?.release).toHaveBeenCalledTimes(1);
    expect(h.port.getState()).toBe("idle");
  });
  it("clear retains pending capacity until a late success is released", async () => {
    const h = harness(),
      r = resource(),
      result = h.controller.prepare(h.request);
    h.controller.clear();
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_CANCELLED" });
    expect(h.port.getState()).toBe("pending");
    h.jobs[0]?.resolve(r);
    await flush();
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(h.port.getState()).toBe("idle");
    expect(h.controller.readPrepared(h.request)).toBeNull();
  });
  it("pending replacement does not start another producer and cleans both frames", async () => {
    const h = harness(),
      first = h.controller.prepare(h.request),
      second = h.controller.prepare(h.request);
    expect(await first).toEqual({ ok: false, code: "ROOM_PREPARATION_SUPERSEDED" });
    expect(await second).toEqual({ ok: false, code: "ROOM_PREPARATION_BACKGROUND_FAILED" });
    expect(h.start).toHaveBeenCalledTimes(1);
    expect(h.frames).toHaveLength(2);
    for (const f of h.frames) expect(f.release).toHaveBeenCalledTimes(1);
    h.jobs[0]?.reject();
    await flush();
    expect(h.port.getState()).toBe("idle");
  });
  it("ready replacement releases prior resources before another producer starts", async () => {
    const h = harness(),
      r = resource(),
      first = h.controller.prepare(h.request);
    h.jobs[0]?.resolve(r);
    await first;
    const second = h.controller.prepare(h.request);
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(h.start).toHaveBeenCalledTimes(2);
    h.jobs[1]?.resolve(resource());
    expect(await second).toEqual({ ok: true });
    h.controller.dispose();
  });
  it("source invalidation rejects and cleans a delivered resource", async () => {
    const h = harness(),
      r = resource(),
      result = h.controller.prepare(h.request);
    h.source.identity = {};
    h.jobs[0]?.resolve(r);
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_SUPERSEDED" });
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(h.port.getState()).toBe("idle");
  });
  it("controller and owner disposal preserve late cleanup", async () => {
    const h = harness(),
      r = resource(),
      result = h.controller.prepare(h.request);
    h.controller.dispose();
    h.port.dispose();
    expect(await result).toEqual({ ok: false, code: "ROOM_PREPARATION_DISPOSED" });
    h.jobs[0]?.resolve(r);
    await flush();
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(h.port.getState()).toBe("disposed");
  });
  it("suppresses callbacks after cancellation and disposal", async () => {
    for (const dispose of [false, true]) {
      const d = deferred(),
        p = owner(() => d.promise),
        r = resource(),
        sink = { complete: vi.fn(), fail: vi.fn() };
      const handle = p.startBackground({}, sink);
      if (dispose) p.dispose();
      else handle.cancel();
      d.resolve(r);
      await flush();
      expect(sink.complete).not.toHaveBeenCalled();
      expect(sink.fail).not.toHaveBeenCalled();
      expect(r.release).toHaveBeenCalledTimes(1);
    }
  });
  it("handles synchronous producer disposal without later callbacks", async () => {
    const r = resource(),
      sink = { complete: vi.fn(), fail: vi.fn() };
    const p = owner(() => {
      p.dispose();
      return Promise.resolve(r);
    });
    p.startBackground({}, sink);
    await flush();
    expect(sink.fail).not.toHaveBeenCalled();
    expect(sink.complete).not.toHaveBeenCalled();
    expect(r.release).toHaveBeenCalledTimes(1);
  });
  it("contains throwing complete callbacks and releases transferred ownership", async () => {
    const r = resource(),
      p = owner(() => Promise.resolve(r)),
      fail = vi.fn();
    p.startBackground(
      {},
      {
        complete() {
          throw new Error("private");
        },
        fail,
      },
    );
    await flush();
    expect(r.release).toHaveBeenCalledTimes(1);
    expect(fail).not.toHaveBeenCalled();
  });
  it("contains throwing fail callbacks and keeps broken producers blocked", async () => {
    const p = owner(() => {
        throw new Error("private");
      }),
      fail = vi.fn(() => {
        throw new Error("private");
      });
    p.startBackground({}, { complete: vi.fn(), fail });
    await flush();
    expect(fail).toHaveBeenCalledTimes(1);
    expect(p.getState()).toBe("blocked");
  });
});
