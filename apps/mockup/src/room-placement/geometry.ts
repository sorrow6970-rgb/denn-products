import { clientPointToLogical, type Rect, type Size } from "@denn/render";

export type RoomGeometryError =
  | "ROOM_INVALID_INPUT"
  | "ROOM_FRAME_TOO_LARGE"
  | "ROOM_POINT_OUTSIDE";
export type RoomGeometryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: RoomGeometryError };
export interface RoomPlacement {
  readonly u: number;
  readonly v: number;
  readonly widthRatio: number;
  readonly aspect: number;
}
export interface RoomPlacementGeometry {
  readonly backgroundRect: Rect;
  readonly frameRect: Rect;
  readonly placement: RoomPlacement;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error();
  return value;
}
function size(value: unknown): Size {
  const source = record(value);
  return {
    width: number(source.width, 1, 1_000_000),
    height: number(source.height, 1, 1_000_000),
  };
}
function scene(source: Record<string, unknown>) {
  const viewport = size(source.viewport);
  const background = size(source.background);
  const scale = Math.min(viewport.width / background.width, viewport.height / background.height);
  const width = background.width * scale;
  const height = background.height * scale;
  const rect = {
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height,
  };
  return { viewport, background, rect };
}
function failure(code: RoomGeometryError): {
  readonly ok: false;
  readonly code: RoomGeometryError;
} {
  return { ok: false, code };
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** App-local reference geometry, not physical centimetres or legacy room replay. */
export function computeRoomPlacement(input: unknown): RoomGeometryResult<RoomPlacementGeometry> {
  try {
    const source = record(input);
    const { background, rect } = scene(source);
    const raw = record(source.placement);
    const u = number(raw.u, 0, 1);
    const v = number(raw.v, 0, 1);
    const widthRatio = number(raw.widthRatio, 0.000001, 1);
    const aspect = number(raw.aspect, 0.000001, 1_000_000);
    const maxRatio = Math.min(1, (aspect * background.height) / background.width);
    if (widthRatio > maxRatio) return failure("ROOM_FRAME_TOO_LARGE");
    const halfWidth = widthRatio / 2;
    const halfHeight = (widthRatio * background.width) / aspect / background.height / 2;
    const appliedU = clamp(u, halfWidth, 1 - halfWidth);
    const appliedV = clamp(v, halfHeight, 1 - halfHeight);
    const width = widthRatio * rect.width;
    const height = width / aspect;
    return {
      ok: true,
      value: {
        backgroundRect: rect,
        frameRect: {
          x: rect.x + appliedU * rect.width - width / 2,
          y: rect.y + appliedV * rect.height - height / 2,
          width,
          height,
        },
        placement: { u: appliedU, v: appliedV, widthRatio, aspect },
      },
    };
  } catch {
    return failure("ROOM_INVALID_INPUT");
  }
}

/** Letterbox/outside points are refused, not silently snapped onto the room image. */
export function roomPointFromClient(input: unknown): RoomGeometryResult<{ u: number; v: number }> {
  try {
    const source = record(input);
    const { viewport, rect } = scene(source);
    const client = record(source.client);
    const clientRect = record(source.clientRect);
    const logical = clientPointToLogical({
      client: {
        x: number(client.x, -Number.MAX_VALUE, Number.MAX_VALUE),
        y: number(client.y, -Number.MAX_VALUE, Number.MAX_VALUE),
      },
      clientRect: {
        x: number(clientRect.x, -Number.MAX_VALUE, Number.MAX_VALUE),
        y: number(clientRect.y, -Number.MAX_VALUE, Number.MAX_VALUE),
        ...size(clientRect),
      },
      logicalSize: viewport,
    });
    if (!logical.ok) return failure("ROOM_INVALID_INPUT");
    const u = (logical.value.x - rect.x) / rect.width;
    const v = (logical.value.y - rect.y) / rect.height;
    if (!Number.isFinite(u) || !Number.isFinite(v)) return failure("ROOM_INVALID_INPUT");
    if (u < 0 || u > 1 || v < 0 || v > 1) return failure("ROOM_POINT_OUTSIDE");
    return { ok: true, value: { u, v } };
  } catch {
    return failure("ROOM_INVALID_INPUT");
  }
}
