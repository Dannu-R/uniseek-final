// §7 — class rank.
//
// One universal curve on the student's percentile (rank / class size). Dropped
// (null → renormalise, §9) when the school doesn't rank. Only the 0.78 and 0.60
// anchors are grounded (they reuse the test P50/P25 anchors); the rest are chosen.

import { interpolate } from "./piecewise";

const RANK_ANCHORS: [number, number][] = [
  [0.0, 1.0],
  [0.01, 0.95],
  [0.05, 0.87],
  [0.1, 0.78],
  [0.25, 0.6],
  [0.5, 0.35],
  [1.0, 0.0],
];

export interface RankResult {
  score: number | null; // null => dropped
  dropped: boolean;
}

export function rankScore(
  rank: number | null | undefined,
  size: number | null | undefined,
  schoolDoesNotRank: boolean,
): RankResult {
  if (schoolDoesNotRank || rank == null || size == null || size <= 0) {
    return { score: null, dropped: true };
  }
  const percentile = rank / size; // rank 1 = top => low percentile => high score
  return { score: interpolate(percentile, RANK_ANCHORS), dropped: false };
}
