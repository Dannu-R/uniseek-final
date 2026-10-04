// §10b — program quality.
//
// Logarithmic in rank. When the student names a major, `rank` is the PROGRAM's
// published rank; otherwise the institutional rank (§10b). Same map either way —
// only the rank source differs.

import { clip } from "./piecewise";
import { RANKING_LISTS, type InstitutionalList, type RankingLists } from "./rankingLists";

// rank 3 ≈ 1.0, 6 ≈ 0.90, 20 ≈ 0.73, 45 ≈ 0.61, 100 ≈ 0.50.
export function programQuality(rank: number): number {
  return clip(1.157 - 0.1425 * Math.log(rank), 0.45, 1.0);
}

export type QualityBasis =
  | "program" // the college's rank on the major's list (or an individually researched one)
  | "program-unranked" // list collected, college not on it → size + 1
  | "fallback-program" // Finance → the college's Business rank
  | "institutional" // overall US News rank (National Universities scale)
  | "institutional-lac-converted"; // Liberal Arts rank mapped onto the national scale

export interface QualityRankInput {
  majorCip: string | null | undefined;
  institutionalRank: number;
  institutionalList: InstitutionalList | null | undefined;
  programRank: number | null | undefined; // rank for majorCip
  fallbackProgramRank: number | null | undefined; // rank for the list's fallbackCip
}

export interface QualityRankResult {
  rank: number;
  basis: QualityBasis;
}

// R3: institutional rank, with Liberal Arts ranks converted by percentile of their list.
function institutionalQualityRank(rank: number, list: InstitutionalList | null | undefined, lists: RankingLists): QualityRankResult {
  if (list === "NATIONAL_LIBERAL_ARTS") {
    const lac = lists.institutional.NATIONAL_LIBERAL_ARTS.size;
    const nat = lists.institutional.NATIONAL_UNIVERSITIES.size;
    return { rank: Math.max(1, Math.round((rank / lac) * nat)), basis: "institutional-lac-converted" };
  }
  return { rank, basis: "institutional" };
}

// §10b rank selection (spec rules R1, R1-finance, R2, R3).
export function qualityRank(input: QualityRankInput, lists: RankingLists = RANKING_LISTS): QualityRankResult {
  const list = input.majorCip ? lists.programs[input.majorCip] : undefined;

  if (!list) {
    // R2 (major named, list not collected) or R3 (no major).
    if (input.majorCip && input.programRank != null) return { rank: input.programRank, basis: "program" };
    return institutionalQualityRank(input.institutionalRank, input.institutionalList, lists);
  }

  // R1: the major's list has been collected.
  if (input.programRank != null) return { rank: input.programRank, basis: "program" };

  if (list.fallbackCip) {
    // R1-finance: short specialty list → fall back to the broader list.
    const fallback = lists.programs[list.fallbackCip];
    if (!fallback) return institutionalQualityRank(input.institutionalRank, input.institutionalList, lists);
    if (input.fallbackProgramRank != null) return { rank: input.fallbackProgramRank, basis: "fallback-program" };
    return { rank: fallback.size + 1, basis: "program-unranked" };
  }

  return { rank: list.size + 1, basis: "program-unranked" };
}
