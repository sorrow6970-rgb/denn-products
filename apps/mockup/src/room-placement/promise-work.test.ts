import { describe, expect, it, vi } from "vitest";
import {
  createRoomBackgroundPromiseWork as create,
  createRoomBackgroundPromiseLeaseWork,
} from "./promise-work";
function deferred() {
  let resolve!: (value: unknown) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const failed = (name: string) => ({ ok: false, code: `ROOM_BACKGROUND_WORK_${name}` });
function start(o: ReturnType<typeof create>, fn: () => unknown) {
  const result = o.start(fn);
  if (!result.ok) throw new Error("setup");
  return result.task;
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
describe("spec113 native Promise settlement bridge", () => {
  it("creates without I/O and rejects invalid input before reserving", () => {
    const o = create();
    expect(Object.isFrozen(o)).toBe(true);
    for (const value of [null, {}, 1, "x", undefined])
      expect(o.start(value)).toEqual(failed("INVALID_INPUT"));
    expect(o.getState()).toBe("idle");
  });
  it("reserves before start, holds a success until explicit release", async () => {
    const o = create(),
      d = deferred(),
      release = vi.fn();
    const t = start(o, () => {
      expect(o.start(vi.fn())).toEqual(failed("BUSY"));
      return d.promise;
    });
    expect(Object.isFrozen(t)).toBe(true);
    d.resolve({ release });
    expect(await t.result).toEqual({ ok: true });
    expect(release).not.toHaveBeenCalled();
    expect(o.getState()).toBe("held");
    t.release();
    t.cancel();
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.getState()).toBe("idle");
    expect(await t.result).toEqual({ ok: true });
  });
  it("does not call another start while pending", () => {
    const o = create(),
      fn = vi.fn();
    start(o, () => deferred().promise);
    expect(o.start(fn)).toEqual(failed("BUSY"));
    expect(fn).not.toHaveBeenCalled();
  });
  it("rejection settles capacity without leaking the raw reason", async () => {
    const o = create(),
      d = deferred(),
      t = start(o, () => d.promise);
    d.reject(new Error("private@example.invalid"));
    expect(await t.result).toEqual(failed("FAILED"));
    expect(o.getState()).toBe("idle");
  });
  for (const method of ["cancel", "release"] as const) {
    it(`${method} retains pending capacity and closes late success once`, async () => {
      const o = create(),
        d = deferred(),
        release = vi.fn(),
        t = start(o, () => d.promise);
      t[method]();
      t[method]();
      expect(await t.result).toEqual(failed("CANCELLED"));
      expect(o.getState()).toBe("pending");
      expect(o.start(vi.fn())).toEqual(failed("BUSY"));
      d.resolve({ release });
      await flush();
      expect(release).toHaveBeenCalledTimes(1);
      expect(o.getState()).toBe("idle");
    });
  }
  it("cancel followed by rejection does not change its logical result", async () => {
    const o = create(),
      d = deferred(),
      t = start(o, () => d.promise);
    t.cancel();
    d.reject("secret");
    await flush();
    expect(await t.result).toEqual(failed("CANCELLED"));
    expect(o.getState()).toBe("idle");
  });
  it("dispose retains late cleanup but permanently prevents new work", async () => {
    const o = create(),
      d = deferred(),
      release = vi.fn(),
      t = start(o, () => d.promise);
    o.dispose();
    o.dispose();
    expect(await t.result).toEqual(failed("DISPOSED"));
    d.resolve({ release });
    await flush();
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.start(vi.fn())).toEqual(failed("DISPOSED"));
  });
  it("disposes already held resources", async () => {
    const o = create(),
      release = vi.fn(),
      t = start(o, () => Promise.resolve({ release }));
    await t.result;
    o.dispose();
    t.release();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("blocks after synchronous throw, which is not proof that no work started", async () => {
    const o = create(),
      t = start(o, () => {
        throw new Error("private");
      });
    expect(await t.result).toEqual(failed("OUTCOME_UNKNOWN"));
    expect(o.start(vi.fn())).toEqual(failed("BLOCKED"));
  });
  it("does not invoke an arbitrary thenable getter", async () => {
    const o = create(),
      then = vi.fn(() => {
        throw new Error();
      });
    // biome-ignore lint/suspicious/noThenProperty: hostile thenable fixture must not be assimilated.
    const t = start(o, () => Object.defineProperty({}, "then", { get: then }));
    expect(await t.result).toEqual(failed("OUTCOME_UNKNOWN"));
    expect(then).not.toHaveBeenCalled();
    expect(o.getState()).toBe("blocked");
  });
  for (const value of [null, undefined, {}, 3]) {
    it(`invalid fulfillment ${String(value)} never reports success`, async () => {
      const o = create(),
        t = start(o, () => Promise.resolve(value));
      expect(await t.result).toEqual(failed("FAILED"));
      expect(o.getState()).toBe(value === null ? "idle" : "blocked");
    });
  }
  it("captures release with its receiver and fails closed on cleanup throw", async () => {
    const o = create();
    const resource = {
      release() {
        expect(this).toBe(resource);
        throw new Error("private");
      },
    };
    const t = start(o, () => Promise.resolve(resource));
    await t.result;
    t.release();
    expect(o.getState()).toBe("blocked");
  });
  it("dispose reentry during start still observes and releases its late result", async () => {
    const o = create(),
      release = vi.fn();
    const t = start(o, () => {
      o.dispose();
      return Promise.resolve({ release });
    });
    expect(await t.result).toEqual(failed("DISPOSED"));
    await flush();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("cancel reentry during release getter cannot publish success", async () => {
    const o = create(),
      d = deferred(),
      release = vi.fn(),
      t = start(o, () => d.promise);
    d.resolve(
      Object.defineProperty({}, "release", {
        get() {
          t.cancel();
          return release;
        },
      }),
    );
    expect(await t.result).toEqual(failed("CANCELLED"));
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.getState()).toBe("idle");
  });
  it("old task release cannot close a later held resource", async () => {
    const o = create(),
      a = start(o, () => Promise.resolve({ release() {} }));
    await a.result;
    a.release();
    const release = vi.fn(),
      b = start(o, () => Promise.resolve({ release }));
    await b.result;
    a.cancel();
    expect(release).not.toHaveBeenCalled();
    b.release();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("release callback cannot reenter start before physical cleanup returns", async () => {
    const o = create(),
      t = start(o, () =>
        Promise.resolve({
          release() {
            expect(o.start(vi.fn())).toEqual(failed("BUSY"));
          },
        }),
      );
    await t.result;
    t.release();
    expect(o.getState()).toBe("idle");
  });
});

describe("spec114 opt-in dimension lease", () => {
  function setup() {
    const o = createRoomBackgroundPromiseLeaseWork(),
      d = deferred();
    const r = o.start(() => d.promise);
    if (!r.ok) throw new Error("setup");
    return { o, d, t: r.task };
  }
  it("keeps the original task shape and does not read dimensions", async () => {
    const o = create(),
      width = vi.fn(() => {
        throw new Error();
      });
    const t = start(o, () =>
      Promise.resolve(Object.defineProperty({ release() {} }, "width", { get: width })),
    );
    expect(Object.keys(t).sort()).toEqual(["cancel", "release", "result"]);
    expect(await t.result).toEqual({ ok: true });
    expect(width).not.toHaveBeenCalled();
    t.release();
  });
  it("captures release before dimensions, takes a frozen lease exactly once", async () => {
    const { o, d, t } = setup(),
      order: string[] = [],
      release = vi.fn();
    expect(t.takeLease()).toBeNull();
    d.resolve({
      get release() {
        order.push("release");
        return release;
      },
      get width() {
        order.push("width");
        return 300;
      },
      get height() {
        order.push("height");
        return 200;
      },
    });
    expect(await t.result).toEqual({ ok: true });
    const lease = t.takeLease();
    expect(order).toEqual(["release", "width", "height"]);
    expect(lease).toEqual({ width: 300, height: 200, release: expect.any(Function) });
    expect(Object.isFrozen(lease)).toBe(true);
    expect(t.takeLease()).toBeNull();
    lease?.release();
    lease?.release();
    t.release();
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.getState()).toBe("idle");
  });
  for (const key of ["width", "height"] as const)
    for (const value of [0, -1, 1.5, NaN, Infinity, 1_000_001, "3", undefined]) {
      it(`rejects ${key}=${String(value)} and releases acquired ownership`, async () => {
        const { o, d, t } = setup(),
          release = vi.fn();
        d.resolve({ width: 2, height: 3, release, [key]: value });
        expect(await t.result).toEqual(failed("FAILED"));
        expect(t.takeLease()).toBeNull();
        expect(release).toHaveBeenCalledTimes(1);
        expect(o.getState()).toBe("idle");
      });
    }
  it("contains getter failure and preserves cleanup uncertainty", async () => {
    const { o, d, t } = setup(),
      release = vi.fn(() => {
        throw new Error("private");
      });
    d.resolve({
      release,
      get width() {
        throw new Error("private");
      },
    });
    expect(await t.result).toEqual(failed("FAILED"));
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.getState()).toBe("blocked");
  });
  for (const action of ["cancel", "dispose"] as const) {
    it(`${action} in width getter prevents subsequent field reads and transfer`, async () => {
      const { o, d, t } = setup(),
        release = vi.fn(),
        height = vi.fn(() => 3);
      const resource = {
        release,
        get width() {
          if (action === "cancel") t.cancel();
          else o.dispose();
          return 2;
        },
      };
      Object.defineProperty(resource, "height", { get: height });
      d.resolve(resource);
      expect(await t.result).toEqual(failed(action === "cancel" ? "CANCELLED" : "DISPOSED"));
      expect(height).not.toHaveBeenCalled();
      expect(t.takeLease()).toBeNull();
      expect(release).toHaveBeenCalledTimes(1);
    });
  }
  it("invalidates an untaken successful lease on disposal", async () => {
    const { o, d, t } = setup(),
      release = vi.fn();
    d.resolve({ width: 1, height: 1_000_000, release });
    await t.result;
    o.dispose();
    expect(t.takeLease()).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
