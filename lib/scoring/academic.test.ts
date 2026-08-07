import { describe, it, expect } from "vitest";
import { scoreAgainstBand, bestTestValue, actToSat, testScore } from "./test";
import { rankScore } from "./rank";
import { ecBase, ecScore, serviceScore, fieldPrepMultiplier, tierValueSum } from "./ec";
import { academicStrength, weightVector, ARCHETYPE_WEIGHTS } from "./weights";

describe("test scores (§5)", () => {
  // Georgia Tech-style band, P75 above the national anchor.
  const p25 = 1370;
  const p75 = 1530; // P50 midpoint = 1450

  it("hits the P25/P50/P75 anchors 0.60 / 0.78 / 0.90", () => {
    expect(scoreAgainstBand(p25, p25, p75)).toBeCloseTo(0.6, 6);
    expect(scoreAgainstBand(1450, p25, p75)).toBeCloseTo(0.78, 6);
    expect(scoreAgainstBand(p75, p25, p75)).toBeCloseTo(0.9, 6);
  });

  it("tops out at 1.00 for a perfect score", () => {
    expect(scoreAgainstBand(1600, p25, p75)).toBeCloseTo(1.0, 6);
  });

  it("inserts the 0.94 national anchor only when P75 < 1500", () => {
    // Tennessee-style band: p25=1180, p75=1360 -> national anchor (1500,0.94) added.
    expect(scoreAgainstBand(1500, 1180, 1360)).toBeCloseTo(0.94, 6);
  });

  it("falls off fast below P25 and bottoms at the SAT floor", () => {
    expect(scoreAgainstBand(400, p25, p75)).toBeCloseTo(0, 6);
    expect(scoreAgainstBand(1000, p25, p75)).toBeLessThan(0.6);
  });

  it("takes the max of SAT and concordanced ACT", () => {
    expect(actToSat(34)).toBe(1500);
    expect(bestTestValue(1450, 34)).toBe(1500); // ACT 34 -> 1500 beats SAT 1450
    expect(bestTestValue(1550, 30)).toBe(1550); // SAT wins
    expect(bestTestValue(null, null)).toBeNull();
  });

  it("drops (renormalise) when not submitting or test-blind", () => {
    expect(testScore(1500, null, true, p25, p75, false).dropped).toBe(true);
    expect(testScore(1500, null, false, p25, p75, true).reason).toBe("test-blind");
    expect(testScore(null, null, false, p25, p75, false).reason).toBe("no-scores");
  });
});

describe("class rank (§7)", () => {
  it("hits the curve anchors", () => {
    expect(rankScore(1, 100000, false).score).toBeCloseTo(1.0, 4); // ~top
    expect(rankScore(10, 100, false).score).toBeCloseTo(0.78, 4); // 0.10 percentile
    expect(rankScore(25, 100, false).score).toBeCloseTo(0.6, 4); // 0.25
    expect(rankScore(50, 100, false).score).toBeCloseTo(0.35, 4); // 0.50
  });

  it("drops when the school doesn't rank", () => {
    expect(rankScore(null, null, true).dropped).toBe(true);
  });
});

describe("extracurriculars (§8)", () => {
  it("reproduces the base reference points", () => {
    expect(ecBase(0)).toBeCloseTo(0.15, 4); // no activities
    expect(ecBase(tierValueSum([1, 1, 1]))).toBeCloseTo(0.43, 2); // three tier-1s
    expect(ecBase(tierValueSum([2, 2, 1, 1]))).toBeCloseTo(0.6, 2); // two T2 + two T1
    expect(ecBase(tierValueSum([3, 3]))).toBeCloseTo(0.87, 2); // two tier-3s
    expect(ecBase(tierValueSum([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]))).toBeCloseTo(0.94, 2); // ten T2
    expect(ecBase(tierValueSum([4]))).toBeCloseTo(1.0, 4); // one tier-4 saturates
    expect(ecBase(tierValueSum([3, 3, 3]))).toBeCloseTo(1.0, 4); // three tier-3s
  });

  it("applies field prep only in a major run", () => {
    const tiers = [2, 2, 1] as (1 | 2 | 3 | 4)[];
    expect(ecScore(tiers)).toBe(ecBase(tierValueSum(tiers))); // general run: no multiplier
    expect(ecScore(tiers, 0)).toBeLessThan(ecScore(tiers)); // 0 relevant pts -> ×0.80
    expect(fieldPrepMultiplier(0)).toBeCloseTo(0.8, 4);
    expect(fieldPrepMultiplier(4)).toBeCloseTo(1.0, 4);
    expect(fieldPrepMultiplier(48)).toBeCloseTo(1.2, 4);
    expect(fieldPrepMultiplier(200)).toBeCloseTo(1.2, 4); // clamps
  });

  it("community service: hard 0, jump to 0.45, ramp to 1.00", () => {
    expect(serviceScore(0)).toBe(0);
    expect(serviceScore(29)).toBeCloseTo(0.73, 4);
    expect(serviceScore(35)).toBeCloseTo(0.84, 4);
    expect(serviceScore(100)).toBeCloseTo(1.0, 4);
    expect(serviceScore(500)).toBeCloseTo(1.0, 4); // clamps
  });
});

describe("academic_strength assembly (§9)", () => {
  const w = ARCHETYPE_WEIGHTS.BALANCED;

  it("is a weighted average over factors in play", () => {
    const { strength, usedFactors } = academicStrength(
      { rigor: 0.8, gpa: 0.9, test: 0.7, rank: 0.6, ec: 0.5, service: 0.4 },
      w,
    );
    // (2*.8 + 2*.9 + 2*.7 + 1*.6 + 2*.5 + 1*.4) / (2+2+2+1+2+1) = 6.8/10 = 0.68
    expect(strength).toBeCloseTo(0.68, 6);
    expect(usedFactors).toHaveLength(6);
  });

  it("drops null factors from BOTH numerator and denominator", () => {
    const { strength, usedFactors } = academicStrength(
      { rigor: null, gpa: 0.9, test: null, rank: null, ec: 0.5, service: 0.4 },
      w,
    );
    // only gpa(2), ec(2), service(1) remain: (2*.9+2*.5+1*.4)/5 = 3.2/5 = 0.64
    expect(strength).toBeCloseTo(0.64, 6);
    expect(usedFactors).toEqual(["gpa", "ec", "service"]);
  });

  it("holistic profile drops rank (weight 0)", () => {
    const { usedFactors } = academicStrength(
      { rigor: 0.8, gpa: 0.9, test: 0.7, rank: 0.6, ec: 0.5, service: 0.4 },
      ARCHETYPE_WEIGHTS.HOLISTIC,
    );
    expect(usedFactors).not.toContain("rank"); // holistic rank weight = 0
  });

  it("weightVector prefers C7 ratings when complete, else archetype", () => {
    const c7 = { rigor: 3, gpa: 3, test: 3, rank: 3, ec: 3, service: 3 };
    expect(weightVector(c7, "BALANCED")).toEqual(c7);
    expect(weightVector({ rigor: 3 }, "GPA_HEAVY")).toEqual(ARCHETYPE_WEIGHTS.GPA_HEAVY);
    expect(weightVector(null, null)).toEqual(ARCHETYPE_WEIGHTS.BALANCED);
  });
});
