// §1 — the six-tier system, keyed on published admit rate.
//
// Tiers set the four interior floors used by `piecewise` for the rigor and GPA
// sub-scores. Rates are FRACTIONS on 0..1 (matching the catalog + scoring math).

export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

// The four interior floors per tier (§1). Order doesn't matter — piecewise sorts.
export const TIER_FLOORS: Record<Tier, number[]> = {
  1: [0.724, 0.591, 0.435, 0.225],
  2: [0.784, 0.66, 0.517, 0.341],
  3: [0.841, 0.724, 0.591, 0.435],
  4: [0.896, 0.784, 0.66, 0.517],
  5: [0.949, 0.841, 0.724, 0.591],
  6: [0.955, 0.875, 0.775, 0.66], // C-prime, deliberately off-ladder
};

// Admit-rate cutoffs (§1): T1 >=65%, T2 43-65%, T3 28-43%, T4 18-28%, T5 12-18%, T6 <12%.
export function tierForAdmitRate(rate: number): Tier {
  if (rate >= 0.65) return 1;
  if (rate >= 0.43) return 2;
  if (rate >= 0.28) return 3;
  if (rate >= 0.18) return 4;
  if (rate >= 0.12) return 5;
  return 6;
}

export function floorsForAdmitRate(rate: number): number[] {
  return TIER_FLOORS[tierForAdmitRate(rate)];
}
