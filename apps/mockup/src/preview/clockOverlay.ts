// Physical-clock preview overlay contract (spec 031 §2.7). Framework-free: no React, no DOM, no
// Canvas — the composer renders the overlay and this module owns only WHAT to show and WHEN to
// refresh it.
//
// The clock is NOT artwork (Founder F-4): the real product has a clock fitted to it, and the app
// merely shows where it sits. So nothing here ever reaches the render plan, the print/export path
// or an order. A failure hides the overlay and never touches the photo/text plan (spec 031 §3).
//
// Timer contract:
//  - a custom clock IMAGE runs ZERO timers: a photo of a clock does not tick,
//  - the `HH:MM` text placeholder has no seconds, so a 1-second interval is forbidden. It refreshes
//    on the MINUTE BOUNDARY and every 60s after that,
//  - at most ONE timer may be alive per overlay. Every ending — toggle off, template/frame-size/
//    model/kind change, a switch to a custom image, unmount, StrictMode remount — cancels it, and a
//    generation guard stops a callback scheduled by an already-ended session from ever firing.

/** Injected clock + scheduler, so tests never depend on the real time (spec 031 §5). */
export interface ClockPorts {
  /** current epoch milliseconds. */
  readonly now: () => number;
  /** schedule a one-shot callback; returns a handle. */
  readonly setTimer: (callback: () => void, delayMs: number) => number;
  readonly clearTimer: (handle: number) => void;
}

/** What the overlay should display right now. */
export type ClockOverlayView =
  | { readonly kind: "hidden" }
  | { readonly kind: "image"; readonly src: string }
  | { readonly kind: "text"; readonly label: string };

export interface ClockOverlayPlacement {
  /** percent of the preview surface. */
  readonly xPercent: number;
  readonly yPercent: number;
  /** percent of `min(width, height)`. */
  readonly sizePercent: number;
}

export interface ClockOverlayState {
  readonly view: ClockOverlayView;
  readonly placement: ClockOverlayPlacement | null;
}

export const MINUTE_MS = 60_000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const inClosedRange = (value: unknown, min: number, max: number): boolean =>
  isFiniteNumber(value) && value >= min && value <= max;

/**
 * Local 24-hour `HH:MM`, exactly what the legacy overlay shows (denn-mockup-tool.html:3199-3207):
 * no seconds, no locale formatting, no timezone conversion. A non-finite timestamp yields `null`
 * so the caller hides the overlay instead of painting `NaN:NaN`.
 */
export function formatClockLabel(epochMs: number): string | null {
  if (!isFiniteNumber(epochMs)) return null;
  const date = new Date(epochMs);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * Milliseconds until the next minute boundary, in `1..60000`. Exactly on a boundary the answer is a
 * full minute, never 0 — a 0 delay would busy-loop the scheduler.
 */
export function msUntilNextMinute(epochMs: number): number {
  if (!isFiniteNumber(epochMs)) return MINUTE_MS;
  const remainder = ((epochMs % MINUTE_MS) + MINUTE_MS) % MINUTE_MS;
  const delay = MINUTE_MS - remainder;
  return delay <= 0 ? MINUTE_MS : delay;
}

/**
 * Resolve what to display. A missing or malformed placement hides the overlay — the clock must
 * never fail the preview, because it is not print data.
 */
export function resolveClockOverlay(input: {
  readonly enabled: boolean;
  readonly placement: ClockOverlayPlacement | null | undefined;
  readonly imageSrc: string | null | undefined;
  readonly nowMs: number;
}): ClockOverlayState {
  const hidden: ClockOverlayState = { view: { kind: "hidden" }, placement: null };
  if (!input.enabled) return hidden;

  const placement = input.placement;
  if (placement === null || placement === undefined) return hidden;
  if (!inClosedRange(placement.xPercent, 0, 100)) return hidden;
  if (!inClosedRange(placement.yPercent, 0, 100)) return hidden;
  if (!isFiniteNumber(placement.sizePercent)) return hidden;
  if (placement.sizePercent <= 0 || placement.sizePercent > 100) return hidden;

  const snapshot: ClockOverlayPlacement = {
    xPercent: placement.xPercent,
    yPercent: placement.yPercent,
    sizePercent: placement.sizePercent,
  };

  const src = input.imageSrc;
  if (typeof src === "string" && src.length > 0) {
    // a photo of the real clock: it does not tick, so no timer is ever scheduled for it
    return { view: { kind: "image", src }, placement: snapshot };
  }

  const label = formatClockLabel(input.nowMs);
  if (label === null) return hidden;
  return { view: { kind: "text", label }, placement: snapshot };
}

export interface ClockTicker {
  /**
   * Start (or restart) ticking. Any previously scheduled tick is cancelled first, so at most one
   * timer is ever alive. `false` means nothing was scheduled — a ticker is only needed by the text
   * placeholder, never by a custom image.
   */
  start(needsTicking: boolean): boolean;
  /** Cancel whatever is pending. Safe to call repeatedly. */
  stop(): void;
  /** Permanently stop; a late callback after this can never fire. */
  dispose(): void;
  /** Test/diagnostic view: how many timers this ticker currently holds (0 or 1). */
  activeTimers(): number;
}

/**
 * A minute-boundary ticker with exactly one live timer.
 *
 * The first tick lands on the next minute boundary and the following ones a full minute apart, so
 * the displayed `HH:MM` changes as soon as the wall clock does without ever polling per second.
 * A callback scheduled by a session that has since stopped is dropped by the generation guard, so a
 * pending timer from a previous template can never repaint the new one.
 */
export function createClockTicker(ports: ClockPorts, onTick: () => void): ClockTicker {
  let generation = 0;
  let handle: number | null = null;
  let disposed = false;

  const cancel = (): void => {
    const pending = handle;
    handle = null;
    if (pending === null) return;
    try {
      ports.clearTimer(pending);
    } catch {
      // a hostile port must not break teardown
    }
  };

  const schedule = (delayMs: number): void => {
    const captured = generation;
    try {
      handle = ports.setTimer(() => {
        // stale: this session ended (or another began) after the timer was scheduled
        if (disposed || captured !== generation) return;
        handle = null;
        try {
          onTick();
        } catch {
          // a throwing subscriber must not leave the ticker without a next tick
        }
        if (disposed || captured !== generation) return;
        schedule(MINUTE_MS);
      }, delayMs);
    } catch {
      handle = null;
    }
  };

  return {
    start: (needsTicking: boolean): boolean => {
      generation += 1; // any in-flight callback is now stale
      cancel();
      if (disposed || !needsTicking) return false;
      let nowMs: number;
      try {
        nowMs = ports.now();
      } catch {
        return false;
      }
      schedule(msUntilNextMinute(nowMs));
      return handle !== null;
    },
    stop: (): void => {
      generation += 1;
      cancel();
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      generation += 1;
      cancel();
    },
    activeTimers: (): number => (handle === null ? 0 : 1),
  };
}
