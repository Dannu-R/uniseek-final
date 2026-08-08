// §1 — the tier piecewise, and shared numeric helpers.
//
// Every academic sub-score is placed by `piecewise(rawValue, tierFloors)`: the raw
// 0..1 input is mapped through five segments (four interior floors + the shared
// endpoints 0 and 1) onto a 0..1 output. The floors come from the tier (§1 / tiers.ts).

export function clip(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

// Map `value` (0..1) through the tier floors onto 0..1.
// edges = [0, ...sorted(floors), 1]; each of the five segments spans 0.2 of the output.
export function piecewise(value: number, floors: number[]): number {
  const edges = [0, ...[...floors].sort((a, b) => a - b), 1];
  for (let i = 0; i < 5; i++) {
    if (value < edges[i + 1] || i === 4) {
      const frac = (value - edges[i]) / (edges[i + 1] - edges[i]);
      return 0.2 * i + clip(frac, 0, 1) * 0.2;
    }
  }
  return 1; // unreachable — the i === 4 branch always returns
}

// Piecewise-linear interpolation through sorted (x, y) anchors. Used by test scores
// (§5) and class rank (§7). Clamps to the endpoints outside the anchor range.
export function interpolate(x: number, points: [number, number][]): number {
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}
