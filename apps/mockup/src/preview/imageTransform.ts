// Framework-free image pan/zoom editing state (spec 029). No React, no DOM, no Canvas, no timer:
// the composer owns one of these values per photo slot and the drag controller only receives already
// converted logical points.
//
// Contract (spec 029 §2, decisions 2026-07-30):
//  - `scale` is DIMENSIONLESS and lives in [1, 5]. A percentage exists only in the UI.
//  - `x`/`y` are NORMALIZED pan in [-1, 1]: the fraction of the axis' `maxPan` at the CURRENT scale.
//    An axis whose `maxPan` is 0 is pinned to 0. Logical px are derived at plan time only
//    (`normalized * maxPan`), so a resize keeps the composition instead of moving the photo.
//  - Minimum scale 1 + the cover clamp mean the clip can never show empty space (D-7).
//  - Reading a caller value NEVER repairs it: a non-finite/out-of-range/hostile input is rejected
//    (null), it is not clamped into a "close enough" value and no default is invented.

import type { Point } from "@denn/render";

/** Normalized editing transform. `x`/`y` are fractions of `maxPan`, NOT logical px. */
export interface NormalizedTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** Logical-px transform, the shape the spec 025 adapter expects. */
export interface LogicalTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** Cover is always preserved: no scale below 1 exists, so no empty space can appear in the clip. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
/** One multiplicative step, shared by the wheel and the two zoom buttons (`*1.1`, `/1.1`). */
export const ZOOM_STEP_FACTOR = 1.1;
/** Keyboard pan step in NORMALIZED units; Shift uses the coarse step. */
export const PAN_KEY_STEP = 0.02;
export const PAN_KEY_STEP_COARSE = 0.1;
/** Slider bounds in percent — the UI unit only. */
export const SCALE_PERCENT_MIN = 100;
export const SCALE_PERCENT_MAX = 500;

export const IDENTITY_TRANSFORM: NormalizedTransform = { scale: MIN_SCALE, x: 0, y: 0 };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

const inRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;

/**
 * Read a caller-supplied transform EXACTLY once per field, inside an exception boundary, and only
 * accept it when every field is already valid. A hostile getter, a Proxy trap or a revoked Proxy
 * yields `null` instead of throwing, and a drifting getter cannot change what was validated because
 * the returned object is a plain snapshot.
 */
export function readNormalizedTransform(value: unknown): NormalizedTransform | null {
  try {
    if (value === null || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const scale = record.scale;
    const x = record.x;
    const y = record.y;
    if (!isFiniteNumber(scale) || !isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    if (!inRange(scale, MIN_SCALE, MAX_SCALE)) return null;
    if (!inRange(x, -1, 1) || !inRange(y, -1, 1)) return null;
    return { scale, x, y };
  } catch {
    return null;
  }
}

/** Scale as the UI percentage (integer). */
export const scaleToPercent = (scale: number): number => Math.round(scale * 100);

/** Slider percent → scale. A non-finite value is not a scale; out-of-range percent is clamped
 *  because the slider's own range is the contract (100..500), not caller data. */
export function scaleFromPercent(percent: number): number | null {
  if (!isFiniteNumber(percent)) return null;
  const bounded = clamp(percent, SCALE_PERCENT_MIN, SCALE_PERCENT_MAX);
  return clamp(bounded / 100, MIN_SCALE, MAX_SCALE);
}

/** Multiplicative zoom shared by wheel and buttons. Pan stays normalized, so the framing is kept. */
export function zoomTransform(
  transform: NormalizedTransform,
  direction: "in" | "out",
): NormalizedTransform {
  const raw =
    direction === "in" ? transform.scale * ZOOM_STEP_FACTOR : transform.scale / ZOOM_STEP_FACTOR;
  const scale = clamp(raw, MIN_SCALE, MAX_SCALE);
  if (scale === transform.scale) return transform;
  return { scale, x: transform.x, y: transform.y };
}

export function withScale(transform: NormalizedTransform, scale: number): NormalizedTransform {
  const next = clamp(scale, MIN_SCALE, MAX_SCALE);
  if (next === transform.scale) return transform;
  return { scale: next, x: transform.x, y: transform.y };
}

/** Keyboard/step pan. `dx`/`dy` are normalized deltas; both axes are limited to [-1, 1]. */
export function panTransform(
  transform: NormalizedTransform,
  dx: number,
  dy: number,
): NormalizedTransform {
  if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return transform;
  const x = clamp(transform.x + dx, -1, 1);
  const y = clamp(transform.y + dy, -1, 1);
  if (x === transform.x && y === transform.y) return transform;
  return { scale: transform.scale, x, y };
}

/** The single `원래대로` action. */
export const resetTransform = (): NormalizedTransform => IDENTITY_TRANSFORM;

/**
 * Normalized → logical px, applied ONLY when the plan is built. An axis with `maxPan === 0` (the
 * image exactly covers the zone on that axis) is pinned to 0 rather than scaled by nothing.
 */
export function toLogicalTransform(
  transform: NormalizedTransform,
  maxPan: Point,
): LogicalTransform | null {
  if (!isFiniteNumber(maxPan.x) || !isFiniteNumber(maxPan.y)) return null;
  if (maxPan.x < 0 || maxPan.y < 0) return null;
  const x = maxPan.x === 0 ? 0 : transform.x * maxPan.x;
  const y = maxPan.y === 0 ? 0 : transform.y * maxPan.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { scale: transform.scale, x, y };
}

/**
 * Absolute drag: the normalized pan is the START transform plus the logical delta from the START
 * point, expressed in `maxPan` units. Deltas are never accumulated, so a dropped move frame cannot
 * drift the photo, and an axis with `maxPan === 0` stays pinned.
 */
export function dragTransform(
  start: NormalizedTransform,
  startPoint: Point,
  currentPoint: Point,
  maxPan: Point,
): NormalizedTransform {
  if (!isFiniteNumber(currentPoint.x) || !isFiniteNumber(currentPoint.y)) return start;
  const dx = maxPan.x === 0 ? 0 : (currentPoint.x - startPoint.x) / maxPan.x;
  const dy = maxPan.y === 0 ? 0 : (currentPoint.y - startPoint.y) / maxPan.y;
  return panTransform(start, dx, dy);
}

/** Max absolute logical pan per axis, derived from the drawn size vs the clip size. */
export function maxPanFromRects(
  clip: { readonly width: number; readonly height: number },
  draw: { readonly width: number; readonly height: number },
): Point | null {
  if (!isFiniteNumber(clip.width) || !isFiniteNumber(clip.height)) return null;
  if (!isFiniteNumber(draw.width) || !isFiniteNumber(draw.height)) return null;
  const x = Math.abs(draw.width - clip.width) / 2;
  const y = Math.abs(draw.height - clip.height) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

// --- pointer drag session ----------------------------------------------------

export type DragEndReason =
  | "pointerup"
  | "pointercancel"
  | "lostpointercapture"
  | "selection"
  | "unmount";

export interface DragSessionPorts {
  /** schedule one frame; the controller never uses a timer. */
  readonly requestFrame: (callback: () => void) => number;
  readonly cancelFrame: (handle: number) => void;
  /** called at most ONCE per animation frame with the newest transform. */
  readonly commit: (transform: NormalizedTransform) => void;
}

export interface DragBeginInput {
  readonly pointerId: number;
  readonly point: Point;
  readonly transform: NormalizedTransform;
  readonly maxPan: Point;
}

export interface DragController {
  /** false = rejected (disposed, already dragging, or unusable input). */
  begin(input: DragBeginInput): boolean;
  /** a move from another pointer, after the end, or after dispose is ignored. */
  move(pointerId: number, point: Point): void;
  end(pointerId: number, reason: DragEndReason): void;
  /** selection change / unmount: end whatever is active regardless of pointer id. */
  abort(reason: DragEndReason): void;
  isDragging(): boolean;
  activePointerId(): number | null;
  dispose(): void;
}

interface DragState {
  readonly generation: number;
  readonly pointerId: number;
  readonly startPoint: Point;
  readonly startTransform: NormalizedTransform;
  readonly maxPan: Point;
}

/**
 * One drag at a time, generation-guarded. A frame scheduled by a session that has already ended
 * (pointerup, cancel, lost capture, selection change, unmount) never commits — the generation it
 * captured no longer matches — so a late event cannot move a photo that is no longer being edited.
 */
export function createDragController(ports: DragSessionPorts): DragController {
  let generation = 0;
  let state: DragState | null = null;
  let disposed = false;
  let frame: number | null = null;
  let pending: NormalizedTransform | null = null;

  /** Drop the pending transform (always) and cancel its frame (when one is scheduled). */
  const cancelFrame = (): void => {
    const handle = frame;
    frame = null;
    pending = null;
    if (handle === null) return;
    try {
      ports.cancelFrame(handle);
    } catch {
      // a hostile port must not break the session teardown
    }
  };

  const schedule = (current: DragState): void => {
    if (frame !== null) return; // already merged into the pending frame
    const captured = current.generation;
    try {
      frame = ports.requestFrame(() => {
        // Stale frame: the session ended (or another began) after this frame was scheduled. It
        // returns WITHOUT consuming `pending` — a session that ends always cancels its own frame, so
        // the pending value here belongs to the newer session and its own frame must still see it.
        if (disposed || state === null || state.generation !== captured) return;
        frame = null;
        const next = pending;
        pending = null;
        if (next === null) return;
        try {
          ports.commit(next);
        } catch {
          // a throwing subscriber must not leave the session half-ended
        }
      });
    } catch {
      frame = null;
      pending = null;
    }
  };

  return {
    begin: (input: DragBeginInput): boolean => {
      if (disposed || state !== null) return false;
      if (!Number.isFinite(input.pointerId)) return false;
      if (!isFiniteNumber(input.point.x) || !isFiniteNumber(input.point.y)) return false;
      if (!isFiniteNumber(input.maxPan.x) || !isFiniteNumber(input.maxPan.y)) return false;
      if (input.maxPan.x < 0 || input.maxPan.y < 0) return false;
      const transform = readNormalizedTransform(input.transform);
      if (transform === null) return false;
      generation += 1;
      state = {
        generation,
        pointerId: input.pointerId,
        startPoint: { x: input.point.x, y: input.point.y },
        startTransform: transform,
        maxPan: { x: input.maxPan.x, y: input.maxPan.y },
      };
      return true;
    },
    move: (pointerId: number, point: Point): void => {
      if (disposed || state === null || state.pointerId !== pointerId) return;
      const current = state;
      pending = dragTransform(current.startTransform, current.startPoint, point, current.maxPan);
      schedule(current);
    },
    /**
     * A normal release FLUSHES the pending transform once (보완 라운드 1): the last `move` before the
     * `pointerup` may still be waiting for its animation frame, and dropping it would leave the photo
     * one frame behind where the customer let go. Every other ending — `pointercancel`,
     * `lostpointercapture`, a selection change and unmount/dispose — DISCARDS the pending value.
     * The flush happens after the state is cleared, so the late frame still commits nothing and the
     * value can never be committed twice or consumed by the next session.
     */
    end: (pointerId: number, reason: DragEndReason): void => {
      if (disposed || state === null || state.pointerId !== pointerId) return;
      const flush = reason === "pointerup" ? pending : null;
      generation += 1;
      state = null;
      cancelFrame(); // also clears `pending`, so nothing else can commit this value
      if (flush === null) return;
      try {
        ports.commit(flush);
      } catch {
        // a throwing subscriber must not leave the session half-ended
      }
    },
    abort: (_reason: DragEndReason): void => {
      if (disposed || state === null) return;
      generation += 1;
      state = null;
      cancelFrame();
    },
    isDragging: (): boolean => state !== null,
    activePointerId: (): number | null => (state === null ? null : state.pointerId),
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      generation += 1;
      state = null;
      cancelFrame();
    },
  };
}
