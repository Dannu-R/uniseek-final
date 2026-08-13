import type { CSSProperties } from "react";

// Two parametric doodles used across the marketing page: a hand-drawn squiggle and a
// little trend-line graph. Both are generated rather than hand-authored paths, so every
// instance can get its own wave count / phase / point pattern and never draws the exact
// same mark twice — and both taper: thickest at the high points (a wave's crest, a
// graph's peak value), thinnest at the crossings, the way a real brush stroke or a felt
// marker actually lays ink down.

type SquiggleProps = {
  className?: string;
  width?: number;
  height?: number;
  waves?: number;
  phase?: number;
  baseThickness?: number;
  peakThickness?: number;
  color?: string;
};

// A filled ribbon following a sine wave, widening toward each crest/trough and pinching
// thin at the zero-crossings — the "thicker at the higher extremes" brush-stroke look a
// constant stroke-width path can't produce.
export function Squiggle({
  className,
  width = 120,
  height = 32,
  waves = 2.2,
  phase = 0,
  baseThickness = 3,
  peakThickness = 14,
  color,
}: SquiggleProps) {
  const samples = 48;
  const midY = height / 2;
  const amp = Math.max(1, midY - peakThickness / 2 - 1);
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * width;
    const theta = phase + t * waves * Math.PI * 2;
    const y = midY + Math.sin(theta) * amp;
    // Thin at the crossings (sin = 0), thick at the crests (|sin| = 1). |sin| is smooth
    // right where it matters — at the crest, so the bulge is a round taper rather than a
    // corner — and only has a cusp at the crossing, where the ribbon is already pinched
    // to a point, so it reads as a clean brush tip rather than a visible kink.
    const spread = Math.abs(Math.sin(theta));
    const w = baseThickness + (peakThickness - baseThickness) * spread;
    top.push([x, y - w / 2]);
    bottom.push([x, y + w / 2]);
  }

  const d =
    `M ${top.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} ` +
    `L ${bottom
      .slice()
      .reverse()
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" L ")} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`squiggle ${className || ""}`}
      style={color ? ({ "--squiggle-color": color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

type Point = { x: number; y: number };

type SparklineProps = {
  className?: string;
  width?: number;
  height?: number;
  points: Point[];
  thickness?: number;
  peakDotRadius?: number;
  color?: string;
  showAxis?: boolean;
};

// A little trend line — a single smooth stroke of steady weight through every point
// (a real line, not a shape that swells and pinches along its own length), with the dot
// at each point sized to its value so the highest points still read as the "biggest",
// the way the squiggle's crests do, without deforming the line itself into a shape that
// stops reading as a line.
export function Sparkline({
  className,
  width = 96,
  height = 76,
  points,
  thickness = 4,
  peakDotRadius = 7,
  color,
  showAxis = false,
}: SparklineProps) {
  const padT = peakDotRadius + 2;
  const padB = showAxis ? 10 : 4;
  const plotH = height - padT - padB;
  const pts = points.map((p) => ({ x: p.x * width, y: padT + plotH * (1 - p.y) }));
  const ys = points.map((p) => p.y);
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys);
  const dotR = (y: number) => {
    const t = maxY === minY ? 1 : (y - minY) / (maxY - minY);
    return 2.6 + (peakDotRadius - 2.6) * t;
  };

  // Catmull-Rom → cubic Bézier: passes exactly through every point with a smooth
  // tangent, so the line curves the way an actual trend line does instead of kinking
  // hard at each vertex the way straight segments do.
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`spark ${className || ""}`}
      style={color ? ({ "--spark-color": color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {showAxis && (
        <path
          className="spark__axis"
          d={`M ${padT * 0.6},${padT * 0.4} V ${height - padB} H ${width - 2}`}
        />
      )}
      <path d={d} fill="none" strokeWidth={thickness} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={pts[i].x} cy={pts[i].y} r={dotR(p.y)} />
      ))}
    </svg>
  );
}
