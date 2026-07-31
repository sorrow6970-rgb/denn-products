// Physical-clock overlay contract (spec 031 §2.7, §5 unit). Framework-free: the clock and the
// scheduler are injected, so nothing here depends on the real time, the real timezone or a browser.
//
// SCOPE HONESTY: this proves WHAT is shown and WHEN a timer is scheduled. Real DOM placement, real
// pixels and real devices are verified in `tests/e2e/mockup-preview.spec.ts` and stay NOT TESTED
// against actual clock hardware.

import { describe, expect, it, vi } from "vitest";
import {
  type ClockPorts,
  createClockTicker,
  formatClockLabel,
  MINUTE_MS,
  msUntilNextMinute,
  resolveClockCss,
  resolveClockOverlay,
} from "./clockOverlay";

const PLACEMENT = { xPercent: 88, yPercent: 88, sizePercent: 12 };

/** A fake scheduler: nothing fires until the test says so. */
function fakePorts(startMs = 0): ClockPorts & {
  run: () => void;
  pending: () => number;
  delays: number[];
  advance: (ms: number) => void;
} {
  let now = startMs;
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  let nextHandle = 1;
  return {
    now: () => now,
    setTimer: (callback, delayMs) => {
      const handle = nextHandle++;
      timers.set(handle, callback);
      delays.push(delayMs);
      return handle;
    },
    clearTimer: (handle) => {
      timers.delete(handle);
    },
    run: () => {
      const entries = [...timers.entries()];
      timers.clear();
      for (const [, callback] of entries) callback();
    },
    pending: () => timers.size,
    delays,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("formatClockLabel — local 24-hour HH:MM, no seconds", () => {
  it("pads both fields", () => {
    const nineOhFive = new Date(2026, 6, 31, 9, 5, 0, 0).getTime();
    expect(formatClockLabel(nineOhFive)).toBe("09:05");
  });

  it("uses midnight as 00:00 and keeps the 24-hour form", () => {
    expect(formatClockLabel(new Date(2026, 6, 31, 0, 0).getTime())).toBe("00:00");
    expect(formatClockLabel(new Date(2026, 6, 31, 23, 59).getTime())).toBe("23:59");
    expect(formatClockLabel(new Date(2026, 6, 31, 13, 7).getTime())).toBe("13:07");
  });

  it("rejects a non-finite timestamp instead of painting NaN", () => {
    expect(formatClockLabel(Number.NaN)).toBeNull();
    expect(formatClockLabel(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("msUntilNextMinute — the tick lands on the boundary, never on 0", () => {
  it("returns the remaining time inside a minute", () => {
    expect(msUntilNextMinute(0)).toBe(MINUTE_MS);
    expect(msUntilNextMinute(1_000)).toBe(59_000);
    expect(msUntilNextMinute(59_999)).toBe(1);
  });

  it("never returns 0 — a zero delay would busy-loop the scheduler", () => {
    for (const at of [0, MINUTE_MS, MINUTE_MS * 42]) {
      expect(msUntilNextMinute(at)).toBeGreaterThan(0);
      expect(msUntilNextMinute(at)).toBeLessThanOrEqual(MINUTE_MS);
    }
  });

  it("falls back to a full minute for an unusable timestamp", () => {
    expect(msUntilNextMinute(Number.NaN)).toBe(MINUTE_MS);
  });
});

/** A 300x420 frame with a 5% band -> band 15, mat 270x390. */
const CANVAS = { logicalWidth: 300, logicalHeight: 420, bandPx: 15 };
const IMAGE_NONE = { declared: false, src: null } as const;

describe("resolveClockCss — the MAT rect is the reference (보완 1 §1)", () => {
  it("places the centre inside the mat, not the whole box", () => {
    // x=50%,y=50% of the mat -> band + 0.5*mat = 15+135 = 150 and 15+195 = 210
    const css = resolveClockCss({ xPercent: 50, yPercent: 50, sizePercent: 10 }, CANVAS);
    expect(css?.leftPercent).toBeCloseTo(50, 9);
    expect(css?.topPercent).toBeCloseTo(50, 9);
    // side = min(270, 390) * 10% = 27 -> 27/300 = 9% of the box
    expect(css?.widthPercent).toBeCloseTo(9, 9);
  });

  it("a nonzero band shifts the result away from the naive whole-box percentage", () => {
    const css = resolveClockCss({ xPercent: 88, yPercent: 88, sizePercent: 12 }, CANVAS);
    // mat-relative: 15 + 0.88*270 = 252.6 -> 84.2% of 300, NOT 88%
    expect(css?.leftPercent).toBeCloseTo(84.2, 9);
    expect(css?.leftPercent).not.toBeCloseTo(88, 3);
    // 15 + 0.88*390 = 358.2 -> 85.285…% of 420, NOT 88%
    expect(css?.topPercent).toBeCloseTo((358.2 / 420) * 100, 9);
  });

  it("uses the SHORTER mat side for the size, in portrait and in landscape", () => {
    const portrait = resolveClockCss(
      { xPercent: 50, yPercent: 50, sizePercent: 20 },
      { logicalWidth: 300, logicalHeight: 420, bandPx: 15 },
    );
    // min(270, 390) = 270 -> 54px -> 18% of 300
    expect(portrait?.widthPercent).toBeCloseTo(18, 9);

    const landscape = resolveClockCss(
      { xPercent: 50, yPercent: 50, sizePercent: 20 },
      { logicalWidth: 420, logicalHeight: 300, bandPx: 21 },
    );
    // mat 378x258 -> min = 258 -> 51.6px -> 51.6/420 = 12.285…%
    expect(landscape?.widthPercent).toBeCloseTo((51.6 / 420) * 100, 9);
  });

  it("keeps the SAME percentages when the canvas scales (resize is a no-op)", () => {
    const small = resolveClockCss(
      { xPercent: 88, yPercent: 88, sizePercent: 12 },
      { logicalWidth: 300, logicalHeight: 420, bandPx: 15 },
    );
    const large = resolveClockCss(
      { xPercent: 88, yPercent: 88, sizePercent: 12 },
      { logicalWidth: 600, logicalHeight: 840, bandPx: 30 },
    );
    expect(large?.leftPercent).toBeCloseTo(small?.leftPercent ?? -1, 9);
    expect(large?.topPercent).toBeCloseTo(small?.topPercent ?? -1, 9);
    expect(large?.widthPercent).toBeCloseTo(small?.widthPercent ?? -1, 9);
  });

  it("returns null for an unusable canvas instead of guessing", () => {
    const placement = { xPercent: 50, yPercent: 50, sizePercent: 10 };
    for (const canvas of [
      { logicalWidth: 0, logicalHeight: 420, bandPx: 15 },
      { logicalWidth: 300, logicalHeight: Number.NaN, bandPx: 15 },
      { logicalWidth: 300, logicalHeight: 420, bandPx: -1 },
      // a band that swallows the mat entirely
      { logicalWidth: 300, logicalHeight: 420, bandPx: 200 },
    ]) {
      expect(resolveClockCss(placement, canvas)).toBeNull();
    }
  });
});

describe("resolveClockOverlay — what to show", () => {
  it("hides when the template has no clock", () => {
    const state = resolveClockOverlay({
      enabled: false,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: IMAGE_NONE,
      nowMs: 0,
    });
    expect(state).toEqual({ view: { kind: "hidden" }, css: null });
  });

  it("shows the operator's clock PHOTO when one is declared and resolved", () => {
    const state = resolveClockOverlay({
      enabled: true,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: { declared: true, src: "blob:fake" },
      nowMs: 0,
    });
    expect(state.view).toEqual({ kind: "image", src: "blob:fake" });
    expect(state.css).not.toBeNull();
  });

  it("★ a DECLARED but unresolvable photo HIDES the overlay — no generic clock stands in", () => {
    const unresolved = resolveClockOverlay({
      enabled: true,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: { declared: true, src: null },
      nowMs: new Date(2026, 6, 31, 10, 10).getTime(),
    });
    expect(unresolved.view.kind).toBe("hidden");

    const empty = resolveClockOverlay({
      enabled: true,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: { declared: true, src: "" },
      nowMs: 0,
    });
    expect(empty.view.kind).toBe("hidden");
  });

  it("★ a declared photo whose <img> FAILED to load also hides the overlay", () => {
    const state = resolveClockOverlay({
      enabled: true,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: { declared: true, src: "blob:fake", failed: true },
      nowMs: new Date(2026, 6, 31, 10, 10).getTime(),
    });
    expect(state.view.kind).toBe("hidden");
  });

  it("uses the HH:MM placeholder ONLY when no photo was declared", () => {
    const at = new Date(2026, 6, 31, 10, 10).getTime();
    const state = resolveClockOverlay({
      enabled: true,
      placement: PLACEMENT,
      canvas: CANVAS,
      image: IMAGE_NONE,
      nowMs: at,
    });
    expect(state.view).toEqual({ kind: "text", label: "10:10" });
  });

  it("HIDES instead of failing when the placement or canvas is unusable", () => {
    const bad = [
      { xPercent: -1, yPercent: 0, sizePercent: 12 },
      { xPercent: 101, yPercent: 0, sizePercent: 12 },
      { xPercent: 0, yPercent: Number.NaN, sizePercent: 12 },
      { xPercent: 0, yPercent: 0, sizePercent: 0 },
      { xPercent: 0, yPercent: 0, sizePercent: 101 },
    ];
    for (const placement of bad) {
      const state = resolveClockOverlay({
        enabled: true,
        placement,
        canvas: CANVAS,
        image: IMAGE_NONE,
        nowMs: 0,
      });
      expect(state.view.kind).toBe("hidden");
    }
    for (const canvas of [null, undefined]) {
      expect(
        resolveClockOverlay({
          enabled: true,
          placement: PLACEMENT,
          canvas,
          image: IMAGE_NONE,
          nowMs: 0,
        }).view.kind,
      ).toBe("hidden");
    }
    expect(
      resolveClockOverlay({
        enabled: true,
        placement: null,
        canvas: CANVAS,
        image: IMAGE_NONE,
        nowMs: 0,
      }).view.kind,
    ).toBe("hidden");
  });
});

describe("createClockTicker — at most ONE timer, minute boundaries only", () => {
  it("schedules nothing when ticking is not needed (a clock PHOTO does not tick)", () => {
    const ports = fakePorts(0);
    const ticker = createClockTicker(ports, () => {});
    expect(ticker.start(false)).toBe(false);
    expect(ports.pending()).toBe(0);
    expect(ticker.activeTimers()).toBe(0);
  });

  it("first tick lands on the minute boundary, then every 60s", () => {
    const ports = fakePorts(1_000); // 1s past a boundary
    const onTick = vi.fn();
    const ticker = createClockTicker(ports, onTick);
    ticker.start(true);
    expect(ports.delays).toEqual([59_000]);
    ports.run();
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(ports.delays).toEqual([59_000, MINUTE_MS]);
    ports.run();
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(ports.delays).toEqual([59_000, MINUTE_MS, MINUTE_MS]);
    // never a 1-second poll
    expect(ports.delays.some((delay) => delay <= 1_000 && delay !== 1)).toBe(false);
  });

  it("keeps at most one timer alive across repeated starts", () => {
    const ports = fakePorts(0);
    const ticker = createClockTicker(ports, () => {});
    for (let i = 0; i < 5; i++) ticker.start(true);
    expect(ports.pending()).toBe(1);
    expect(ticker.activeTimers()).toBe(1);
  });

  it("stop cancels the pending timer", () => {
    const ports = fakePorts(0);
    const onTick = vi.fn();
    const ticker = createClockTicker(ports, onTick);
    ticker.start(true);
    ticker.stop();
    expect(ports.pending()).toBe(0);
    expect(ticker.activeTimers()).toBe(0);
    ports.run();
    expect(onTick).not.toHaveBeenCalled();
  });

  it("switching to a clock PHOTO stops the timer", () => {
    const ports = fakePorts(0);
    const ticker = createClockTicker(ports, () => {});
    ticker.start(true);
    expect(ports.pending()).toBe(1);
    ticker.start(false); // now showing a custom image
    expect(ports.pending()).toBe(0);
    expect(ticker.activeTimers()).toBe(0);
  });

  it("a callback from an ended session never fires (generation guard)", () => {
    // a scheduler that keeps the callback even after `clearTimer`, so a LATE fire is observable —
    // exactly the case a real `setTimeout` cannot be forced into.
    const captured: (() => void)[] = [];
    const leaky: ClockPorts = {
      now: () => 0,
      setTimer: (callback) => {
        captured.push(callback);
        return captured.length;
      },
      clearTimer: () => {}, // deliberately does NOT cancel
    };
    const onTick = vi.fn();
    const ticker = createClockTicker(leaky, onTick);

    ticker.start(true);
    ticker.stop(); // session ends, but the callback is still out there
    for (const callback of captured) callback();
    expect(onTick).not.toHaveBeenCalled();

    // and a callback from the PREVIOUS session cannot repaint the NEW one either
    captured.length = 0;
    ticker.start(true);
    const fromNewSession = [...captured];
    ticker.start(true); // restart -> the previous generation is stale
    for (const callback of fromNewSession) callback();
    expect(onTick).not.toHaveBeenCalled();
    ticker.dispose();
  });

  it("dispose is permanent and a later start does nothing", () => {
    const ports = fakePorts(0);
    const onTick = vi.fn();
    const ticker = createClockTicker(ports, onTick);
    ticker.start(true);
    ticker.dispose();
    expect(ports.pending()).toBe(0);
    expect(ticker.start(true)).toBe(false);
    expect(ports.pending()).toBe(0);
    ticker.dispose(); // idempotent
    expect(ticker.activeTimers()).toBe(0);
  });

  it("a throwing subscriber does not stop the next tick", () => {
    const ports = fakePorts(0);
    let calls = 0;
    const ticker = createClockTicker(ports, () => {
      calls += 1;
      throw new Error("hostile");
    });
    ticker.start(true);
    ports.run();
    expect(calls).toBe(1);
    // a follow-up tick was still scheduled
    expect(ports.pending()).toBe(1);
    ticker.dispose();
  });

  it("a hostile scheduler cannot break start or teardown", () => {
    const hostile: ClockPorts = {
      now: () => 0,
      setTimer: () => {
        throw new Error("no timers");
      },
      clearTimer: () => {
        throw new Error("no clear");
      },
    };
    const ticker = createClockTicker(hostile, () => {});
    expect(ticker.start(true)).toBe(false);
    expect(() => ticker.stop()).not.toThrow();
    expect(() => ticker.dispose()).not.toThrow();
  });

  it("a throwing clock source schedules nothing", () => {
    const ports: ClockPorts = {
      now: () => {
        throw new Error("no clock");
      },
      setTimer: () => 1,
      clearTimer: () => {},
    };
    const ticker = createClockTicker(ports, () => {});
    expect(ticker.start(true)).toBe(false);
  });
});
