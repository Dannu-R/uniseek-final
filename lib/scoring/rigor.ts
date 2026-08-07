// §2 — curriculum rigor.
//
// Volume blends the school-relative course ratio with an absolute course count,
// then is scaled by a GPA multiplier before the tier piecewise places it.

import { clip, piecewise } from "./piecewise";

export const ABS_RIGOR_REF = 10; // absolute count that reads as a strong load
export const ABS_WEIGHT = 0.4; // how much the absolute count offsets the pure ratio
export const SMALL_CATALOG = 6; // below this many offered, rigor is low-confidence
export const SCHEDULE_CEILING = 14; // above this, the catalog stops mattering
export const CURVE_EXPONENT = 0.6; // front-loads early courses

// §2a. Returns null when `offered === 0` — that is ABSENT (drop the factor and
// renormalise, §9), NOT a perfect ratio.
export function rigorVolume(taken: number, offered: number): number | null {
  if (offered === 0) return null;
  const effCeiling = Math.min(offered, SCHEDULE_CEILING);
  const ratio = clip(taken / effCeiling, 0, 1) ** CURVE_EXPONENT;
  const absComp = clip(taken / ABS_RIGOR_REF, 0, 1) ** CURVE_EXPONENT;
  let vol = ratio ** (1 - ABS_WEIGHT) * absComp ** ABS_WEIGHT; // geometric blend
  if (offered > SCHEDULE_CEILING) vol *= 0.99;
  return vol;
}

// §2b. Eight evenly-spaced levels from 1.00 at GPA 3.70 down to 0.70 at GPA 3.30.
// Each band takes the value at its lower edge. Uses the trend-adjusted GPA (§4).
export function rigorGpaMultiplier(adjustedGpa: number): number {
  if (adjustedGpa >= 3.7) return 1.0;
  if (adjustedGpa >= 3.6429) return 0.9571;
  if (adjustedGpa >= 3.5857) return 0.9143;
  if (adjustedGpa >= 3.5286) return 0.8714;
  if (adjustedGpa >= 3.4714) return 0.8286;
  if (adjustedGpa >= 3.4143) return 0.7857;
  if (adjustedGpa >= 3.3571) return 0.7429;
  return 0.7;
}

export interface RigorResult {
  score: number | null; // null when absent (offered === 0)
  effectiveVolume: number | null;
  absent: boolean;
  lowConfidence: boolean; // offered < SMALL_CATALOG
}

// Full rigor sub-score: volume × GPA multiplier, then the tier piecewise.
export function rigorScore(
  taken: number,
  offered: number,
  adjustedGpa: number,
  floors: number[],
): RigorResult {
  const vol = rigorVolume(taken, offered);
  if (vol === null) {
    return { score: null, effectiveVolume: null, absent: true, lowConfidence: true };
  }
  const effectiveVolume = vol * rigorGpaMultiplier(adjustedGpa);
  return {
    score: piecewise(effectiveVolume, floors),
    effectiveVolume,
    absent: false,
    lowConfidence: offered < SMALL_CATALOG,
  };
}
