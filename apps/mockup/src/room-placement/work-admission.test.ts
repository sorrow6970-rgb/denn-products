import { describe, expect, it, vi } from "vitest";
import {
  createRoomBackgroundWorkAdmission as create,
  type BackgroundWorkAdmission,
} from "./work-admission";
function begin(owner: BackgroundWorkAdmission) {
  const result = owner.begin();
  if (!result.ok) throw new Error("setup");
  return result.ticket;
}
const failed = (name: string) => ({ ok: false, code: `ROOM_BACKGROUND_WORK_${name}` });
describe("spec112 physical settlement admission", () => {
  it("reserves capacity during late duplicate admission and cleanup", () => {
    const o = create(),
      t = begin(o);
    t.settle(null);
    t.settle(
      Object.defineProperty({}, "release", {
        get() {
          expect(o.begin()).toEqual(failed("BUSY"));
          return () => expect(o.begin()).toEqual(failed("BUSY"));
        },
      }),
    );
    expect(o.getState()).toBe("idle");
  });
  it("contains revoked proxy inspection", () => {
    const o = create(),
      t = begin(o),
      { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(() => t.settle(proxy)).not.toThrow();
    expect(o.begin()).toEqual(failed("BLOCKED"));
  });
  it("keeps future admission blocked after an uncertain release", () => {
    const o = create(),
      t = begin(o);
    t.settle({
      release() {
        throw new Error("private");
      },
    });
    t.release();
    expect(o.getState()).toBe("blocked");
    expect(o.begin()).toEqual(failed("BLOCKED"));
  });
  it("owns at most one pending or retained result", () => {
    const o = create(),
      t = begin(o),
      release = vi.fn();
    expect(o.getState()).toBe("pending");
    expect(o.begin()).toEqual(failed("BUSY"));
    t.settle({ release });
    expect(o.getState()).toBe("held");
    expect(o.begin()).toEqual(failed("BUSY"));
    t.release();
    t.release();
    expect(release).toHaveBeenCalledTimes(1);
    expect(o.getState()).toBe("idle");
    expect(o.begin().ok).toBe(true);
  });
  it.each([true, false])(
    "keeps cancelled work reserved until actual settlement, success=%s",
    (success) => {
      const o = create(),
        t = begin(o),
        release = vi.fn();
      t.release();
      t.release();
      expect(o.getState()).toBe("pending");
      expect(o.begin()).toEqual(failed("BUSY"));
      t.settle(success ? { release } : null);
      expect(o.getState()).toBe("idle");
      expect(release).toHaveBeenCalledTimes(success ? 1 : 0);
    },
  );
  it("returns idle after physical failure without a result", () => {
    const o = create();
    begin(o).settle(null);
    expect(o.getState()).toBe("idle");
  });
  it.each([true, false])(
    "permanently disposes held=%s while still cleaning late resources",
    (held) => {
      const o = create(),
        t = begin(o),
        release = vi.fn();
      if (held) t.settle({ release });
      o.dispose();
      o.dispose();
      expect(o.begin()).toEqual(failed("DISPOSED"));
      if (!held) t.settle({ release });
      expect(release).toHaveBeenCalledTimes(1);
      expect(o.getState()).toBe("disposed");
    },
  );
  it("does not release the currently held duplicate object", () => {
    const o = create(),
      t = begin(o),
      resource = { release: vi.fn() };
    t.settle(resource);
    t.settle(resource);
    expect(resource.release).not.toHaveBeenCalled();
    t.release();
    t.settle(resource);
    expect(resource.release).toHaveBeenCalledTimes(1);
  });
  it("cleans distinct duplicates without touching the new generation", () => {
    const o = create(),
      old = begin(o);
    old.settle(null);
    const fresh = begin(o),
      live = { release: vi.fn() },
      late = { release: vi.fn() };
    fresh.settle(live);
    old.settle(late);
    old.release();
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(live.release).not.toHaveBeenCalled();
    expect(o.getState()).toBe("held");
    fresh.release();
    expect(live.release).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, {}, [], 1, { release: 1 }])("blocks on invalid resource %#", (value) => {
    const o = create();
    begin(o).settle(value);
    expect(o.getState()).toBe("blocked");
    expect(o.begin()).toEqual(failed("BLOCKED"));
  });
  it("blocks if cleanup throws and never retries cleanup", () => {
    const o = create(),
      t = begin(o),
      release = vi.fn(() => {
        throw new Error("private");
      });
    t.settle({ release });
    expect(() => t.release()).not.toThrow();
    t.release();
    o.dispose();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("keeps capacity during reentrant cleanup", () => {
    const o = create(),
      t = begin(o);
    t.settle({
      release() {
        t.release();
        expect(o.begin()).toEqual(failed("BUSY"));
      },
    });
    t.release();
    expect(o.getState()).toBe("idle");
  });
  it.each(["cancel", "dispose", "throw"])("handles %s during the release getter", (mode) => {
    const o = create(),
      t = begin(o),
      release = vi.fn(),
      get = vi.fn(() => {
        expect(o.begin()).toEqual(failed("BUSY"));
        if (mode === "cancel") t.release();
        if (mode === "dispose") o.dispose();
        if (mode === "throw") throw new Error("private");
        return release;
      });
    t.settle(Object.defineProperty({}, "release", { get }));
    expect(get).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(mode === "throw" ? 0 : 1);
    expect(o.getState()).toBe(
      mode === "throw" ? "blocked" : mode === "dispose" ? "disposed" : "idle",
    );
  });
  it("preserves receiver and freezes public handles", () => {
    const o = create(),
      t = begin(o),
      resource = {
        release() {
          expect(this).toBe(resource);
        },
      };
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(t)).toBe(true);
    t.settle(resource);
    t.release();
  });
  it("reserves identity before a duplicate reentrant delivery", () => {
    const o = create(),
      t = begin(o),
      release = vi.fn();
    const resource = Object.defineProperty({}, "release", {
      get() {
        t.settle(resource);
        return release;
      },
    });
    t.settle(resource);
    expect(release).not.toHaveBeenCalled();
    t.release();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
