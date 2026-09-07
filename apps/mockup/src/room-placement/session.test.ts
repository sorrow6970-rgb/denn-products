import { describe, expect, it, vi } from "vitest";
import { createRoomPlacementSession } from "./session";

const lease = () => ({ release: vi.fn() });
const begin = (owner: ReturnType<typeof createRoomPlacementSession>) => {
  const ticket = owner.begin();
  if (!ticket) throw new Error("test setup");
  return ticket;
};

describe("room cohort ownership without a loader", () => {
  it("starts empty, accepts one lease, and clears exactly once", () => {
    const owner = createRoomPlacementSession();
    expect(owner.getState()).toBe("empty");
    const ticket = begin(owner);
    expect(owner.getState()).toBe("pending");
    const resource = lease();
    expect(ticket.complete(resource)).toBe(true);
    expect(owner.getState()).toBe("ready");
    expect(resource.release).not.toHaveBeenCalled();
    owner.clear();
    owner.clear();
    owner.dispose();
    expect(resource.release).toHaveBeenCalledTimes(1);
    expect(owner.getState()).toBe("disposed");
  });
  it("releases the previous cohort at begin, not after replacement succeeds", () => {
    const owner = createRoomPlacementSession();
    const first = lease();
    begin(owner).complete(first);
    const next = begin(owner);
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(owner.getState()).toBe("pending");
    expect(next.fail()).toBe(true);
    expect(next.fail()).toBe(false);
    expect(owner.getState()).toBe("empty");
  });
  it("rejects late completion and failure without replacing current ready state", () => {
    const owner = createRoomPlacementSession();
    const old = begin(owner);
    const current = begin(owner);
    const active = lease();
    const late = lease();
    expect(current.complete(active)).toBe(true);
    expect(old.complete(late)).toBe(false);
    expect(old.fail()).toBe(false);
    expect(current.fail()).toBe(false);
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(active.release).not.toHaveBeenCalled();
    expect(owner.getState()).toBe("ready");
  });
  it("does not prematurely release a duplicate live lease even from a stale ticket", () => {
    const owner = createRoomPlacementSession();
    const old = begin(owner);
    const current = begin(owner);
    const resource = lease();
    current.complete(resource);
    expect(current.complete(resource)).toBe(false);
    expect(old.complete(resource)).toBe(false);
    expect(resource.release).not.toHaveBeenCalled();
    owner.dispose();
    expect(old.complete(resource)).toBe(false);
    expect(resource.release).toHaveBeenCalledTimes(1);
  });
  it("releases a distinct second delivery once and does not readopt released leases", () => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const a = lease();
    const b = lease();
    ticket.complete(a);
    expect(ticket.complete(b)).toBe(false);
    expect(ticket.complete(b)).toBe(false);
    expect(b.release).toHaveBeenCalledTimes(1);
    const next = begin(owner);
    expect(next.complete(a)).toBe(false);
    expect(a.release).toHaveBeenCalledTimes(1);
    expect(next.complete(lease())).toBe(true);
  });
  it.each(["clear", "dispose"] as const)("%s invalidates pending completion", (action) => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const resource = lease();
    owner[action]();
    expect(ticket.complete(resource)).toBe(false);
    expect(resource.release).toHaveBeenCalledTimes(1);
    expect(owner.getState()).toBe(action === "clear" ? "empty" : "disposed");
  });
  it("disposal is terminal even when clear/begin are requested again", () => {
    const owner = createRoomPlacementSession();
    owner.dispose();
    owner.clear();
    owner.dispose();
    expect(owner.begin()).toBeNull();
    expect(owner.getState()).toBe("disposed");
  });
  it("a definite failure releases a later delivery and allows an explicit new begin", () => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const late = lease();
    ticket.fail();
    expect(ticket.complete(late)).toBe(false);
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(begin(owner).complete(lease())).toBe(true);
  });
  it("updates ownership before cleanup can re-enter and begin a newer generation", () => {
    const owner = createRoomPlacementSession();
    const newest = lease();
    begin(owner).complete({
      release() {
        begin(owner).complete(newest);
      },
    });
    const displaced = begin(owner);
    const late = lease();
    expect(displaced.complete(late)).toBe(false);
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(newest.release).not.toHaveBeenCalled();
    expect(owner.getState()).toBe("ready");
  });
  it("makes disposal terminal before a cleanup callback can re-enter", () => {
    const owner = createRoomPlacementSession();
    const checks: unknown[] = [];
    const resource = {
      release: vi.fn(() => {
        checks.push(owner.begin());
        owner.clear();
      }),
    };
    begin(owner).complete(resource);
    owner.dispose();
    expect(checks).toEqual([null]);
    expect(owner.getState()).toBe("disposed");
    expect(resource.release).toHaveBeenCalledTimes(1);
  });
  it("suppresses raw cleanup errors without retrying or claiming physical release succeeded", () => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const resource = {
      release: vi.fn(() => {
        throw new Error("SECRET");
      }),
    };
    ticket.complete(resource);
    expect(() => owner.clear()).not.toThrow();
    expect(ticket.complete(resource)).toBe(false);
    owner.dispose();
    expect(resource.release).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, [], { release: 1 }])("rejects malformed leases %j safely", (bad) => {
    const owner = createRoomPlacementSession();
    expect(begin(owner).complete(bad)).toBe(false);
    expect(owner.getState()).toBe("empty");
  });
  it("contains a throwing accessor and does not damage a newer generation", () => {
    const owner = createRoomPlacementSession();
    const old = begin(owner);
    const active = lease();
    begin(owner).complete(active);
    expect(
      old.complete({
        get release() {
          throw new Error("SECRET");
        },
      }),
    ).toBe(false);
    expect(owner.getState()).toBe("ready");
    expect(active.release).not.toHaveBeenCalled();
  });
  it("reserves identity before a release accessor re-enters complete with the same lease", () => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const cleanup = vi.fn();
    let reads = 0;
    const resource = {
      get release() {
        reads++;
        expect(ticket.complete(resource)).toBe(false);
        return cleanup;
      },
    };
    expect(ticket.complete(resource)).toBe(true);
    owner.clear();
    expect(reads).toBe(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  it("rechecks the ticket after an accessor starts a new generation", () => {
    const owner = createRoomPlacementSession();
    const ticket = begin(owner);
    const cleanup = vi.fn();
    const resource = {
      get release() {
        begin(owner);
        return cleanup;
      },
    };
    expect(ticket.complete(resource)).toBe(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(owner.getState()).toBe("pending");
  });
});
