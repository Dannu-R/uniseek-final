import { describe, it, expect } from "vitest";
import { collegeBar, admissionOdds, inverseCollegeBar, labelOf, sigmoid } from "./odds";
import { programQuality, qualityRank } from "./quality";
import {
  referenceStrength,
  reachableRate,
  ambitionFromReachableRate,
  ambition,
  matchScore,
} from "./match";

describe("college_bar (§10a / §13d hand-confirmed anchors)", () => {
  it("reproduces the three fixed bars", () => {
    expect(collegeBar(0.0365)).toBeCloseTo(1.409, 2); // Harvard
    expect(collegeBar(0.164)).toBeCloseTo(0.856, 2); // Michigan
    expect(collegeBar(0.884)).toBeCloseTo(-0.086, 2); // ASU
  });

  it("is monotonic: more selective => higher bar", () => {
    expect(collegeBar(0.04)).toBeGreaterThan(collegeBar(0.16));
    expect(collegeBar(0.16)).toBeGreaterThan(collegeBar(0.5));
  });

  it("clamps below the 0.36% turnover", () => {
    // Both at/under the turnover map to the same clamped bar (no fall-off).
    expect(collegeBar(0.002)).toBe(collegeBar(0.001));
  });
});

describe("admission_odds (§10a)", () => {
  it("is exactly 50% when strength equals the bar", () => {
    const rate = 0.164;
    expect(admissionOdds(collegeBar(rate), rate)).toBeCloseTo(0.5, 6);
  });

  it("Harvard reads ~10% for a maxed academic profile (strength ~0.97, §13d)", () => {
    expect(admissionOdds(0.9696, 0.0365)).toBeCloseTo(0.1, 2);
  });

  it("K=5 steepness table", () => {
    const rate = 0.164;
    const bar = collegeBar(rate);
    expect(admissionOdds(bar + 0.1, rate)).toBeCloseTo(0.62, 2);
    expect(admissionOdds(bar - 0.1, rate)).toBeCloseTo(0.38, 2);
  });

  it("inverseCollegeBar round-trips collegeBar", () => {
    for (const rate of [0.0365, 0.12, 0.33, 0.6]) {
      expect(inverseCollegeBar(collegeBar(rate))).toBeCloseTo(rate, 4);
    }
  });

  it("labels bands at 0.70 / 0.30", () => {
    expect(labelOf(0.8)).toBe("safety");
    expect(labelOf(0.5)).toBe("target");
    expect(labelOf(0.2)).toBe("reach");
    expect(labelOf(0.7)).toBe("safety");
    expect(labelOf(0.3)).toBe("target");
  });
});

describe("program_quality (§10b)", () => {
  it("hits the log-map reference points", () => {
    expect(programQuality(3)).toBeCloseTo(1.0, 2);
    expect(programQuality(20)).toBeCloseTo(0.73, 2);
    expect(programQuality(45)).toBeCloseTo(0.61, 2);
    expect(programQuality(100)).toBeCloseTo(0.5, 2);
  });

  it("clamps to [0.45, 1.0]", () => {
    expect(programQuality(1)).toBe(1.0);
    expect(programQuality(1000)).toBe(0.45);
  });

  it("picks program rank in a major run, institutional otherwise", () => {
    expect(qualityRank(32, 5, true)).toBe(5); // Georgia Tech CS
    expect(qualityRank(32, 5, false)).toBe(32); // general run
    expect(qualityRank(32, null, true)).toBe(32); // major run, no program rank
  });
});

describe("ambition ramp (§10b)", () => {
  it("bottoms at A_MIN=0.20 for a reachable rate >= 0.80 (NOT 0.1125)", () => {
    expect(ambitionFromReachableRate(0.8)).toBeCloseTo(0.2, 6);
    expect(ambitionFromReachableRate(0.95)).toBeCloseTo(0.2, 6);
  });

  it("tops at A_MAX=0.55 for reachable rate 0", () => {
    expect(ambitionFromReachableRate(0)).toBeCloseTo(0.55, 6);
  });

  it("is linear in reachable rate between the ends", () => {
    expect(ambitionFromReachableRate(0.4)).toBeCloseTo(0.375, 6); // halfway
  });

  it("a strong reference profile is more ambitious than a weak one", () => {
    const strong = ambition(0.95, 1.0, 0.95, 1.0);
    const weak = ambition(0.3, 0.4, 0.3, 0.0);
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(0.55);
    expect(weak).toBeGreaterThanOrEqual(0.2);
  });
});

describe("match_score (§10)", () => {
  it("blends odds and quality by ambition", () => {
    expect(matchScore(0.8, 0.5, 0.2)).toBeCloseTo(0.8 * 0.8 + 0.2 * 0.5, 6); // 0.74
    expect(matchScore(0.8, 0.5, 0.0)).toBe(0.8); // pure odds
    expect(matchScore(0.8, 0.5, 1.0)).toBe(0.5); // pure quality
  });
});
