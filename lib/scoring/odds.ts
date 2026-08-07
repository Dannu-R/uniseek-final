// §10a — admission odds.
//
// college_bar is linear in log admit rate (selectivity is multiplicative). The odds
// are a logistic in (strength − bar). The bar is UNBOUNDED — both ends need bars
// outside [0,1], which the old power form couldn't express.

import { clip } from "./piecewise";

export const ODDS_K = 5.0;
export const D = 0; // cubic term — UNSET, held at 0 (see OPEN_ITEMS.md #1)

// The quadratic turns over at L = 5.625 (admit rate 0.36%); below that the bar
// starts falling again, which is wrong. Clamp L to the valid region.
const L_TURNOVER = 5.625;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// bar(L) = −0.1683 + 0.6750·L − 0.0600·L² + D·L³, with L = −log(rate).
export function collegeBar(admitRate: number): number {
  const L = Math.min(-Math.log(admitRate), L_TURNOVER);
  return -0.1683 + 0.675 * L - 0.06 * L * L + D * L * L * L;
}

export function admissionOdds(strength: number, admitRate: number): number {
  return sigmoid(ODDS_K * (strength - collegeBar(admitRate)));
}

// Invert bar → the admit rate at which a given reference strength is a 50/50.
// Used by the ambition ramp (§10b). Solves the quadratic (D=0) for the valid
// branch (smaller L, below the turnover) and returns exp(−L).
export function inverseCollegeBar(bar: number): number {
  // 0.0600·L² − 0.6750·L + (0.1683 + bar) = 0
  const disc = 0.675 * 0.675 - 4 * 0.06 * (0.1683 + bar);
  if (disc <= 0) return Math.exp(-L_TURNOVER); // bar at/above the peak → most selective
  const L = (0.675 - Math.sqrt(disc)) / (2 * 0.06); // smaller root = valid branch
  return Math.exp(-clip(L, 0, L_TURNOVER));
}

export type Band = "safety" | "target" | "reach";

// §10a bands — symmetric around the 50/50 point. No `far` band; nothing is
// excluded by odds.
export function labelOf(odds: number): Band {
  if (odds >= 0.7) return "safety";
  if (odds >= 0.3) return "target";
  return "reach";
}
