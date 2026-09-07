import { describe, expect, it, vi } from "vitest";
import { createRoomPreparationController, type RoomBackgroundSink } from "./preparation";

const lease = (width = 100, height = 200) => ({ width, height, release: vi.fn() });
const fail = (suffix: string) => ({ ok: false, code: `ROOM_PREPARATION_${suffix}` });
function harness() {
  const request = { sourceIdentity: {}, backgroundIdentity: {} };
  let source: unknown = {
    identity: request.sourceIdentity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
  };
  const frames: ReturnType<typeof lease>[] = [];
  const jobs: { sink: RoomBackgroundSink; cancel: ReturnType<typeof vi.fn> }[] = [];
  const ports = {
    readSource: vi.fn(() => source),
    captureFrame: vi.fn((_identity: object): unknown => {
      const r = lease();
      frames.push(r);
      return r;
    }),
    startBackground: vi.fn((_identity: object, sink: RoomBackgroundSink): unknown => {
      const job = { sink, cancel: vi.fn() };
      jobs.push(job);
      return job;
    }),
  };
  const created = createRoomPreparationController(ports);
  if (!created.ok) throw new Error("setup");
  return {
    request,
    ports,
    frames,
    jobs,
    controller: created.controller,
    setSource: (s: unknown) => {
      source = s;
    },
  };
}
const readySource = (identity: object) => ({
  identity,
  kind: "frame",
  projectionOk: true,
  planReady: true,
  clockPreview: null,
});

describe("room preparation gates and public boundary", () => {
  it("constructs with no port calls and captures methods once with their this", async () => {
    const request = { sourceIdentity: {}, backgroundIdentity: {} };
    const reads = [0, 0, 0];
    const ports = {
      get readSource() {
        reads[0]++;
        return function (this: unknown) {
          expect(this).toBe(ports);
          return readySource(request.sourceIdentity);
        };
      },
      get captureFrame() {
        reads[1]++;
        return function (this: unknown) {
          expect(this).toBe(ports);
          return lease();
        };
      },
      get startBackground() {
        reads[2]++;
        return function (this: unknown, _id: object, sink: RoomBackgroundSink) {
          expect(this).toBe(ports);
          sink.complete(lease());
          return { cancel() {} };
        };
      },
    };
    const created = createRoomPreparationController(ports);
    expect(reads).toEqual([1, 1, 1]);
    if (!created.ok) throw new Error("setup");
    expect(await created.controller.prepare(request)).toEqual({ ok: true });
    expect(reads).toEqual([1, 1, 1]);
    created.controller.dispose();
    const h = harness();
    expect(h.ports.readSource).not.toHaveBeenCalled();
    expect(h.ports.captureFrame).not.toHaveBeenCalled();
    expect(h.ports.startBackground).not.toHaveBeenCalled();
  });
  it.each([
    null,
    [],
    {},
    { readSource: 1 },
    {
      get readSource() {
        throw new Error("PRIVATE");
      },
    },
  ])("rejects invalid ports safely", (ports) => {
    expect(createRoomPreparationController(ports)).toEqual(fail("INVALID_INPUT"));
  });
  it.each([
    null,
    [],
    {},
    { sourceIdentity: null, backgroundIdentity: {} },
    { sourceIdentity: {}, backgroundIdentity: [] },
    {
      get sourceIdentity() {
        throw new Error("PRIVATE");
      },
    },
  ])("rejects invalid requests with no acquisitions", async (request) => {
    const h = harness();
    expect(await h.controller.prepare(request)).toEqual(fail("INVALID_INPUT"));
    expect(h.controller.getState()).toBe("empty");
    expect(h.ports.captureFrame).not.toHaveBeenCalled();
    expect(h.ports.startBackground).not.toHaveBeenCalled();
  });
  it.each([
    null,
    [],
    {},
    { kind: "case" },
    { projectionOk: false },
    { planReady: false },
    { clockPreview: {} },
    { clockPreview: undefined },
    { identity: {} },
    {
      get kind() {
        throw new Error("PRIVATE");
      },
    },
  ])("blocks unsupported or unproven sources before acquisition", async (patch) => {
    const h = harness();
    if (patch === null || Array.isArray(patch)) h.setSource(patch);
    else {
      const source = readySource(h.request.sourceIdentity);
      Object.defineProperties(source, Object.getOwnPropertyDescriptors(patch));
      if (Object.keys(patch).length === 0) h.setSource({});
      else h.setSource(source);
    }
    expect(await h.controller.prepare(h.request)).toEqual(fail("SOURCE_BLOCKED"));
    expect(h.ports.captureFrame).not.toHaveBeenCalled();
    expect(h.ports.startBackground).not.toHaveBeenCalled();
  });
  it("contains revoked request/source proxies and readSource exceptions", async () => {
    const h = harness();
    const p = Proxy.revocable({}, {});
    p.revoke();
    expect(await h.controller.prepare(p.proxy)).toEqual(fail("INVALID_INPUT"));
    h.setSource(p.proxy);
    expect(await h.controller.prepare(h.request)).toEqual(fail("SOURCE_BLOCKED"));
    h.ports.readSource.mockImplementation(() => {
      throw new Error("PRIVATE");
    });
    expect(await h.controller.prepare(h.request)).toEqual(fail("SOURCE_BLOCKED"));
  });
  it("publishes only copied sizes after async completion, never tokens or leases", async () => {
    const h = harness();
    const promise = h.controller.prepare(h.request);
    expect(h.controller.getState()).toBe("pending");
    expect(h.controller.readPrepared(h.request)).toBeNull();
    const bg = lease(400, 500);
    h.jobs[0].sink.complete(bg);
    expect(await promise).toEqual({ ok: true });
    const info = h.controller.readPrepared(h.request);
    expect(info).toEqual({
      frameSize: { width: 100, height: 200 },
      backgroundSize: { width: 400, height: 500 },
    });
    bg.width = 999;
    expect(h.controller.readPrepared(h.request)).toEqual(info);
    expect(h.controller.readPrepared(h.request)).not.toBe(info);
    expect(h.jobs[0].cancel).not.toHaveBeenCalled();
    h.controller.clear();
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
    expect(bg.release).toHaveBeenCalledTimes(1);
    expect(await promise).toEqual({ ok: true });
    expect(h.controller.readPrepared(h.request)).toBeNull();
  });
  it("withholds sync completion until a valid task has returned", async () => {
    const h = harness();
    const bg = lease();
    const cancel = vi.fn();
    h.ports.startBackground.mockImplementation((_id, sink) => {
      sink.complete(bg);
      expect(h.controller.getState()).toBe("pending");
      expect(h.controller.readPrepared(h.request)).toBeNull();
      return { cancel };
    });
    expect(await h.controller.prepare(h.request)).toEqual({ ok: true });
    h.controller.dispose();
    expect(cancel).not.toHaveBeenCalled();
    expect(bg.release).toHaveBeenCalledTimes(1);
  });
  it("invalid new prepare clears a prior ready cohort", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    const bg = lease();
    h.jobs[0].sink.complete(bg);
    await p;
    expect(await h.controller.prepare(null)).toEqual(fail("INVALID_INPUT"));
    expect(bg.release).toHaveBeenCalledTimes(1);
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
    expect(h.controller.getState()).toBe("empty");
  });
});

describe("room preparation partial failures and cancellation", () => {
  it.each([
    null,
    {},
    [],
    { release: 1 },
    {
      width: 1,
      height: 1,
      get release() {
        throw new Error("PRIVATE");
      },
    },
  ])("refuses malformed frame leases", async (r) => {
    const h = harness();
    h.ports.captureFrame.mockReturnValue(r);
    expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(h.ports.startBackground).not.toHaveBeenCalled();
  });
  it.each([0, -1, Infinity, NaN, 1_000_001, "100"])(
    "cleans a frame with invalid dimension %s",
    async (width) => {
      const h = harness();
      const r = { ...lease(), width };
      h.ports.captureFrame.mockReturnValue(r);
      expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
      expect(r.release).toHaveBeenCalledTimes(1);
      expect(h.ports.startBackground).not.toHaveBeenCalled();
    },
  );
  it("cleans captured leases after a throwing dimension getter and refuses thenables", async () => {
    const h = harness();
    const release = vi.fn();
    h.ports.captureFrame.mockReturnValue({
      release,
      get width() {
        throw new Error("PRIVATE");
      },
    });
    expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(release).toHaveBeenCalledTimes(1);
    const r = {
      ...lease(),
      // biome-ignore lint/suspicious/noThenProperty: intentional invalid thenable lease fixture
      then() {},
    };
    h.ports.captureFrame.mockReturnValue(r);
    expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(r.release).toHaveBeenCalledTimes(1);
  });
  it("capture throw starts no background", async () => {
    const h = harness();
    h.ports.captureFrame.mockImplementation(() => {
      throw new Error("PRIVATE");
    });
    expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(h.ports.startBackground).not.toHaveBeenCalled();
  });
  it.each(["throw", "null", "bad-cancel", "throw-cancel-getter"])(
    "cleans sync delivered background when start returns %s",
    async (kind) => {
      const h = harness();
      const bg = lease();
      let sink!: RoomBackgroundSink;
      h.ports.startBackground.mockImplementation((_id, s) => {
        sink = s;
        s.complete(bg);
        if (kind === "throw") throw new Error("PRIVATE");
        if (kind === "null") return null;
        if (kind === "throw-cancel-getter")
          return {
            get cancel() {
              throw new Error("PRIVATE");
            },
          };
        return { cancel: 1 };
      });
      expect(await h.controller.prepare(h.request)).toEqual(fail("BACKGROUND_FAILED"));
      expect(bg.release).toHaveBeenCalledTimes(1);
      expect(h.frames[0].release).toHaveBeenCalledTimes(1);
      const late = lease();
      sink.complete(late);
      sink.fail();
      expect(late.release).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["fail", "invalid"])("cleans frame and cancels after background %s", async (kind) => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    const bad = lease(0);
    if (kind === "fail") h.jobs[0].sink.fail();
    else h.jobs[0].sink.complete(bad);
    expect(await p).toEqual(fail("BACKGROUND_FAILED"));
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
    expect(h.jobs[0].cancel).toHaveBeenCalledTimes(1);
    if (kind === "invalid") expect(bad.release).toHaveBeenCalledTimes(1);
  });
  it.each(["clear", "dispose", "replace"] as const)(
    "settles a never-completing job on %s and rejects late completion",
    async (action) => {
      const h = harness();
      const p = h.controller.prepare(h.request);
      let next: Promise<unknown> | undefined;
      if (action === "replace") next = h.controller.prepare(h.request);
      else h.controller[action]();
      expect(await p).toEqual(
        fail(action === "clear" ? "CANCELLED" : action === "dispose" ? "DISPOSED" : "SUPERSEDED"),
      );
      expect(h.jobs[0].cancel).toHaveBeenCalledTimes(1);
      expect(h.frames[0].release).toHaveBeenCalledTimes(1);
      const late = lease();
      h.jobs[0].sink.complete(late);
      h.jobs[0].sink.complete(late);
      h.jobs[0].sink.fail();
      expect(late.release).toHaveBeenCalledTimes(1);
      if (next) {
        h.controller.clear();
        await next;
      }
      h.controller.dispose();
      h.controller.clear();
      h.controller.dispose();
      expect(await h.controller.prepare(h.request)).toEqual(fail("DISPOSED"));
      expect(h.controller.getState()).toBe("disposed");
    },
  );
  it.each(["clear", "dispose"] as const)(
    "records %s while start has not returned and cancels the eventual task once",
    async (action) => {
      const h = harness();
      const cancel = vi.fn();
      const bg = lease();
      h.ports.startBackground.mockImplementation((_id, s) => {
        h.controller[action]();
        s.complete(bg);
        return { cancel };
      });
      expect(await h.controller.prepare(h.request)).toEqual(
        fail(action === "clear" ? "CANCELLED" : "DISPOSED"),
      );
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(bg.release).toHaveBeenCalledTimes(1);
    },
  );
  it("continues cleanup after cancel/release throws, even with a reentrant late callback", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    const late = lease();
    h.frames[0].release.mockImplementation(() => {
      throw new Error("PRIVATE");
    });
    h.jobs[0].cancel.mockImplementation(() => {
      h.jobs[0].sink.complete(late);
      throw new Error("PRIVATE");
    });
    expect(() => h.controller.clear()).not.toThrow();
    expect(await p).toEqual(fail("CANCELLED"));
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
  });
});

describe("room preparation duplicates, source identity and reentrancy", () => {
  it("late A cannot replace or release B, and duplicate B deliveries do not release the live lease", async () => {
    const h = harness();
    const a = h.controller.prepare(h.request);
    const b = h.controller.prepare(h.request);
    const bg = lease();
    h.jobs[1].sink.complete(bg);
    expect(await b).toEqual({ ok: true });
    expect(await a).toEqual(fail("SUPERSEDED"));
    h.jobs[0].sink.complete(bg);
    h.jobs[1].sink.complete(bg);
    h.jobs[1].sink.fail();
    const extra = lease();
    h.jobs[0].sink.complete(extra);
    h.jobs[1].sink.complete(extra);
    expect(bg.release).not.toHaveBeenCalled();
    expect(extra.release).toHaveBeenCalledTimes(1);
    expect(h.controller.getState()).toBe("ready");
    h.controller.dispose();
    expect(bg.release).toHaveBeenCalledTimes(1);
  });
  it("rejects frame/background sharing and a previously released lease", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    h.jobs[0].sink.complete(h.frames[0]);
    expect(await p).toEqual(fail("BACKGROUND_FAILED"));
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
    h.ports.captureFrame.mockReturnValue(h.frames[0]);
    expect(await h.controller.prepare(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(h.frames[0].release).toHaveBeenCalledTimes(1);
  });
  it.each(["post-capture", "pre-start", "post-start", "completion"])(
    "invalidates a changed source at %s",
    async (when) => {
      const h = harness();
      let calls = 0;
      const threshold =
        { "post-capture": 2, "pre-start": 3, "post-start": 4, completion: 5 }[when] ?? 2;
      h.ports.readSource.mockImplementation(() =>
        readySource(++calls >= threshold ? {} : h.request.sourceIdentity),
      );
      const p = h.controller.prepare(h.request);
      if (when === "completion") h.jobs[0].sink.complete(lease());
      expect(await p).toEqual(fail("SUPERSEDED"));
      expect(h.frames[0].release).toHaveBeenCalledTimes(1);
      expect(h.controller.getState()).toBe("empty");
    },
  );
  it("invalid queries preserve ready, but matching tokens with a changed source clean it", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    const bg = lease();
    h.jobs[0].sink.complete(bg);
    await p;
    expect(h.controller.readPrepared(null)).toBeNull();
    expect(h.controller.readPrepared({ ...h.request, backgroundIdentity: {} })).toBeNull();
    expect(h.controller.readPrepared({ ...h.request, sourceIdentity: {} })).toBeNull();
    expect(bg.release).not.toHaveBeenCalled();
    h.setSource(readySource({}));
    expect(h.controller.readPrepared(h.request)).toBeNull();
    expect(bg.release).toHaveBeenCalledTimes(1);
    expect(h.controller.getState()).toBe("empty");
  });
  it("reserves admission before repeated same-lease getter reentry", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    const release = vi.fn();
    let reads = 0;
    const bg = {
      width: 100,
      height: 100,
      get release() {
        reads++;
        h.jobs[0].sink.complete(bg);
        h.jobs[0].sink.complete(bg);
        return release;
      },
    };
    h.jobs[0].sink.complete(bg);
    expect(await p).toEqual({ ok: true });
    h.controller.clear();
    expect(reads).toBe(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it.each(["capture", "start", "cancel", "release"])(
    "new prepare during %s cannot be overwritten by the outer call",
    async (where) => {
      const h = harness();
      let next: Promise<unknown> | undefined;
      const bg = lease();
      const launch = () => {
        next = h.controller.prepare(h.request);
      };
      if (where === "capture")
        h.ports.captureFrame.mockImplementationOnce(() => {
          launch();
          return bg;
        });
      if (where === "start")
        h.ports.startBackground.mockImplementationOnce(() => {
          launch();
          return { cancel: vi.fn() };
        });
      const old = h.controller.prepare(h.request);
      if (where === "cancel") {
        h.jobs[0].cancel.mockImplementationOnce(launch);
        h.controller.clear();
      }
      if (where === "release") {
        h.jobs[0].sink.complete(bg);
        await old;
        h.frames[0].release.mockImplementationOnce(launch);
        h.controller.clear();
      }
      const latest = h.jobs[h.jobs.length - 1];
      latest.sink.complete(lease());
      expect(await next).toEqual({ ok: true });
      expect(h.controller.getState()).toBe("ready");
      expect(await old).toEqual(
        where === "release" ? { ok: true } : fail(where === "cancel" ? "CANCELLED" : "SUPERSEDED"),
      );
      h.controller.dispose();
    },
  );
  it("readSource reentry fails closed without recursively invoking the source port", async () => {
    const h = harness();
    let nested: Promise<unknown> | undefined;
    h.ports.readSource.mockImplementation(() => {
      nested = h.controller.prepare(h.request);
      return readySource(h.request.sourceIdentity);
    });
    expect(await h.controller.prepare(h.request)).toEqual(fail("SUPERSEDED"));
    expect(await nested).toEqual(fail("SOURCE_BLOCKED"));
    expect(h.ports.readSource).toHaveBeenCalledTimes(1);
    expect(h.ports.captureFrame).not.toHaveBeenCalled();
  });
  it("a source getter clear wins over the eventual gate error", async () => {
    const h = harness();
    h.setSource({
      get identity() {
        h.controller.clear();
        throw new Error("PRIVATE");
      },
    });
    expect(await h.controller.prepare(h.request)).toEqual(fail("CANCELLED"));
    expect(h.ports.captureFrame).not.toHaveBeenCalled();
  });
  it("request getter replacement and readPrepared reentry never expose or clobber stale information", async () => {
    const h = harness();
    let next: Promise<unknown> | undefined;
    const old = h.controller.prepare({
      get sourceIdentity() {
        next = h.controller.prepare(h.request);
        return h.request.sourceIdentity;
      },
      backgroundIdentity: {},
    });
    expect(await old).toEqual(fail("SUPERSEDED"));
    h.jobs[0].sink.complete(lease());
    await next;
    h.ports.readSource.mockImplementationOnce(() => {
      h.controller.clear();
      return readySource(h.request.sourceIdentity);
    });
    expect(h.controller.readPrepared(h.request)).toBeNull();
    expect(h.controller.getState()).toBe("empty");
  });
  it("clears during frame or background dimension getters and still releases the received resource", async () => {
    for (const phase of ["frame", "background"]) {
      const h = harness();
      const r = {
        release: vi.fn(),
        get width() {
          h.controller.clear();
          return 100;
        },
        height: 100,
      };
      if (phase === "frame") h.ports.captureFrame.mockReturnValue(r);
      const p = h.controller.prepare(h.request);
      if (phase === "background") h.jobs[0].sink.complete(r);
      expect(await p).toEqual(fail("CANCELLED"));
      expect(r.release).toHaveBeenCalledTimes(1);
    }
  });
  it("leaves disposal terminal when cleanup attempts to prepare again", async () => {
    const h = harness();
    const p = h.controller.prepare(h.request);
    let nested: Promise<unknown> | undefined;
    h.frames[0].release.mockImplementation(() => {
      nested = h.controller.prepare(h.request);
    });
    h.controller.dispose();
    expect(await p).toEqual(fail("DISPOSED"));
    expect(await nested).toEqual(fail("DISPOSED"));
    expect(h.controller.getState()).toBe("disposed");
  });
});
