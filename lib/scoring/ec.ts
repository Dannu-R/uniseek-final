// §8 — extracurriculars + community service, and §6c — field prep.
//
// EC tiers are defined by rarity, so their values are convex (ratio 4): 1/4/16/48.
// The scoring module CONSUMES an assigned tier per activity — see OPEN_ITEMS.md #3.

import { clip, interpolate } from "./piecewise";

export type EcTier = 1 | 2 | 3 | 4;
export const TIER_VALUES: Record<EcTier, number> = { 1: 1, 2: 4, 3: 16, 4: 48 };

// Used when the AI tier classifier is unavailable (no API key) or errors — a neutral
// middle tier so ECs still contribute rather than being dropped.
export const FALLBACK_EC_TIER: EcTier = 2;
export const EC_CAP = 48;
export const EC_BASE_FLOOR = 0.15;
export const EC_BASE_EXPONENT = 0.4; // front-loads: one elite activity saturates

// §8 base: convex in the tier-value sum, capped at 48.
export function ecBase(tierValueSum: number): number {
  return EC_BASE_FLOOR + 0.85 * clip(tierValueSum / EC_CAP, 0, 1) ** EC_BASE_EXPONENT;
}

// §6c field-prep multiplier, driven by ABSOLUTE major-relevant tier points (no
// denominator, so breadth is neutral). Fires only when a major is named.
// NOTE (OPEN_ITEMS): the 0.80-1.20 range is invented and can reorder students
// against their own EC quality — flagged as the model's most dangerous dial.
const FIELD_PREP_ANCHORS: [number, number][] = [
  [0, 0.8],
  [1, 0.9],
  [4, 1.0],
  [16, 1.1],
  [48, 1.2],
];

export function fieldPrepMultiplier(majorRelevantPoints: number): number {
  return interpolate(majorRelevantPoints, FIELD_PREP_ANCHORS);
}

// Sum tier values across activities. `tiers` are the assigned tiers (1-4).
export function tierValueSum(tiers: EcTier[]): number {
  return tiers.reduce((s, t) => s + TIER_VALUES[t], 0);
}

// §8 full EC sub-score. Field prep applies only when majorRelevantPoints is given
// (i.e. a major run); otherwise ec_score == base.
export function ecScore(
  tiers: EcTier[],
  majorRelevantPoints?: number | null,
): number {
  const base = ecBase(tierValueSum(tiers));
  if (majorRelevantPoints == null) return base;
  return clip(base * fieldPrepMultiplier(majorRelevantPoints), 0, 1);
}

// Community service — a separate factor with its own C7 weight (§8).
// 0 hrs is a hard 0; any positive amount jumps to 0.45 and ramps to 1.00 at 100.
const SERVICE_ANCHORS: [number, number][] = [
  [0, 0.45],
  [29, 0.73],
  [35, 0.84],
  [100, 1.0],
];

export function serviceScore(hoursPerYear: number): number {
  if (hoursPerYear <= 0) return 0;
  return interpolate(hoursPerYear, SERVICE_ANCHORS);
}
