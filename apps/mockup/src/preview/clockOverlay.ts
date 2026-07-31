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

/**
 * The operator's clock placement, in percent of the MAT rect — the same rect the legacy overlay
 * measured against (`IX + x/100*IW`, `IY + y/100*IH`, `min(IW,IH) * size/100`, where IX/IY/IW/IH are
 * the mat). It is NOT a percent of the whole preview box.
 */
export interface ClockOverlayPlacement {
  readonly xPercent: number;
  readonly yPercent: number;
  readonly sizePercent: number;
}

/**
 * The frame's logical canvas plus the band thickness, so the mat rect can be derived with the SAME
 * arithmetic the plan adapter uses (`band = max(1, round(width * borderPercent / 100))`).
 */
export interface ClockCanvasGeometry {
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly bandPx: number;
}

/** Where to put the overlay, as CSS percentages of the whole canvas box. */
export interface ClockOverlayCss {
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
}

/**
 * The operator's custom clock photo. `declared` and `src` are SEPARATE on purpose: a template that
 * declares a clock image but whose source cannot be resolved (or whose `<img>` fails to load) must
 * HIDE the overlay, not silently fall back to the `HH:MM` text — showing a generic digital clock
 * where a specific hardware photo belongs would misrepresent the product.
 */
export interface ClockImageInput {
  readonly declared: boolean;
  readonly src: string | null;
  /** set once the browser reports the `<img>` failed. */
  readonly failed?: boolean;
}

export interface ClockOverlayState {
  readonly view: ClockOverlayView;
  readonly css: ClockOverlayCss | null;
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
 * Convert a mat-relative placement to CSS percentages of the whole canvas box.
 *
 * The mat rect is `{band, band, width - 2*band, height - 2*band}`, mirroring the plan adapter. The
 * overlay is a square whose side is `min(matWidth, matHeight) * sizePercent/100`, matching the
 * legacy `box = min(IW, IH) * size/100`, and it is centred on the resolved point.
 */
export function resolveClockCss(
  placement: ClockOverlayPlacement,
  canvas: ClockCanvasGeometry,
): ClockOverlayCss | null {
  const { logicalWidth, logicalHeight, bandPx } = canvas;
  if (!isFiniteNumber(logicalWidth) || logicalWidth <= 0) return null;
  if (!isFiniteNumber(logicalHeight) || logicalHeight <= 0) return null;
  if (!isFiniteNumber(bandPx) || bandPx < 0) return null;

  const matWidth = logicalWidth - 2 * bandPx;
  const matHeight = logicalHeight - 2 * bandPx;
  if (matWidth <= 0 || matHeight <= 0) return null;

  const centreX = bandPx + (placement.xPercent / 100) * matWidth;
  const centreY = bandPx + (placement.yPercent / 100) * matHeight;
  const sidePx = (Math.min(matWidth, matHeight) * placement.sizePercent) / 100;
  if (!isFiniteNumber(centreX) || !isFiniteNumber(centreY)) return null;
  if (!isFiniteNumber(sidePx) || sidePx <= 0) return null;

  return {
    leftPercent: (centreX / logicalWidth) * 100,
    topPercent: (centreY / logicalHeight) * 100,
    widthPercent: (sidePx / logicalWidth) * 100,
  };
}

/**
 * Resolve what to display. A missing or malformed placement, an unusable canvas, or a DECLARED but
 * unusable custom image all hide the overlay — the clock is not print data, so it must never fail
 * the preview, and it must never substitute a generic clock for a specific one.
 */
export function resolveClockOverlay(input: {
  readonly enabled: boolean;
  readonly placement: ClockOverlayPlacement | null | undefined;
  readonly canvas: ClockCanvasGeometry | null | undefined;
  readonly image: ClockImageInput;
  readonly nowMs: number;
}): ClockOverlayState {
  const hidden: ClockOverlayState = { view: { kind: "hidden" }, css: null };
  if (!input.enabled) return hidden;

  const placement = input.placement;
  if (placement === null || placement === undefined) return hidden;
  if (!inClosedRange(placement.xPercent, 0, 100)) return hidden;
  if (!inClosedRange(placement.yPercent, 0, 100)) return hidden;
  if (!isFiniteNumber(placement.sizePercent)) return hidden;
  if (placement.sizePercent <= 0 || placement.sizePercent > 100) return hidden;

  const canvas = input.canvas;
  if (canvas === null || canvas === undefined) return hidden;
  const css = resolveClockCss(
    {
      xPercent: placement.xPercent,
      yPercent: placement.yPercent,
      sizePercent: placement.sizePercent,
    },
    canvas,
  );
  if (css === null) return hidden;

  const image = input.image;
  if (image.declared) {
    // a hardware photo was authored: show it, or show NOTHING. The text clock is not a stand-in.
    if (image.failed === true) return hidden;
    if (typeof image.src !== "string" || image.src.length === 0) return hidden;
    return { view: { kind: "image", src: image.src }, css };
  }

  const label = formatClockLabel(input.nowMs);
  if (label === null) return hidden;
  return { view: { kind: "text", label }, css };
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
