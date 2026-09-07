import { describe, expect, it, vi } from "vitest";
import { createFrameSnapshotCapturer, type FrameSnapshotLease } from "./frame-snapshot";

const fail = (s: string) => ({ ok: false, code: `ROOM_SNAPSHOT_${s}` });
const boom = () => {
  throw new Error("private source details");
};
function harness() {
  const identity = {};
  const plan = { kind: "frame", logicalCanvas: { width: 100.5, height: 80.25 }, commands: [] };
  const bindings = { get: vi.fn() };
  const source = {
    identity,
    kind: "frame",
    projectionOk: true,
    planReady: true,
    clockPreview: null,
    plan,
    imageBindings: bindings,
  };
  const surface = { release: vi.fn(), context: { setTransform: vi.fn() }, copyTo: vi.fn() };
  const ports = {
    readSource: vi.fn((): unknown => source),
    createSurface: vi.fn((_size: unknown): unknown => surface),
    execute: vi.fn((_args: unknown): unknown => ({ ok: true })),
  };
  const made = createFrameSnapshotCapturer(ports);
  if (!made.ok) throw new Error("setup");
  const request = {
    sourceIdentity: identity,
    scale: 1.25,
    budget: { maxEdge: 1024, maxPixels: 1024 * 1024 },
  };
  const paint = { target: {}, rect: { x: 2, y: 3, width: 201, height: 160.5 } };
  const capture = (): FrameSnapshotLease => {
    const r = made.capturer.capture(request);
    if (!r.ok) throw new Error(r.code);
    return r.lease;
  };
  return { ...made, source, surface, ports, request, paint, capture, plan, bindings };
}

describe("snapshot factory and capture gates", () => {
  it.each([
    null,
    [],
    {},
    { readSource: boom },
    { readSource: boom, createSurface: boom, execute: undefined },
    {
      get readSource() {
        return boom();
      },
    },
  ])("rejects invalid ports without I/O", (ports) => {
    expect(createFrameSnapshotCapturer(ports)).toEqual(fail("INVALID_INPUT"));
  });
  it("reads and binds port functions exactly once, no factory I/O", () => {
    const h = harness();
    const reads = [0, 0, 0];
    const ports = {
      get readSource() {
        reads[0]++;
        return function (this: unknown) {
          expect(this).toBe(ports);
          return h.source;
        };
      },
      get createSurface() {
        reads[1]++;
        return function (this: unknown) {
          expect(this).toBe(ports);
          return h.surface;
        };
      },
      get execute() {
        reads[2]++;
        return function (this: unknown) {
          expect(this).toBe(ports);
          return { ok: true };
        };
      },
    };
    const r = createFrameSnapshotCapturer(ports);
    expect(h.ports.readSource).not.toHaveBeenCalled();
    expect(h.ports.createSurface).not.toHaveBeenCalled();
    expect(reads).toEqual([1, 1, 1]);
    if (!r.ok) throw new Error("factory");
    expect(r.capturer.capture(h.request).ok).toBe(true);
    expect(reads).toEqual([1, 1, 1]);
  });
  it.each([
    null,
    [],
    {},
    { sourceIdentity: [] },
    {
      get sourceIdentity() {
        return boom();
      },
    },
  ])("invalid request is safe and calls no ports", (request) => {
    const h = harness();
    expect(h.capturer.capture(request)).toEqual(fail("INVALID_INPUT"));
    expect(h.ports.readSource).not.toHaveBeenCalled();
    expect(h.ports.createSurface).not.toHaveBeenCalled();
  });
  it.each([0, -1, Infinity, NaN, "1", undefined, Number.MAX_VALUE])(
    "invalid or excessive scale %s never allocates",
    (scale) => {
      const h = harness();
      expect(h.capturer.capture({ ...h.request, scale })).toEqual(fail("INVALID_INPUT"));
      expect(h.ports.createSurface).not.toHaveBeenCalled();
    },
  );
  it.each([
    { maxEdge: 0, maxPixels: 100 },
    { maxEdge: 1.5, maxPixels: 100 },
    { maxEdge: 125, maxPixels: 99999 },
    { maxEdge: 1000, maxPixels: 12725 },
    { maxEdge: Infinity, maxPixels: 2 },
    {},
  ])("invalid budget never allocates", (budget) => {
    const h = harness();
    expect(h.capturer.capture({ ...h.request, budget })).toEqual(fail("INVALID_INPUT"));
    expect(h.ports.createSurface).not.toHaveBeenCalled();
  });
  it.each([
    "identity",
    "kind",
    "projectionOk",
    "planReady",
    "clockPreview",
    "plan",
    "imageBindings",
  ])("source gate rejects %s", (key) => {
    const h = harness();
    h.ports.readSource.mockReturnValue({ ...h.source, [key]: undefined });
    expect(h.capturer.capture(h.request)).toEqual(fail("SOURCE_BLOCKED"));
    expect(h.ports.createSurface).not.toHaveBeenCalled();
  });
  it.each([0, 0.5, NaN, Infinity, 1_000_001])("invalid logical dimension %s", (width) => {
    const h = harness();
    h.plan.logicalCanvas.width = width;
    expect(h.capturer.capture(h.request)).toEqual(fail("SOURCE_BLOCKED"));
    expect(h.ports.createSurface).not.toHaveBeenCalled();
  });
  it("checks pixel product overflow before allocation", () => {
    const h = harness();
    h.plan.logicalCanvas = { width: 1_000_000, height: 1_000_000 };
    expect(
      h.capturer.capture({
        ...h.request,
        scale: 1000,
        budget: { maxEdge: Number.MAX_SAFE_INTEGER, maxPixels: Number.MAX_SAFE_INTEGER },
      }),
    ).toEqual(fail("INVALID_INPUT"));
    expect(h.ports.createSurface).not.toHaveBeenCalled();
  });
  it("preserves final plan identity, logical size, uniform transform and fractional crop", () => {
    const h = harness();
    const lease = h.capture();
    expect(h.ports.createSurface).toHaveBeenCalledExactlyOnceWith({ width: 126, height: 101 });
    expect(h.surface.context.setTransform).toHaveBeenCalledExactlyOnceWith(1.25, 0, 0, 1.25, 0, 0);
    expect(h.ports.execute.mock.calls[0]?.[0]).toEqual({
      context: h.surface.context,
      plan: h.plan,
      imageBindings: h.bindings,
    });
    expect((h.ports.execute.mock.calls[0]?.[0] as { plan: unknown } | undefined)?.plan).toBe(
      h.plan,
    );
    expect(Object.keys(lease).sort()).toEqual(["height", "paint", "release", "width"]);
    expect([lease.width, lease.height]).toEqual([100.5, 80.25]);
    expect(lease.paint(h.paint)).toEqual({ ok: true });
    expect(h.surface.copyTo).toHaveBeenCalledExactlyOnceWith(
      h.paint.target,
      { x: 0, y: 0, width: 125.625, height: 100.3125 },
      h.paint.rect,
    );
    expect(h.bindings.get).not.toHaveBeenCalled();
  });
});

describe("snapshot partial ownership and reentry", () => {
  it.each(["context", "copyTo", "then"])("captures release before throwing %s accessor", (key) => {
    const h = harness();
    Object.defineProperty(h.surface, key, { get: boom });
    expect(h.capturer.capture(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(h.surface.release).toHaveBeenCalledTimes(1);
  });
  it("rejects thenable and invalid context, cleans each once", () => {
    for (const extra of [
      // biome-ignore lint/suspicious/noThenProperty: explicit hostile thenable rejection test.
      { then: () => {} },
      { context: null },
      { copyTo: null },
      { context: {} },
    ]) {
      const h = harness();
      h.ports.createSurface.mockReturnValue({ ...h.surface, ...extra });
      expect(h.capturer.capture(h.request)).toEqual(fail("CAPTURE_FAILED"));
      expect(h.surface.release).toHaveBeenCalledTimes(1);
    }
  });
  it.each(["create", "transform", "execute", "result"])("safe %s failure", (phase) => {
    const h = harness();
    if (phase === "create") h.ports.createSurface.mockImplementation(boom);
    if (phase === "transform") h.surface.context.setTransform.mockImplementation(boom);
    if (phase === "execute") h.ports.execute.mockImplementation(boom);
    if (phase === "result")
      h.ports.execute.mockReturnValue({
        get ok() {
          return boom();
        },
      });
    expect(h.capturer.capture(h.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(h.surface.release).toHaveBeenCalledTimes(phase === "create" ? 0 : 1);
  });
  it("uses existing executor by default and respects its invalid plan failure", () => {
    const h = harness();
    const context = {
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: "#000000",
      strokeStyle: "#000000",
      lineWidth: 1,
    };
    const made = createFrameSnapshotCapturer({
      readSource: () => h.source,
      createSurface: () => ({ ...h.surface, context }),
    });
    if (!made.ok) throw new Error("setup");
    const r = made.capturer.capture(h.request);
    expect(r.ok).toBe(true);
    expect(context.clearRect).toHaveBeenCalledTimes(1);
    if (r.ok) r.lease.release();
    h.source.plan = { ...h.plan, commands: [null] } as unknown as typeof h.plan;
    expect(made.capturer.capture(h.request)).toEqual(fail("CAPTURE_FAILED"));
  });
  it("busy capture does not read or allocate; release idempotent and old wrapper forbidden", () => {
    const h = harness();
    const lease = h.capture();
    const reads = h.ports.readSource.mock.calls.length;
    expect(h.capturer.capture(h.request)).toEqual(fail("BUSY"));
    expect(h.ports.readSource).toHaveBeenCalledTimes(reads);
    lease.release();
    lease.release();
    h.capturer.dispose();
    expect(h.surface.release).toHaveBeenCalledTimes(1);
    expect(lease.paint(h.paint)).toEqual(fail("DISPOSED"));
    expect(h.capturer.capture(h.request)).toEqual(fail("DISPOSED"));
    const another = harness();
    const first = another.capture();
    first.release();
    expect(another.capturer.capture(another.request)).toEqual(fail("CAPTURE_FAILED"));
    expect(another.surface.release).toHaveBeenCalledTimes(1);
  });
  it.each(["request", "source", "create", "transform", "execute", "cleanup"])(
    "nested capture during %s remains busy",
    (phase) => {
      const h = harness();
      const nested = () => expect(h.capturer.capture(h.request)).toEqual(fail("BUSY"));
      if (phase === "request")
        Object.defineProperty(h.request, "scale", {
          get: () => {
            nested();
            return 1.25;
          },
        });
      if (phase === "source")
        h.ports.readSource.mockImplementation(() => {
          nested();
          return h.source;
        });
      if (phase === "create")
        h.ports.createSurface.mockImplementation(() => {
          nested();
          return h.surface;
        });
      if (phase === "transform") h.surface.context.setTransform.mockImplementation(nested);
      if (phase === "execute")
        h.ports.execute.mockImplementation(() => {
          nested();
          return { ok: true };
        });
      if (phase === "cleanup") {
        h.ports.execute.mockReturnValue({ ok: false });
        h.surface.release.mockImplementation(nested);
      }
      expect(h.capturer.capture(h.request).ok).toBe(phase !== "cleanup");
    },
  );
  it.each([
    "request",
    "source",
    "create",
    "releaseGetter",
    "contextGetter",
    "transform",
    "execute",
    "result",
    "cleanup",
  ])("dispose during %s preempts output", (phase) => {
    const h = harness();
    const end = () => h.capturer.dispose();
    if (phase === "request")
      Object.defineProperty(h.request, "scale", {
        get: () => {
          end();
          return 1;
        },
      });
    if (phase === "source")
      h.ports.readSource.mockImplementation(() => {
        end();
        return h.source;
      });
    if (phase === "create")
      h.ports.createSurface.mockImplementation(() => {
        end();
        return h.surface;
      });
    if (phase === "releaseGetter") {
      const release = h.surface.release;
      Object.defineProperty(h.surface, "release", {
        get: () => {
          end();
          return release;
        },
      });
    }
    if (phase === "contextGetter")
      Object.defineProperty(h.surface, "context", {
        get: () => {
          end();
          return {};
        },
      });
    if (phase === "transform") h.surface.context.setTransform.mockImplementation(end);
    if (phase === "execute")
      h.ports.execute.mockImplementation(() => {
        end();
        return { ok: true };
      });
    if (phase === "result")
      h.ports.execute.mockReturnValue({
        get ok() {
          end();
          return true;
        },
      });
    if (phase === "cleanup") {
      h.ports.execute.mockReturnValue({ ok: false });
      h.surface.release.mockImplementation(end);
    }
    expect(h.capturer.capture(h.request)).toEqual(fail("DISPOSED"));
    expect(h.surface.release).toHaveBeenCalledTimes(["request", "source"].includes(phase) ? 0 : 1);
  });
  it.each(["create", "transform", "execute"])(
    "source changed during %s rejects output and releases",
    (phase) => {
      const h = harness();
      const change = () => {
        h.source.identity = {};
      };
      if (phase === "create")
        h.ports.createSurface.mockImplementation(() => {
          change();
          return h.surface;
        });
      if (phase === "transform") h.surface.context.setTransform.mockImplementation(change);
      if (phase === "execute")
        h.ports.execute.mockImplementation(() => {
          change();
          return { ok: true };
        });
      expect(h.capturer.capture(h.request)).toEqual(fail("SOURCE_CHANGED"));
      expect(h.surface.release).toHaveBeenCalledTimes(1);
    },
  );
});

describe("snapshot paint capability", () => {
  it("does not read custom bind/call properties and retains method receivers", () => {
    const h = harness();
    h.surface.release.mockImplementation(function (this: unknown) {
      expect(this).toBe(h.surface);
    });
    h.surface.copyTo.mockImplementation(function (this: unknown) {
      expect(this).toBe(h.surface);
    });
    h.surface.context.setTransform.mockImplementation(function (this: unknown) {
      expect(this).toBe(h.surface.context);
    });
    Object.defineProperty(h.surface.release, "bind", { get: boom });
    Object.defineProperty(h.surface.copyTo, "bind", { get: boom });
    Object.defineProperty(h.surface.context.setTransform, "call", { get: boom });
    const l = h.capture();
    expect(l.paint(h.paint)).toEqual({ ok: true });
    l.release();
    expect(h.surface.release).toHaveBeenCalledTimes(1);
  });
  it("a finite positive subnormal scale has no invented lower limit", () => {
    const h = harness();
    expect(h.capturer.capture({ ...h.request, scale: Number.MIN_VALUE }).ok).toBe(true);
    expect(h.ports.createSurface).toHaveBeenCalledExactlyOnceWith({ width: 1, height: 1 });
    h.capturer.dispose();
  });
  it("snapshots request and budget fields once", () => {
    const h = harness();
    const reads = [0, 0, 0, 0, 0];
    expect(
      h.capturer.capture({
        get sourceIdentity() {
          reads[0]++;
          return h.request.sourceIdentity;
        },
        get scale() {
          reads[1]++;
          return 1.25;
        },
        get budget() {
          reads[2]++;
          return {
            get maxEdge() {
              reads[3]++;
              return 1024;
            },
            get maxPixels() {
              reads[4]++;
              return 1024 * 1024;
            },
          };
        },
      }).ok,
    ).toBe(true);
    expect(reads).toEqual([1, 1, 1, 1, 1]);
    h.capturer.dispose();
  });
  it("source getter release stops further source reads and copying", () => {
    const h = harness();
    const l = h.capture();
    const later = vi.fn();
    h.ports.readSource.mockReturnValue({
      get identity() {
        l.release();
        return h.request.sourceIdentity;
      },
      get kind() {
        later();
        return "frame";
      },
    });
    expect(l.paint(h.paint)).toEqual(fail("RELEASED"));
    expect(later).not.toHaveBeenCalled();
    expect(h.surface.copyTo).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { target: [], rect: {} },
    {
      get target() {
        return boom();
      },
    },
    { target: {}, rect: { x: 0, y: 0, width: 1, height: 1 } },
    { target: {}, rect: { x: NaN, y: 0, width: 201, height: 160.5 } },
  ])("invalid paint preserves lease", (request) => {
    const h = harness();
    const l = h.capture();
    expect(l.paint(request)).toEqual(fail("INVALID_INPUT"));
    expect(h.surface.copyTo).not.toHaveBeenCalled();
    expect(h.surface.release).not.toHaveBeenCalled();
    expect(l.paint(h.paint)).toEqual({ ok: true });
  });
  it("Q102-1: BUSY during live copy, RELEASED during cleanup, DISPOSED after dispose", () => {
    const h = harness();
    const l = h.capture();
    h.surface.copyTo.mockImplementation(() => expect(l.paint(h.paint)).toEqual(fail("BUSY")));
    expect(l.paint(h.paint)).toEqual({ ok: true });
    h.surface.release.mockImplementation(() => expect(l.paint(h.paint)).toEqual(fail("RELEASED")));
    l.release();
    expect(h.surface.copyTo).toHaveBeenCalledTimes(1);
    h.capturer.dispose();
    expect(l.paint(null)).toEqual(fail("DISPOSED"));
  });
  it.each(["before", "during", "afterRead"])(
    "source invalidation %s retires and never silently succeeds",
    (when) => {
      const h = harness();
      const l = h.capture();
      if (when === "before") h.source.identity = {};
      if (when === "during")
        h.surface.copyTo.mockImplementation(() => {
          h.source.identity = {};
        });
      if (when === "afterRead") h.ports.readSource.mockImplementation(boom);
      expect(l.paint(h.paint)).toEqual(fail("SOURCE_CHANGED"));
      expect(h.surface.copyTo).toHaveBeenCalledTimes(when === "during" ? 1 : 0);
      expect(h.surface.release).toHaveBeenCalledTimes(1);
      expect(l.paint(h.paint)).toEqual(fail("RELEASED"));
    },
  );
  it.each(["release", "dispose", "throw"])("copy %s never returns success", (action) => {
    const h = harness();
    const l = h.capture();
    h.surface.copyTo.mockImplementation(
      action === "release" ? l.release : action === "dispose" ? h.capturer.dispose : boom,
    );
    expect(l.paint(h.paint)).toEqual(
      fail(action === "release" ? "RELEASED" : action === "dispose" ? "DISPOSED" : "PAINT_FAILED"),
    );
    expect(h.surface.release).toHaveBeenCalledTimes(1);
  });
  it("cleanup throws once, old cleanup cannot release reentrantly captured successor", () => {
    const h = harness();
    const old = h.capture();
    const next = { ...h.surface, release: vi.fn(), copyTo: vi.fn() };
    let successor: FrameSnapshotLease | undefined;
    h.surface.release.mockImplementation(() => {
      h.ports.createSurface.mockReturnValue(next);
      successor = h.capture();
      boom();
    });
    old.release();
    old.release();
    expect(successor?.paint(h.paint)).toEqual({ ok: true });
    expect(next.release).not.toHaveBeenCalled();
    h.capturer.dispose();
    expect(next.release).toHaveBeenCalledTimes(1);
  });
  it("getter terminal transitions skip subsequent getters and source calls", () => {
    const h = harness();
    const l = h.capture();
    const rect = vi.fn();
    const reads = h.ports.readSource.mock.calls.length;
    expect(
      l.paint({
        get target() {
          l.release();
          return {};
        },
        get rect() {
          rect();
          return {};
        },
      }),
    ).toEqual(fail("RELEASED"));
    expect(rect).not.toHaveBeenCalled();
    expect(h.ports.readSource).toHaveBeenCalledTimes(reads);
  });
});
