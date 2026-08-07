// §3 — unweighted GPA, and §4 — the grade-trend adjustment that feeds it.
//
// The trend adjustment is applied to the raw GPA FIRST (§4), and the adjusted GPA
// then drives both this sub-score and the rigor multiplier (§2b) — the accepted
// "double count" (§3).

import { clip, piecewise } from "./piecewise";

// §4. A senior-year slump penalty. Fires only when grade 12 is strictly the lowest
// of 10/11/12 AND the drop exceeds 7% of the senior GPA. Ninth grade is unused.
// Yearly GPAs are optional — if any is missing the penalty cannot fire.
export function trendPenaltyFires(g10?: number | null, g11?: number | null, g12?: number | null): boolean {
  if (g10 == null || g11 == null || g12 == null) return false;
  if (!(g12 < g10 && g12 < g11)) return false;
  return Math.min(g10, g11) - g12 > 0.07 * g12;
}

export const TREND_PENALTY = 0.075;

// §4. The trend-adjusted GPA used everywhere downstream.
export function adjustedGpa(
  unweighted: number,
  g10?: number | null,
  g11?: number | null,
  g12?: number | null,
): number {
  return trendPenaltyFires(g10, g11, g12) ? unweighted - TREND_PENALTY : unweighted;
}

// §3. Raw GPA axis: 2.00 -> 0, 3.00 -> 0.50, 4.00 -> 1.00.
export function gpaX(gpa: number): number {
  return clip((gpa - 2.0) / 2.0, 0, 1);
}

// §3. Full GPA sub-score: gpaX through the tier piecewise. Expects the ADJUSTED GPA.
export function gpaScore(adjustedGpaValue: number, floors: number[]): number {
  return piecewise(gpaX(adjustedGpaValue), floors);
}
