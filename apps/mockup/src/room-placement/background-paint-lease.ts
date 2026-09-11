import type { BackgroundSizeLease } from "./promise-work";

type Suffix = "INVALID_INPUT" | "RELEASED" | "DISPOSED" | "BUSY" | "FAILED";
export type BackgroundPaintResult = Readonly<
  { ok: true } | { ok: false; code: `ROOM_BACKGROUND_PAINT_${Suffix}` }
>;
export interface BackgroundPaintLease extends BackgroundSizeLease {
  paint(request: unknown): BackgroundPaintResult;
}
export interface BackgroundPaintRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type BackgroundCopy = (
  target: object,
  crop: BackgroundPaintRect,
  destination: BackgroundPaintRect,
) => void;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const failure = (suffix: Suffix): BackgroundPaintResult =>
  Object.freeze({ ok: false, code: `ROOM_BACKGROUND_PAINT_${suffix}` });

/** Internal trusted work capabilities, not a public target/Canvas authentication boundary. */
export function createBackgroundPaintLease(
  size: { width: number; height: number },
  copy: BackgroundCopy,
  isLive: () => boolean,
  isDisposed: () => boolean,
  stop: () => void,
): BackgroundPaintLease {
  let painting = false;
  const terminal = (): Suffix | null => (isDisposed() ? "DISPOSED" : !isLive() ? "RELEASED" : null);
  const guard = () => {
    if (terminal()) throw new Error();
  };
  const field = (value: Record<string, unknown>, key: string) => {
    const result = value[key];
    guard();
    return result;
  };
  return Object.freeze({
    width: size.width,
    height: size.height,
    release: stop,
    paint(request: unknown): BackgroundPaintResult {
      const ended = terminal();
      if (ended) return failure(ended);
      if (painting) return failure("BUSY");
      painting = true;
      let copying = false;
      try {
        if (!record(request)) throw new Error();
        const target = field(request, "target"),
          rect = field(request, "rect");
        if (!record(target) || !record(rect)) throw new Error();
        const x = field(rect, "x"),
          y = field(rect, "y"),
          w = field(rect, "width"),
          h = field(rect, "height");
        if (!finite(x) || !finite(y) || !positive(w) || !positive(h)) throw new Error();
        const sx = w / size.width,
          sy = h / size.height,
          height = size.height * sx;
        if (
          !positive(sx) ||
          !positive(sy) ||
          !positive(height) ||
          Math.abs(sx - sy) / Math.max(sx, sy) > 1e-9
        )
          throw new Error();
        guard();
        copying = true;
        copy(
          target,
          { x: 0, y: 0, width: size.width, height: size.height },
          { x, y, width: w, height },
        );
        guard();
        return Object.freeze({ ok: true });
      } catch {
        const reason = terminal();
        if (copying) stop();
        return failure(
          isDisposed() ? "DISPOSED" : (reason ?? (copying ? "FAILED" : "INVALID_INPUT")),
        );
      } finally {
        painting = false;
      }
    },
  });
}
