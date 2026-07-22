// Framework-independent shared probe: proves the app -> shared boundary is used
// through the package export (workspace:*), not a relative src path.

export interface ProbePoint {
  readonly x: number;
  readonly y: number;
}

export function addPoints(a: ProbePoint, b: ProbePoint): ProbePoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function describe(point: ProbePoint): string {
  return `point(${point.x}, ${point.y})`;
}
