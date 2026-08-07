import { describe, it, expect } from "vitest";
import { scoreCollege, rankColleges, buildList, type CollegeScore } from "./score";
import type { StudentInput, CollegeInput } from "./types";

function student(overrides: Partial<StudentInput> = {}): StudentInput {
  return {
    gpaUnweighted: 3.9,
    apCoursesTaken: 10,
    apCoursesOffered: 18,
    satSuperscore: 1500,
    actSuperscore: null,
    notSubmittingScores: false,
    classRank: 10,
    classSize: 400,
    schoolDoesNotRank: false,
    activities: [{ tier: 3 }, { tier: 2 }, { tier: 1 }],
    volunteerHoursPerYear: 40,
    budgetMaxNetPrice: 40000,
    inStateOnly: false,
    religiousPreference: "NO_PREFERENCE",
    preferences: {},
    ...overrides,
  };
}

function college(overrides: Partial<CollegeInput> = {}): CollegeInput {
  return {
    id: overrides.id ?? "c1",
    name: overrides.name ?? "Test U",
    admitRate: 0.5,
    usNewsRank: 40,
    archetype: "BALANCED",
    satP25: 1300,
    satP75: 1480,
    testBlind: false,
    offeredCips: ["11.0701"],
    majorProgram: null,
    facts: {},
    netPriceAvg: 15000,
    netPriceBands: {},
    religiousAffiliation: null,
    ...overrides,
  };
}

describe("scoreCollege orchestration", () => {
  it("keeps a college that passes all filters and labels a band", () => {
    const s = scoreCollege(student(), college({ admitRate: 0.85 }));
    expect(s.kept).toBe(true);
    expect(s.band).toBe("safety"); // easy school, strong student
    expect(s.finalScore).toBeGreaterThan(0);
  });

  it("removes a college over budget (§2 net_price)", () => {
    const s = scoreCollege(student({ budgetMaxNetPrice: 10000 }), college({ netPriceAvg: 25000 }));
    expect(s.kept).toBe(false);
    expect(s.removedBy).toContain("price");
  });

  it("applies the major offset: a low CS rate lowers odds vs the general run", () => {
    const c = college({ admitRate: 0.5, majorProgram: { cipCode: "11.0701", admitRate: 0.05, programRank: 5 } });
    const general = scoreCollege(student(), c); // no major
    const major = scoreCollege(student({ majorCip: "11.0701" }), c);
    expect(major.effectiveAdmitRate).toBe(0.05);
    expect(general.effectiveAdmitRate).toBe(0.5);
    expect(major.odds).toBeLessThan(general.odds);
  });

  it("flags a fallback when the major rate is unresearched", () => {
    const c = college({ majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 16 } });
    const s = scoreCollege(student({ majorCip: "11.0701" }), c);
    expect(s.effectiveAdmitRate).toBe(0.5); // falls back to overall
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(true);
  });
});

describe("rankColleges + build_list (§10c, §2.4)", () => {
  it("reports the blocking filter when nothing survives (§2.4)", () => {
    const colleges = [college({ id: "a", netPriceAvg: 30000 }), college({ id: "b", netPriceAvg: 40000 })];
    const r = rankColleges(student({ budgetMaxNetPrice: 5000 }), colleges);
    expect(r.empty).toBe(true);
    expect(r.blockingFilter).toBe("price");
  });

  it("enforces the 3/5/4 quota and reach→target→safety order", () => {
    const mk = (band: "reach" | "target" | "safety", final: number): CollegeScore =>
      ({ band, finalScore: final, quality: 0.5, odds: 0.5 } as CollegeScore);
    const kept = [
      ...Array.from({ length: 6 }, (_, i) => mk("reach", i)),
      ...Array.from({ length: 7 }, (_, i) => mk("target", i)),
      ...Array.from({ length: 6 }, (_, i) => mk("safety", i)),
    ];
    const list = buildList(kept);
    expect(list.filter((c) => c.band === "reach")).toHaveLength(3);
    expect(list.filter((c) => c.band === "target")).toHaveLength(5);
    expect(list.filter((c) => c.band === "safety")).toHaveLength(4);
    expect(list[0].band).toBe("reach");
    expect(list[list.length - 1].band).toBe("safety");
    // within a band, highest final_score first
    expect(list[0].finalScore).toBe(5);
  });
});
