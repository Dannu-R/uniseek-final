// §9 — factor weights and the academic_strength assembly.
//
// Weights come from the CDS C7 rows (Very Important 3 / Important 2 / Considered 1 /
// Not Considered 0). Each factor's weight is its value over the sum of the values of
// the factors STILL IN PLAY — dropped factors (absent rigor, no test, no rank) are
// removed BEFORE normalising.

export type Factor = "rigor" | "gpa" | "test" | "rank" | "ec" | "service";
export type WeightVector = Record<Factor, number>;

export type Archetype = "HOLISTIC" | "RIGOR_HEAVY" | "GPA_HEAVY" | "RANK_STATE" | "BALANCED";

// §9 archetype profiles. STOPGAP — assigned, not sourced (open item: real C7 vectors).
export const ARCHETYPE_WEIGHTS: Record<Archetype, WeightVector> = {
  HOLISTIC: { rigor: 3, gpa: 3, test: 2, rank: 0, ec: 3, service: 2 },
  RIGOR_HEAVY: { rigor: 3, gpa: 2, test: 2, rank: 2, ec: 1, service: 1 },
  GPA_HEAVY: { rigor: 2, gpa: 3, test: 2, rank: 1, ec: 1, service: 1 },
  RANK_STATE: { rigor: 2, gpa: 3, test: 2, rank: 3, ec: 2, service: 1 },
  BALANCED: { rigor: 2, gpa: 2, test: 2, rank: 1, ec: 2, service: 1 },
};

// Prefer real per-factor C7 ratings when the college has them; else the archetype.
export function weightVector(
  c7: Partial<WeightVector> | null | undefined,
  archetype: Archetype | null | undefined,
): WeightVector {
  const hasC7 = c7 && (["rigor", "gpa", "test", "rank", "ec", "service"] as Factor[]).every((f) => c7[f] != null);
  if (hasC7) return c7 as WeightVector;
  return ARCHETYPE_WEIGHTS[archetype ?? "BALANCED"];
}

// The academic_strength combiner: a weighted average over the factors in play.
// A sub-score of null/undefined means the factor was dropped — it is removed from
// BOTH the numerator and the denominator before the average.
export function academicStrength(
  subScores: Partial<Record<Factor, number | null>>,
  weights: WeightVector,
): { strength: number; usedFactors: Factor[]; effectiveWeights: Partial<WeightVector> } {
  let num = 0;
  let den = 0;
  const usedFactors: Factor[] = [];
  const effectiveWeights: Partial<WeightVector> = {};

  for (const f of ["rigor", "gpa", "test", "rank", "ec", "service"] as Factor[]) {
    const score = subScores[f];
    const w = weights[f];
    if (score == null || w == null || w === 0) continue;
    num += w * score;
    den += w;
    usedFactors.push(f);
    effectiveWeights[f] = w;
  }

  return { strength: den === 0 ? 0 : num / den, usedFactors, effectiveWeights };
}
