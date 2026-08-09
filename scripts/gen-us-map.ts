// One-off generator for app/dashboard/usStatePaths.ts.
//
// Downloads a public-domain US states GeoJSON (lat/lon polygons), projects it with
// the standard Albers USA composite (lower 48 conic equal-area, with Alaska and
// Hawaii inset), simplifies the rings, and writes a static module of SVG paths
// keyed by two-letter postal code. Run with:  npx tsx scripts/gen-us-map.ts
//
// Nothing at runtime depends on the network — the generated file is checked in.

import { writeFileSync } from "node:fs";

const SOURCE = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";
const OUT = "app/dashboard/usStatePaths.ts";

// Output canvas — matches d3.geoAlbersUsa()'s default fit.
const WIDTH = 960;
const HEIGHT = 500;
const SCALE = 1070;
const TX = 480;
const TY = 250;

const SIMPLIFY_TOLERANCE = 0.6; // projected px
const MIN_RING_AREA = 2.0; // projected px² — drops specks, keeps real islands

const POSTAL: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY",
};

type Pt = [number, number];

// ---- projection ---------------------------------------------------------

const rad = (d: number) => (d * Math.PI) / 180;

// Albers conic equal-area raw projection for the given standard parallels.
function conicEqualAreaRaw(p0: number, p1: number) {
  const sy0 = Math.sin(p0);
  const n = (sy0 + Math.sin(p1)) / 2;
  const c = 1 + sy0 * (2 * n - sy0);
  const r0 = Math.sqrt(c) / n;
  return (lambda: number, phi: number): Pt => {
    const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
    const x = lambda * n;
    return [r * Math.sin(x), r0 - r * Math.cos(x)];
  };
}

// One member of the composite: a raw projection + rotation + center, scaled and
// translated the way d3 does (y flipped, center pinned to the translate point).
function makeProjection(opts: {
  parallels: [number, number];
  rotate: number; // degrees added to longitude
  center: [number, number]; // in the rotated frame
  scale: number;
  translate: [number, number];
}) {
  const raw = conicEqualAreaRaw(rad(opts.parallels[0]), rad(opts.parallels[1]));
  const k = opts.scale;
  const [cx, cy] = raw(rad(opts.center[0]), rad(opts.center[1]));
  const dx = opts.translate[0] - k * cx;
  const dy = opts.translate[1] + k * cy;
  return ([lon, lat]: Pt): Pt => {
    // Rotate longitude into the projection's frame, normalised to [-180, 180].
    let l = lon + opts.rotate;
    while (l > 180) l -= 360;
    while (l < -180) l += 360;
    const [px, py] = raw(rad(l), rad(lat));
    return [k * px + dx, dy - k * py];
  };
}

const lower48 = makeProjection({
  parallels: [29.5, 45.5], rotate: 96, center: [-0.6, 38.7],
  scale: SCALE, translate: [TX, TY],
});
const alaska = makeProjection({
  parallels: [55, 65], rotate: 154, center: [-2, 58.5],
  scale: SCALE * 0.35, translate: [TX - 0.307 * SCALE, TY + 0.201 * SCALE],
});
const hawaii = makeProjection({
  parallels: [8, 18], rotate: 157, center: [-3, 19.9],
  scale: SCALE, translate: [TX - 0.205 * SCALE, TY + 0.212 * SCALE],
});

function projectorFor(code: string) {
  if (code === "AK") return alaska;
  if (code === "HI") return hawaii;
  return lower48;
}

// ---- geometry helpers ---------------------------------------------------

function ringArea(ring: Pt[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

// Perpendicular distance from p to segment ab, squared.
function segDist2(p: Pt, a: Pt, b: Pt): number {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = b;
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function douglasPeucker(pts: Pt[], tol2: number): Pt[] {
  if (pts.length <= 2) return pts;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist2(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol2) return [pts[0], pts[pts.length - 1]];
  const left = douglasPeucker(pts.slice(0, idx + 1), tol2);
  const right = douglasPeucker(pts.slice(idx), tol2);
  return left.slice(0, -1).concat(right);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function ringToPath(ring: Pt[]): string {
  const parts: string[] = [];
  ring.forEach(([x, y], i) => parts.push(`${i === 0 ? "M" : "L"}${r1(x)} ${r1(y)}`));
  return parts.join("") + "Z";
}

// ---- main ---------------------------------------------------------------

interface Feature {
  properties: { name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const geo = (await res.json()) as { features: Feature[] };

  const paths: Record<string, string> = {};
  const labels: Record<string, [number, number]> = {};

  for (const f of geo.features) {
    const code = POSTAL[f.properties.name];
    if (!code) continue; // skips Puerto Rico and anything else out of scope
    const project = projectorFor(code);

    // Normalise Polygon | MultiPolygon into a flat list of rings.
    const rings: number[][][] =
      f.geometry.type === "Polygon"
        ? (f.geometry.coordinates as number[][][])
        : (f.geometry.coordinates as number[][][][]).flat();

    const kept: Pt[][] = [];
    for (const raw of rings) {
      // Alaska's far Aleutians cross the antimeridian into positive longitude and
      // would smear across the inset — drop those slivers.
      if (code === "AK" && raw.some(([lon]) => lon > 0)) continue;
      const projected = raw.map(([lon, lat]) => project([lon, lat] as Pt));
      const simplified = douglasPeucker(projected, SIMPLIFY_TOLERANCE ** 2);
      if (simplified.length < 4) continue;
      if (ringArea(simplified) < MIN_RING_AREA) continue;
      kept.push(simplified);
    }
    if (kept.length === 0) continue;

    paths[code] = kept.map(ringToPath).join("");

    // Label anchor = centroid of the largest ring (used for the selected-state pin).
    const biggest = kept.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a));
    const cx = biggest.reduce((s, p) => s + p[0], 0) / biggest.length;
    const cy = biggest.reduce((s, p) => s + p[1], 0) / biggest.length;
    labels[code] = [r1(cx), r1(cy)];
  }

  const codes = Object.keys(paths).sort();
  const missing = Object.values(POSTAL).filter((c) => !paths[c]);
  if (missing.length) console.warn("WARNING — no geometry for:", missing.join(", "));

  // Crop the viewBox to the geometry (plus a hairline for stroke width) so the map
  // fills its container instead of floating in the projection's default canvas.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of Object.values(paths)) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
    }
  }
  const pad = 3;
  const vb = [r1(minX - pad), r1(minY - pad), r1(maxX - minX + pad * 2), r1(maxY - minY + pad * 2)];

  const body = `// GENERATED FILE — do not edit by hand. Regenerate with: npx tsx scripts/gen-us-map.ts
//
// US state outlines projected to Albers USA (Alaska and Hawaii inset), from the
// public-domain GeoJSON at ${SOURCE}.

export const US_MAP_VIEWBOX = "${vb.join(" ")}";

// Two-letter postal code → SVG path data (one or more closed rings).
export const US_STATE_PATHS: Record<string, string> = {
${codes.map((c) => `  ${c}: ${JSON.stringify(paths[c])},`).join("\n")}
};

// Centroid of each state's largest landmass, for anchoring labels or markers.
export const US_STATE_CENTROIDS: Record<string, [number, number]> = {
${codes.map((c) => `  ${c}: [${labels[c][0]}, ${labels[c][1]}],`).join("\n")}
};
`;

  writeFileSync(OUT, body);
  const kb = Math.round(body.length / 102.4) / 10;
  console.log(`wrote ${OUT} — ${codes.length} states, ${kb} kB`);
}

main();
