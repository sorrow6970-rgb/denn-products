import { describe, expect, it, vi } from "vitest";
import { createRoomCommittedSourceOwner, type RoomSourceTicket } from "./committed-source";
import {
  createRoomPaintPreparationController,
  type RoomBackgroundSink,
  type RoomPaintPreparationController,
} from "./preparation";
import { createFrameSnapshotCapturer } from "./frame-snapshot";
const packet = () => ({
  kind: "frame",
  projectionOk: true,
  planReady: true,
  clockPreview: null,
  plan: { kind: "frame", logicalCanvas: { width: 4, height: 2 }, commands: [] },
  imageBindings: { get: vi.fn((_ref: string): unknown => undefined) },
  isCurrent: vi.fn((): unknown => true),
});
function setup(onInvalidate = vi.fn()) {
  const made = createRoomCommittedSourceOwner({ onInvalidate });
  if (!made.ok) throw new Error("setup");
  return { owner: made.owner, notify: onInvalidate };
}
function begin(owner: ReturnType<typeof setup>["owner"]) {
  const ticket = owner.begin();
  if (!ticket) throw new Error("setup");
  return ticket;
}
function ready(s = setup(), p = packet()) {
  const ticket = begin(s.owner);
  expect(ticket.commit(p)).toBe(true);
  const source = s.owner.readSource();
  if (!source) throw new Error("setup");
  return { ...s, ticket, source, p };
}
describe("spec129 committed source protocol", () => {
  it("source invalidation cancels pending preparation and releases a late lease", async () => {
    let controller: RoomPaintPreparationController | undefined,
      sink: RoomBackgroundSink | undefined;
    const s = setup(vi.fn(() => controller?.clear())),
      r = ready(s),
      cancel = vi.fn();
    const frame = { width: 4, height: 2, release: vi.fn(), paint: vi.fn() };
    const made = createRoomPaintPreparationController({
      readSource: s.owner.readSource,
      captureFrame: () => frame,
      startBackground: (_id: object, received: RoomBackgroundSink) => {
        sink = received;
        return { cancel };
      },
    });
    if (!made.ok) throw new Error("setup");
    controller = made.controller;
    const pending = controller.prepare({
      sourceIdentity: r.source.identity,
      backgroundIdentity: {},
    });
    s.owner.invalidate();
    expect(await pending).toEqual({ ok: false, code: "ROOM_PREPARATION_CANCELLED" });
    const late = { width: 3, height: 2, release: vi.fn(), paint: vi.fn() };
    const received = sink as RoomBackgroundSink | undefined;
    received?.complete(late);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(frame.release).toHaveBeenCalledTimes(1);
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(late.paint).not.toHaveBeenCalled();
    controller.dispose();
    s.owner.dispose();
  });
  it.each([
    null,
    [],
    {},
    { onInvalidate: null },
    {
      get onInvalidate() {
        throw new Error("private");
      },
    },
  ])("rejects invalid factory %#", (input) => {
    expect(createRoomCommittedSourceOwner(input)).toEqual({
      ok: false,
      code: "ROOM_SOURCE_INVALID_INPUT",
    });
  });
  it("captures invalidator once with receiver; factory and empty end do no callbacks", () => {
    const called = vi.fn(),
      getter = vi.fn(
        () =>
          function (this: unknown) {
            expect(this).toBe(env);
            called();
          },
      );
    const env = {
        get onInvalidate() {
          return getter();
        },
      },
      made = createRoomCommittedSourceOwner(env);
    if (!made.ok) throw new Error("setup");
    expect(getter).toHaveBeenCalledTimes(1);
    expect(called).not.toHaveBeenCalled();
    expect(Object.isFrozen(made.owner)).toBe(true);
    made.owner.invalidate();
    const t = begin(made.owner);
    expect(Object.isFrozen(t)).toBe(true);
    t.invalidate();
    expect(called).toHaveBeenCalledTimes(1);
    made.owner.dispose();
    made.owner.dispose();
    expect(called).toHaveBeenCalledTimes(1);
    expect(made.owner.begin()).toBeNull();
  });
  it("publishes exact frozen internal shape and borrows rather than releases data", () => {
    const p = packet(),
      release = vi.fn();
    Object.assign(p.plan, { release });
    const r = ready(setup(), p);
    expect(Object.keys(r.source).sort()).toEqual([
      "clockPreview",
      "identity",
      "imageBindings",
      "kind",
      "plan",
      "planReady",
      "projectionOk",
    ]);
    expect(r.source.plan).toBe(p.plan);
    expect([r.source, r.source.identity, r.source.imageBindings].every(Object.isFrozen)).toBe(true);
    expect(r.owner.readSource()).toBe(r.source);
    r.owner.invalidate();
    r.owner.dispose();
    expect(release).not.toHaveBeenCalled();
  });
  it("same packet after a new begin has a different opaque identity", () => {
    const r = ready(),
      newer = begin(r.owner);
    expect(r.owner.getState()).toBe("pending");
    expect(r.owner.readSource()).toBeNull();
    expect(newer.commit(r.p)).toBe(true);
    expect(r.owner.readSource()?.identity).not.toBe(r.source.identity);
    expect(r.notify).toHaveBeenCalledTimes(1);
    r.ticket.invalidate();
    expect(r.owner.getState()).toBe("ready");
  });
  it.each(["duplicate", "superseded", "invalidated", "disposed"] as const)(
    "rejects %s commits without input getters",
    (mode) => {
      const s = setup(),
        ticket = begin(s.owner);
      if (mode === "duplicate") ticket.commit(packet());
      if (mode === "superseded") begin(s.owner);
      if (mode === "invalidated") ticket.invalidate();
      if (mode === "disposed") s.owner.dispose();
      const getter = vi.fn();
      expect(
        ticket.commit({
          get kind() {
            return getter();
          },
        }),
      ).toBe(false);
      expect(getter).not.toHaveBeenCalled();
      s.owner.dispose();
    },
  );
  it.each([
    null,
    [],
    {},
    { ...packet(), kind: "case" },
    { ...packet(), projectionOk: false },
    { ...packet(), planReady: false },
    { ...packet(), clockPreview: undefined },
    { ...packet(), clockPreview: {} },
    { ...packet(), plan: null },
    { ...packet(), plan: { kind: "case", logicalCanvas: { width: 4, height: 2 } } },
    { ...packet(), plan: { kind: "frame", logicalCanvas: { width: 0, height: 2 } } },
    { ...packet(), plan: { kind: "frame", logicalCanvas: { width: 4, height: Infinity } } },
    { ...packet(), plan: { kind: "frame", logicalCanvas: { width: 1_000_001, height: 2 } } },
    { ...packet(), imageBindings: {} },
    { ...packet(), isCurrent: null },
  ])("fails closed on malformed packet %#", (input) => {
    const s = setup(),
      ticket = begin(s.owner);
    expect(ticket.commit(input)).toBe(false);
    expect(s.owner.readSource()).toBeNull();
    expect(s.owner.getState()).toBe("empty");
    expect(s.notify).toHaveBeenCalledTimes(1);
    expect(ticket.commit(packet())).toBe(false);
  });
  it.each([
    "kind",
    "projectionOk",
    "planReady",
    "clockPreview",
    "plan",
    "imageBindings",
    "isCurrent",
  ])("stops after reentrant field %s", (key) => {
    const s = setup(),
      p = packet(),
      values = p as Record<string, unknown>,
      t = begin(s.owner);
    const value = values[key];
    Object.defineProperty(p, key, {
      get() {
        s.owner.dispose();
        return value;
      },
    });
    expect(t.commit(p)).toBe(false);
    expect(s.owner.getState()).toBe("disposed");
    expect(p.isCurrent).not.toHaveBeenCalled();
  });
  it("captures packet and method fields once, preserving both receivers", () => {
    const s = setup(),
      p = packet(),
      counts: string[] = [];
    p.imageBindings.get = vi.fn(function (this: unknown) {
      expect(this).toBe(p.imageBindings);
      return "drawable";
    });
    p.isCurrent = vi.fn(function (this: unknown) {
      expect(this).toBe(p);
      return true;
    });
    for (const key of Object.keys(p)) {
      const value = (p as Record<string, unknown>)[key];
      Object.defineProperty(p, key, {
        get() {
          counts.push(key);
          return value;
        },
      });
    }
    const t = begin(s.owner);
    expect(t.commit(p)).toBe(true);
    const source = s.owner.readSource();
    if (!source) throw new Error("setup");
    counts.length = 0;
    expect(source.imageBindings.get("one")).toBe("drawable");
    expect(counts).toEqual(["imageBindings"]); // test's receiver assertion alone accesses this getter
    s.owner.dispose();
  });
  it.each([false, null, 1, Promise.resolve(true)])(
    "requires a literal synchronous current proof %#",
    (answer) => {
      const s = setup(),
        p = packet();
      p.isCurrent.mockReturnValue(answer);
      expect(begin(s.owner).commit(p)).toBe(false);
      expect(s.owner.getState()).toBe("empty");
    },
  );
  it("proof false on read detaches source before notifying", () => {
    const s = setup(),
      r = ready(s);
    s.notify.mockImplementation(() => {
      expect(s.owner.readSource()).toBeNull();
    });
    r.p.isCurrent.mockReturnValue(false);
    expect(s.owner.readSource()).toBeNull();
    expect(s.notify).toHaveBeenCalledTimes(1);
    expect(r.source.imageBindings.get("one")).toBeUndefined();
  });
  it("proof exception is contained and invalidates source", () => {
    const r = ready();
    r.p.isCurrent.mockImplementation(() => {
      throw new Error("private");
    });
    expect(r.owner.readSource()).toBeNull();
    expect(r.owner.getState()).toBe("empty");
  });
  it("proof reentrancy is denied without recursion or destroying outer source", () => {
    const r = ready();
    r.p.isCurrent.mockImplementation(() => {
      expect(r.owner.readSource()).toBeNull();
      expect(r.source.imageBindings.get("one")).toBeUndefined();
      return true;
    });
    expect(r.owner.readSource()).toBe(r.source);
    expect(r.notify).not.toHaveBeenCalled();
  });
  it("proof may supersede old ticket without an old failure dropping the new one", () => {
    const r = ready();
    let next: RoomSourceTicket | null = null;
    r.p.isCurrent.mockImplementation(() => {
      next = r.owner.begin();
      expect(next?.commit(packet())).toBe(false);
      return true;
    });
    expect(r.owner.readSource()).toBeNull();
    expect(r.owner.getState()).toBe("pending");
    const ticket = next as RoomSourceTicket | null;
    expect(ticket?.commit(packet())).toBe(true);
    expect(r.owner.getState()).toBe("ready");
  });
  it.each(["invalidate", "dispose"] as const)("binding %s discards returned drawable", (action) => {
    const r = ready(),
      drawable = {};
    r.p.imageBindings.get.mockImplementation(() => {
      r.owner[action]();
      return drawable;
    });
    expect(r.source.imageBindings.get("one")).toBeUndefined();
    expect(r.p.imageBindings.get).toHaveBeenCalledTimes(1);
  });
  it("binding false post-proof and exceptions invalidate without raw errors", () => {
    const r = ready();
    let live = true;
    r.p.isCurrent.mockImplementation(() => live);
    r.p.imageBindings.get.mockImplementation(() => {
      live = false;
      return {};
    });
    expect(r.source.imageBindings.get("one")).toBeUndefined();
    expect(r.owner.getState()).toBe("empty");
    const next = ready();
    next.p.imageBindings.get.mockImplementation(() => {
      throw new Error("private");
    });
    expect(next.source.imageBindings.get("one")).toBeUndefined();
    expect(next.owner.getState()).toBe("empty");
  });
  it("rejects nonstring refs and nested binding calls", () => {
    const r = ready();
    expect(r.source.imageBindings.get(1 as unknown as string)).toBeUndefined();
    expect(r.p.imageBindings.get).not.toHaveBeenCalled();
    r.p.imageBindings.get.mockImplementation(() => {
      expect(r.source.imageBindings.get("two")).toBeUndefined();
      return {};
    });
    expect(r.source.imageBindings.get("one")).toEqual({});
    expect(r.p.imageBindings.get).toHaveBeenCalledTimes(1);
  });
  it("notify reentrancy preserves the newer ticket and excludes stale begin result", () => {
    const r = ready();
    let next: RoomSourceTicket | null = null;
    r.notify.mockImplementationOnce(() => {
      next = r.owner.begin();
    });
    const stale = begin(r.owner);
    expect(stale.commit(packet())).toBe(false);
    const ticket = next as RoomSourceTicket | null;
    expect(ticket?.commit(packet())).toBe(true);
    expect(r.owner.getState()).toBe("ready");
  });
  it("notify throw blocks instead of assuming pair cleanup succeeded", () => {
    const r = ready();
    r.notify.mockImplementation(() => {
      throw new Error("private");
    });
    r.owner.invalidate();
    expect(r.owner.getState()).toBe("blocked");
    expect(r.owner.begin()).toBeNull();
    expect(r.owner.readSource()).toBeNull();
    expect(r.source.imageBindings.get("one")).toBeUndefined();
    r.owner.dispose();
    expect(r.owner.getState()).toBe("disposed");
  });
  it("notify dispose wins over a later throw", () => {
    const r = ready();
    r.notify.mockImplementation(() => {
      r.owner.dispose();
      throw new Error("private");
    });
    r.owner.invalidate();
    expect(r.owner.getState()).toBe("disposed");
  });
  it("actual snapshot and pair are retired synchronously on source invalidation", async () => {
    let controller: RoomPaintPreparationController | undefined;
    const s = setup(vi.fn(() => controller?.clear())),
      r = ready(s);
    const surface = { release: vi.fn(), context: { setTransform: vi.fn() }, copyTo: vi.fn() };
    const madeFrame = createFrameSnapshotCapturer({
      readSource: s.owner.readSource,
      createSurface: () => surface,
      execute: () => ({ ok: true }),
    });
    if (!madeFrame.ok) throw new Error("setup");
    let sink: RoomBackgroundSink | undefined;
    const made = createRoomPaintPreparationController({
      readSource: s.owner.readSource,
      captureFrame: (identity: object) => {
        const captured = madeFrame.capturer.capture({
          sourceIdentity: identity,
          scale: 1,
          budget: { maxEdge: 64, maxPixels: 4096 },
        });
        if (!captured.ok) throw new Error("setup");
        return captured.lease;
      },
      startBackground: (_id: object, received: RoomBackgroundSink) => {
        sink = received;
        return { cancel: vi.fn() };
      },
    });
    if (!made.ok) throw new Error("setup");
    controller = made.controller;
    const request = { sourceIdentity: r.source.identity, backgroundIdentity: {} };
    const pending = controller.prepare(request),
      background = { width: 3, height: 2, release: vi.fn(), paint: vi.fn(() => ({ ok: true })) };
    const receiver = sink as RoomBackgroundSink | undefined;
    receiver?.complete(background);
    expect(await pending).toEqual({ ok: true });
    const view = controller.readPaintPrepared(request);
    if (!view) throw new Error("setup");
    s.owner.invalidate();
    expect(surface.release).toHaveBeenCalledTimes(1);
    expect(background.release).toHaveBeenCalledTimes(1);
    expect(view.paint({})).toEqual({ ok: false, code: "ROOM_PREPARED_PAINT_RELEASED" });
    expect(surface.copyTo).not.toHaveBeenCalled();
    expect(background.paint).not.toHaveBeenCalled();
    controller.dispose();
    madeFrame.capturer.dispose();
    s.owner.dispose();
  });
});
