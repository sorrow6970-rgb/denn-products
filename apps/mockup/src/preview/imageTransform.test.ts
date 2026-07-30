// Framework-free pan/zoom editing contract (spec 029 §5 unit). No React, DOM, Canvas or timer: the
// drag controller is driven through fake frame ports so the merge and the stale-frame guard are
// observable without a browser. Real pointers, pixels, resize and StrictMode remounts are verified
// in `tests/e2e/mockup-preview.spec.ts`.

import { describe, expect, it, vi } from "vitest";
import {
  createDragController,
  dragTransform,
  IDENTITY_TRANSFORM,
  MAX_SCALE,
  maxPanFromRects,
  MIN_SCALE,
  PAN_KEY_STEP,
  PAN_KEY_STEP_COARSE,
  panTransform,
  readNormalizedTransform,
  resetTransform,
  SCALE_PERCENT_MAX,
  SCALE_PERCENT_MIN,
  scaleFromPercent,
  scaleToPercent,
  toLogicalTransform,
  withScale,
  zoomTransform,
  ZOOM_STEP_FACTOR,
} from "./imageTransform";

const t = (scale: number, x: number, y: number) => ({ scale, x, y });

describe("scale contract (D-3, D-7)", () => {
  it("starts at 1 and never drops below it, so the clip can never show empty space", () => {
    expect(IDENTITY_TRANSFORM).toEqual({ scale: 1, x: 0, y: 0 });
    expect(MIN_SCALE).toBe(1);
    expect(withScale(IDENTITY_TRANSFORM, 0.3).scale).toBe(1);
    expect(withScale(IDENTITY_TRANSFORM, -2).scale).toBe(1);
    expect(zoomTransform(IDENTITY_TRANSFORM, "out")).toBe(IDENTITY_TRANSFORM);
  });

  it("zooms multiplicatively by the same factor in both directions", () => {
    const once = zoomTransform(IDENTITY_TRANSFORM, "in");
    expect(once.scale).toBeCloseTo(ZOOM_STEP_FACTOR, 12);
    const twice = zoomTransform(once, "in");
    expect(twice.scale).toBeCloseTo(ZOOM_STEP_FACTOR * ZOOM_STEP_FACTOR, 12);
    expect(zoomTransform(twice, "out").scale).toBeCloseTo(once.scale, 12);
  });

  it("clamps at the maximum and returns the SAME object when nothing changes", () => {
    const top = withScale(IDENTITY_TRANSFORM, MAX_SCALE);
    expect(top.scale).toBe(5);
    expect(zoomTransform(top, "in")).toBe(top);
    expect(withScale(top, 99).scale).toBe(MAX_SCALE);
  });

  it("keeps the normalized pan while zooming (the framing is preserved, not the pixel offset)", () => {
    const zoomed = zoomTransform(t(2, 0.5, -0.25), "in");
    expect(zoomed.x).toBe(0.5);
    expect(zoomed.y).toBe(-0.25);
  });

  it("maps percent to scale only through the slider range", () => {
    expect(scaleToPercent(1)).toBe(100);
    expect(scaleToPercent(1.1)).toBe(110);
    expect(scaleToPercent(5)).toBe(500);
    expect(scaleFromPercent(SCALE_PERCENT_MIN)).toBe(1);
    expect(scaleFromPercent(SCALE_PERCENT_MAX)).toBe(5);
    expect(scaleFromPercent(250)).toBeCloseTo(2.5, 12);
    expect(scaleFromPercent(10)).toBe(1); // below the slider's own range
    expect(scaleFromPercent(9000)).toBe(5);
    expect(scaleFromPercent(Number.NaN)).toBeNull();
    expect(scaleFromPercent(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("reset returns the identity", () => {
    expect(resetTransform()).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe("normalized pan", () => {
  it("limits BOTH axes to [-1, 1]", () => {
    expect(panTransform(t(2, 0.9, -0.9), 0.5, -0.5)).toEqual(t(2, 1, -1));
    expect(panTransform(t(2, -1, 1), -0.5, 0.5)).toEqual(t(2, -1, 1));
  });

  it("uses the fine and coarse keyboard steps", () => {
    expect(PAN_KEY_STEP).toBe(0.02);
    expect(PAN_KEY_STEP_COARSE).toBe(0.1);
    expect(panTransform(IDENTITY_TRANSFORM, PAN_KEY_STEP, 0).x).toBeCloseTo(0.02, 12);
    expect(panTransform(IDENTITY_TRANSFORM, 0, PAN_KEY_STEP_COARSE).y).toBeCloseTo(0.1, 12);
  });

  it("ignores a non-finite delta instead of poisoning the state", () => {
    const start = t(2, 0.25, 0.25);
    expect(panTransform(start, Number.NaN, 0)).toBe(start);
    expect(panTransform(start, 0, Number.POSITIVE_INFINITY)).toBe(start);
  });

  it("returns the same object when the pan is already at the limit", () => {
    const pinned = t(3, 1, 1);
    expect(panTransform(pinned, 0.1, 0.1)).toBe(pinned);
  });
});

describe("normalized ↔ logical conversion (D-1)", () => {
  it("scales each axis by its own maxPan", () => {
    expect(toLogicalTransform(t(2, 0.5, -1), { x: 40, y: 10 })).toEqual({
      scale: 2,
      x: 20,
      y: -10,
    });
  });

  it("pins an axis whose maxPan is 0", () => {
    expect(toLogicalTransform(t(2, 1, -1), { x: 0, y: 8 })).toEqual({ scale: 2, x: 0, y: -8 });
    expect(toLogicalTransform(t(2, 1, 1), { x: 0, y: 0 })).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("keeps the composition across a resize: the same normalized value follows the new geometry", () => {
    const editing = t(1.5, 0.5, 0.5);
    const before = toLogicalTransform(editing, { x: 40, y: 20 });
    const after = toLogicalTransform(editing, { x: 80, y: 40 });
    expect(before).toEqual({ scale: 1.5, x: 20, y: 10 });
    // twice the geometry → twice the logical pan, i.e. the SAME visible framing
    expect(after).toEqual({ scale: 1.5, x: 40, y: 20 });
  });

  it("rejects an unusable maxPan instead of inventing one", () => {
    expect(toLogicalTransform(IDENTITY_TRANSFORM, { x: Number.NaN, y: 0 })).toBeNull();
    expect(
      toLogicalTransform(IDENTITY_TRANSFORM, { x: 0, y: Number.POSITIVE_INFINITY }),
    ).toBeNull();
    expect(toLogicalTransform(IDENTITY_TRANSFORM, { x: -1, y: 0 })).toBeNull();
  });

  it("derives maxPan from the drawn size vs the clip size", () => {
    expect(maxPanFromRects({ width: 100, height: 50 }, { width: 180, height: 50 })).toEqual({
      x: 40,
      y: 0,
    });
    expect(maxPanFromRects({ width: 100, height: 50 }, { width: 100, height: 50 })).toEqual({
      x: 0,
      y: 0,
    });
    expect(maxPanFromRects({ width: Number.NaN, height: 1 }, { width: 1, height: 1 })).toBeNull();
  });
});

describe("readNormalizedTransform — no repair, no throw", () => {
  it("accepts an already valid value as a plain snapshot", () => {
    const source = t(2, 0.5, -0.5);
    const read = readNormalizedTransform(source);
    expect(read).toEqual(source);
    expect(read).not.toBe(source);
  });

  it("REJECTS instead of clamping an out-of-range value", () => {
    expect(readNormalizedTransform(t(0.5, 0, 0))).toBeNull();
    expect(readNormalizedTransform(t(6, 0, 0))).toBeNull();
    expect(readNormalizedTransform(t(2, 1.5, 0))).toBeNull();
    expect(readNormalizedTransform(t(2, 0, -1.5))).toBeNull();
  });

  it("rejects non-finite fields and non-objects", () => {
    expect(readNormalizedTransform(t(Number.NaN, 0, 0))).toBeNull();
    expect(readNormalizedTransform(t(2, Number.POSITIVE_INFINITY, 0))).toBeNull();
    expect(readNormalizedTransform(null)).toBeNull();
    expect(readNormalizedTransform("2")).toBeNull();
    expect(readNormalizedTransform(undefined)).toBeNull();
  });

  it("reads each field exactly once", () => {
    const reads: string[] = [];
    const spy = {
      get scale() {
        reads.push("scale");
        return 2;
      },
      get x() {
        reads.push("x");
        return 0;
      },
      get y() {
        reads.push("y");
        return 0;
      },
    };
    expect(readNormalizedTransform(spy)).toEqual(t(2, 0, 0));
    expect(reads).toEqual(["scale", "x", "y"]);
  });

  it("closes safely for a throwing getter, a Proxy trap and a revoked Proxy", () => {
    const throwing = {
      get scale(): number {
        throw new Error("scale");
      },
      x: 0,
      y: 0,
    };
    expect(readNormalizedTransform(throwing)).toBeNull();

    const trap = new Proxy(t(2, 0, 0), {
      get() {
        throw new Error("trap");
      },
    });
    expect(readNormalizedTransform(trap)).toBeNull();

    const revocable = Proxy.revocable(t(2, 0, 0), {});
    revocable.revoke();
    expect(readNormalizedTransform(revocable.proxy)).toBeNull();
  });

  it("cannot be changed by a drifting getter: the first read wins", () => {
    let calls = 0;
    const drifting = {
      get scale() {
        calls += 1;
        return calls === 1 ? 2 : 5;
      },
      x: 0,
      y: 0,
    };
    expect(readNormalizedTransform(drifting)?.scale).toBe(2);
    expect(calls).toBe(1);
  });
});

describe("drag geometry", () => {
  it("uses the absolute delta from the start point, not accumulated moves", () => {
    const start = t(2, 0, 0);
    const maxPan = { x: 50, y: 25 };
    const once = dragTransform(start, { x: 0, y: 0 }, { x: 25, y: 0 }, maxPan);
    expect(once.x).toBeCloseTo(0.5, 12);
    // a second move re-derives from the START, so a skipped frame cannot drift the photo
    const twice = dragTransform(start, { x: 0, y: 0 }, { x: 12.5, y: 0 }, maxPan);
    expect(twice.x).toBeCloseTo(0.25, 12);
  });

  it("clamps at the edge and pins an axis whose maxPan is 0", () => {
    const dragged = dragTransform(
      t(2, 0, 0),
      { x: 0, y: 0 },
      { x: 9999, y: 9999 },
      {
        x: 10,
        y: 0,
      },
    );
    expect(dragged).toEqual(t(2, 1, 0));
  });

  it("ignores a non-finite point", () => {
    const start = t(2, 0.1, 0.1);
    expect(dragTransform(start, { x: 0, y: 0 }, { x: Number.NaN, y: 0 }, { x: 1, y: 1 })).toBe(
      start,
    );
  });
});

// --- drag session ------------------------------------------------------------

function harness() {
  const frames: Array<() => void> = [];
  const cancelled: number[] = [];
  const commits: Array<{ scale: number; x: number; y: number }> = [];
  const controller = createDragController({
    requestFrame: (callback) => {
      frames.push(callback);
      return frames.length; // 1-based handle
    },
    cancelFrame: (handle) => cancelled.push(handle),
    commit: (transform) => commits.push(transform),
  });
  const runFrames = (): void => {
    const pending = frames.splice(0, frames.length);
    for (const frame of pending) frame();
  };
  return { controller, frames, cancelled, commits, runFrames };
}

const BEGIN = {
  pointerId: 7,
  point: { x: 0, y: 0 },
  transform: IDENTITY_TRANSFORM,
  maxPan: { x: 100, y: 50 },
};

describe("createDragController", () => {
  it("merges every move in one animation frame and commits only the newest transform", () => {
    const h = harness();
    expect(h.controller.begin(BEGIN)).toBe(true);
    h.controller.move(7, { x: 10, y: 0 });
    h.controller.move(7, { x: 20, y: 0 });
    h.controller.move(7, { x: 30, y: 0 });
    expect(h.frames).toHaveLength(1);
    expect(h.commits).toEqual([]);
    h.runFrames();
    expect(h.commits).toHaveLength(1);
    expect(h.commits[0]?.x).toBeCloseTo(0.3, 12);
  });

  it("refuses a second session while one is active and reports the active pointer", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    expect(h.controller.isDragging()).toBe(true);
    expect(h.controller.activePointerId()).toBe(7);
    expect(h.controller.begin({ ...BEGIN, pointerId: 8 })).toBe(false);
  });

  it("ignores a move from another pointer", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(9, { x: 40, y: 0 });
    expect(h.frames).toHaveLength(0);
    h.runFrames();
    expect(h.commits).toEqual([]);
  });

  for (const reason of ["pointercancel", "lostpointercapture"] as const) {
    it(`ends the session on ${reason}, DISCARDS the pending transform and stays quiet`, () => {
      const h = harness();
      h.controller.begin(BEGIN);
      h.controller.move(7, { x: 50, y: 0 });
      h.controller.end(7, reason);
      expect(h.controller.isDragging()).toBe(false);
      expect(h.cancelled).toEqual([1]);
      h.runFrames();
      expect(h.commits).toEqual([]);
      // a late move after the end is ignored as well
      h.controller.move(7, { x: 90, y: 0 });
      h.runFrames();
      expect(h.commits).toEqual([]);
    });
  }

  // --- 보완 라운드 1: a normal release must not lose the last move -------------

  it("FLUSHES the pending transform exactly once on pointerup", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 30, y: 0 });
    h.controller.move(7, { x: 50, y: 0 }); // newest value, still waiting for its frame
    expect(h.commits).toEqual([]);
    h.controller.end(7, "pointerup");
    expect(h.commits).toHaveLength(1);
    expect(h.commits[0]?.x).toBeCloseTo(0.5, 12);
    expect(h.controller.isDragging()).toBe(false);
    // the cancelled frame must not commit the same value a second time
    h.runFrames();
    expect(h.commits).toHaveLength(1);
  });

  it("does not double-commit when the frame already ran before the pointerup", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 });
    h.runFrames();
    expect(h.commits).toHaveLength(1);
    h.controller.end(7, "pointerup");
    expect(h.commits).toHaveLength(1); // nothing pending → nothing flushed
  });

  it("commits nothing on a pointerup with no move at all", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.end(7, "pointerup");
    expect(h.commits).toEqual([]);
  });

  it("the pointerup flush cannot be consumed by, or leak into, the NEXT session", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 });
    h.controller.end(7, "pointerup");
    expect(h.commits).toHaveLength(1);

    h.controller.begin({ ...BEGIN, pointerId: 21, transform: t(1, 0.5, 0) });
    h.runFrames(); // the previous session's frame fires now
    expect(h.commits).toHaveLength(1); // still only the flush
    h.controller.move(21, { x: 10, y: 0 });
    h.runFrames();
    expect(h.commits).toHaveLength(2);
    expect(h.commits[1]?.x).toBeCloseTo(0.6, 12); // 0.5 start + 10/100
  });

  it("a stale end from an old pointer cannot flush anything", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 });
    h.controller.end(99, "pointerup"); // wrong pointer
    expect(h.commits).toEqual([]);
    expect(h.controller.isDragging()).toBe(true);
    h.controller.end(7, "pointerup");
    expect(h.commits).toHaveLength(1);
  });

  it("a throwing subscriber during the flush still closes the session", () => {
    const frames: Array<() => void> = [];
    const controller = createDragController({
      requestFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame: () => undefined,
      commit: () => {
        throw new Error("subscriber");
      },
    });
    controller.begin(BEGIN);
    controller.move(7, { x: 50, y: 0 });
    expect(() => controller.end(7, "pointerup")).not.toThrow();
    expect(controller.isDragging()).toBe(false);
    expect(controller.begin(BEGIN)).toBe(true); // usable again
  });

  it("dispose and abort discard the pending transform (no flush)", () => {
    const aborted = harness();
    aborted.controller.begin(BEGIN);
    aborted.controller.move(7, { x: 50, y: 0 });
    aborted.controller.abort("selection");
    expect(aborted.commits).toEqual([]);

    const disposed = harness();
    disposed.controller.begin(BEGIN);
    disposed.controller.move(7, { x: 50, y: 0 });
    disposed.controller.dispose();
    expect(disposed.commits).toEqual([]);
  });

  it("ignores an end from a different pointer (a stale event cannot close the session)", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.end(99, "pointerup");
    expect(h.controller.isDragging()).toBe(true);
  });

  it("aborts on a selection change regardless of pointer id", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 });
    h.controller.abort("selection");
    expect(h.controller.isDragging()).toBe(false);
    h.runFrames();
    expect(h.commits).toEqual([]);
  });

  it("does not commit a frame that belongs to a PREVIOUS session (generation guard)", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 }); // frame 1 scheduled
    // a discarding end, so the only possible commit below is the SECOND session's
    h.controller.end(7, "pointercancel");
    h.controller.begin({ ...BEGIN, pointerId: 11 });
    h.controller.move(11, { x: 10, y: 0 }); // frame 2 scheduled
    h.runFrames();
    expect(h.commits).toHaveLength(1);
    expect(h.commits[0]?.x).toBeCloseTo(0.1, 12);
  });

  it("dispose ends everything and rejects further work (a new controller is needed)", () => {
    const h = harness();
    h.controller.begin(BEGIN);
    h.controller.move(7, { x: 50, y: 0 });
    h.controller.dispose();
    h.runFrames();
    expect(h.commits).toEqual([]);
    expect(h.controller.begin(BEGIN)).toBe(false);
    expect(h.controller.isDragging()).toBe(false);
    h.controller.dispose(); // idempotent
  });

  it("a fresh controller after dispose works — nothing stays permanently disabled (StrictMode)", () => {
    const first = harness();
    first.controller.begin(BEGIN);
    first.controller.dispose();
    const second = harness();
    expect(second.controller.begin(BEGIN)).toBe(true);
    second.controller.move(7, { x: 100, y: 0 });
    second.runFrames();
    expect(second.commits).toEqual([{ scale: 1, x: 1, y: 0 }]);
  });

  it("rejects an unusable begin input without throwing", () => {
    const h = harness();
    expect(h.controller.begin({ ...BEGIN, point: { x: Number.NaN, y: 0 } })).toBe(false);
    expect(h.controller.begin({ ...BEGIN, maxPan: { x: -1, y: 0 } })).toBe(false);
    expect(h.controller.begin({ ...BEGIN, transform: t(0.5, 0, 0) })).toBe(false);
    expect(h.controller.begin({ ...BEGIN, pointerId: Number.NaN })).toBe(false);
    expect(h.controller.isDragging()).toBe(false);
  });

  it("survives hostile ports: a throwing scheduler or subscriber never breaks the session", () => {
    const commit = vi.fn(() => {
      throw new Error("subscriber");
    });
    const controller = createDragController({
      requestFrame: (callback) => {
        callback();
        return 1;
      },
      cancelFrame: () => {
        throw new Error("cancel");
      },
      commit,
    });
    expect(controller.begin(BEGIN)).toBe(true);
    expect(() => controller.move(7, { x: 10, y: 0 })).not.toThrow();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(() => controller.end(7, "pointerup")).not.toThrow();
    expect(controller.isDragging()).toBe(false);
  });

  it("keeps per-slot values independent: two controllers/values never share state", () => {
    // the composer stores one value per slot, so independence is a property of the VALUES
    const zoneA = panTransform(withScale(IDENTITY_TRANSFORM, 2), 0.5, 0);
    const zoneB = IDENTITY_TRANSFORM;
    expect(zoneA).toEqual(t(2, 0.5, 0));
    expect(zoneB).toEqual(t(1, 0, 0));
    expect(panTransform(zoneB, -0.5, 0)).toEqual(t(1, -0.5, 0));
    expect(zoneA).toEqual(t(2, 0.5, 0));
  });
});
