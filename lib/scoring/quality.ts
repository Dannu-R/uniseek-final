// §10b — program quality.
//
// Logarithmic in rank. When the student names a major, `rank` is the PROGRAM's
// published rank; otherwise the institutional rank (§10b). Same map either way —
// only the rank source differs.

import { clip } from "./piecewise";

// rank 3 ≈ 1.0, 6 ≈ 0.90, 20 ≈ 0.73, 45 ≈ 0.61, 100 ≈ 0.50.
export function programQuality(rank: number): number {
  return clip(1.157 - 0.1425 * Math.log(rank), 0.45, 1.0);
}

// Pick the rank source: program rank in a major run, institutional rank otherwise.
export function qualityRank(
  institutionalRank: number,
  programRank: number | null | undefined,
  majorNamed: boolean,
): number {
  if (majorNamed && programRank != null) return programRank;
  return institutionalRank;
}
