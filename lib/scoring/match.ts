// §10 — the recommendation blend: ambition (a function of the student) and match_score.

import { clip, piecewise } from "./piecewise";
import { TIER_FLOORS } from "./tiers";
import { inverseCollegeBar } from "./odds";

export const A_MAX = 0.55;
export const A_MIN = 0.2;
export const AMBITION_CLAMP_RATE = 0.8;

// §10b reference strength: evaluated at a FIXED tier-3 reference with weights
// rigor 2 / gpa 2 / ec 2 / service 1 (no test, no rank). rigor + gpa go through the
// tier-3 piecewise; ec + service are used as-is. If rigor is absent, it drops and
// the remaining weights renormalise.
export function referenceStrength(
  effectiveVolume: number | null,
  gpaXValue: number,
  ecScoreValue: number,
  serviceScoreValue: number,
): number {
  const f = TIER_FLOORS[3];
  let num = 2 * piecewise(gpaXValue, f) + 2 * ecScoreValue + 1 * serviceScoreValue;
  let den = 5;
  if (effectiveVolume != null) {
    num += 2 * piecewise(effectiveVolume, f);
    den += 2;
  }
  return num / den;
}

// The admit rate at which this student is a coin flip — an ABSOLUTE, set-independent
// measure. Reuses college_bar inverted; introduces no new parameter.
export function reachableRate(refStrength: number): number {
  return inverseCollegeBar(refStrength);
}

// §10b ramp. Written as A_MAX − (A_MAX − A_MIN)·clip(rate/0.80, 0, 1) — equivalently
// 0.55 − 0.4375·min(rate, 0.80). NOT 0.55 − 0.4375·min(rate/0.80, 1), which would
// wrongly bottom out at 0.1125 instead of 0.20.
export function ambitionFromReachableRate(rate: number): number {
  return A_MAX - (A_MAX - A_MIN) * clip(rate / AMBITION_CLAMP_RATE, 0, 1);
}

// Convenience: full ambition from the reference sub-scores.
export function ambition(
  effectiveVolume: number | null,
  gpaXValue: number,
  ecScoreValue: number,
  serviceScoreValue: number,
): number {
  const ref = referenceStrength(effectiveVolume, gpaXValue, ecScoreValue, serviceScoreValue);
  return ambitionFromReachableRate(reachableRate(ref));
}

// §10. Additive blend (not scale-invariant): the student's absolute level enters
// the ranking. A low-ambition student weights odds; a high-ambition one weights
// quality.
export function matchScore(odds: number, quality: number, ambitionValue: number): number {
  return (1 - ambitionValue) * odds + ambitionValue * quality;
}
