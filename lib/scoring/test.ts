// §5 — test scores.
//
// Scored against the college's own C9 percentiles (SAT scale). The student's best
// SAT and ACT are reduced to one value via `max` (ACT concordanced to SAT first).
// The factor is DROPPED (null → renormalise, §9) when the student submits nothing
// or the college is test-blind.

import { clip, interpolate } from "./piecewise";

export const SAT_FLOOR = 400;
export const SAT_MAX = 1600;
export const SAT_NATIONAL = 1500;
export const BELOW_P25_EXPONENT = 1.5; // back-loads: below P25 falls off fast

// Official ACT composite -> SAT concordance (midpoints). Interpolated between rungs.
const ACT_SAT: [number, number][] = [
  [36, 1590], [35, 1540], [34, 1500], [33, 1460], [32, 1430], [31, 1400],
  [30, 1370], [29, 1340], [28, 1310], [27, 1280], [26, 1240], [25, 1210],
  [24, 1180], [23, 1140], [22, 1110], [21, 1080], [20, 1040], [19, 1010],
  [18, 970], [17, 930], [16, 890], [15, 850], [14, 800], [13, 760],
  [12, 710], [11, 670], [10, 630], [9, 590],
];

export function actToSat(act: number): number {
  return Math.round(interpolate(act, ACT_SAT));
}

// The single value scored: the max of SAT and concordanced ACT. Null if neither given.
export function bestTestValue(sat?: number | null, act?: number | null): number | null {
  const vals: number[] = [];
  if (sat != null) vals.push(sat);
  if (act != null) vals.push(actToSat(act));
  return vals.length ? Math.max(...vals) : null;
}

// §5 core: score a value against a college's SAT P25/P75. P50 is the midpoint —
// CDS does not publish it, so it is an INTERPOLATION and must be labelled as such.
export function scoreAgainstBand(value: number, p25: number, p75: number): number {
  if (value <= p25) {
    return 0.6 * clip((value - SAT_FLOOR) / (p25 - SAT_FLOOR), 0, 1) ** BELOW_P25_EXPONENT;
  }
  const p50 = (p25 + p75) / 2; // interpolated midpoint
  const points: [number, number][] = [
    [p25, 0.6],
    [p50, 0.78],
    [p75, 0.9],
  ];
  if (p75 < SAT_NATIONAL) points.push([SAT_NATIONAL, 0.94]);
  points.push([SAT_MAX, 1.0]);
  return interpolate(value, points);
}

export interface TestResult {
  score: number | null; // null => dropped + renormalise
  dropped: boolean;
  reason?: "not-submitting" | "test-blind" | "no-scores" | "no-college-band";
  p50Interpolated: boolean; // always true when scored — flag it wherever reported
}

export function testScore(
  sat: number | null | undefined,
  act: number | null | undefined,
  notSubmitting: boolean,
  p25: number | null | undefined,
  p75: number | null | undefined,
  testBlind: boolean | null | undefined,
): TestResult {
  if (notSubmitting) return { score: null, dropped: true, reason: "not-submitting", p50Interpolated: false };
  if (testBlind) return { score: null, dropped: true, reason: "test-blind", p50Interpolated: false };
  const value = bestTestValue(sat, act);
  if (value == null) return { score: null, dropped: true, reason: "no-scores", p50Interpolated: false };
  if (p25 == null || p75 == null) {
    return { score: null, dropped: true, reason: "no-college-band", p50Interpolated: false };
  }
  return { score: scoreAgainstBand(value, p25, p75), dropped: false, p50Interpolated: true };
}
