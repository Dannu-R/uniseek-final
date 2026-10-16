import { describe, it, expect } from "vitest";
import { scoreCollege, rankColleges, buildList, type CollegeScore } from "./score";
import type { StudentInput, CollegeInput } from "./types";
import { RANKING_LISTS, loadedRankingLists, type RankingLists } from "./rankingLists";
import { mapCollege, type CollegeWithPrograms } from "./mapCollege";

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
    requiredState: null,
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

describe("program quality basis (§10b)", () => {
  it("converts a Liberal Arts rank onto the national scale in a general run", () => {
    const lac = scoreCollege(student(), college({ usNewsRank: 3, usNewsRankList: "NATIONAL_LIBERAL_ARTS" }));
    const nat = scoreCollege(student(), college({ usNewsRank: 3, usNewsRankList: "NATIONAL_UNIVERSITIES" }));
    expect(lac.quality).toBeLessThan(nat.quality); // LAC #3 ≈ national #6
    // LAC #3 -> round(3 / 206 * 428) = 6; depends on the live institutional list sizes.
    const expected = Math.round((3 / RANKING_LISTS.institutional.NATIONAL_LIBERAL_ARTS.size) * RANKING_LISTS.institutional.NATIONAL_UNIVERSITIES.size);
    expect(lac.flags).toContain(`quality rank ${expected} (institutional-lac-converted)`);
    expect(nat.flags).toContain("quality rank 3 (institutional)");
  });

  it("keeps an individually researched program rank when the list isn't collected (R2)", () => {
    const noLists: RankingLists = { ...RANKING_LISTS, programs: {} };
    const c = college({ majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 5 } });
    const s = scoreCollege(student({ majorCip: "11.0701" }), c, noLists);
    expect(s.flags).toContain("quality rank 5 (program)");
  });

  it("scores Finance through mapCollege: unranked Finance falls back to the Business rank", () => {
    const row = {
      id: "c1", name: "Test U", admitRate: 0.5, usNewsRank: 40, usNewsRankList: null,
      c7Rigor: null, c7Gpa: null, c7Test: null, c7Rank: null, c7Ec: null, c7Service: null,
      programs: [
        { cipCode: "52.0201", admitRate: null, programRank: 12, directAdmit: false },
        { cipCode: "52.0801", admitRate: null, programRank: null, directAdmit: false },
      ],
    } as unknown as CollegeWithPrograms;
    const lists: RankingLists = {
      institutional: RANKING_LISTS.institutional,
      programs: {
        "52.0801": { source: "USNEWS", listKey: "f", edition: "2027", size: 46, url: "", fallbackCip: "52.0201" },
        "52.0201": { source: "USNEWS", listKey: "b", edition: "2027", size: 535, url: "" },
      },
    };
    const s = scoreCollege(student({ majorCip: "52.0801" }), mapCollege(row, "52.0801", lists), lists);
    expect(s.flags).toContain("quality rank 12 (fallback-program)");
  });

  it("falls back to the institutional rank when the major's list isn't loaded (loadedRankingLists)", () => {
    const c = college({ majorProgram: { cipCode: "11.0701", admitRate: null, programRank: null } });
    const loaded = loadedRankingLists([]);
    const withLoaded = scoreCollege(student({ majorCip: "11.0701" }), c, loaded);
    expect(withLoaded.flags).toContain("quality rank 40 (institutional)");
    const live = scoreCollege(student({ majorCip: "11.0701" }), c); // default: CS registered
    expect(live.flags).toContain(`quality rank ${RANKING_LISTS.programs["11.0701"].size + 1} (program-unranked)`);
  });
});

describe("loadedRankingLists", () => {
  it("keeps only the loaded CIPs and leaves institutional alone", () => {
    const l = loadedRankingLists(["11.0701", "99.9999"]);
    expect(Object.keys(l.programs)).toEqual(["11.0701"]);
    expect(l.institutional).toBe(RANKING_LISTS.institutional);
    expect(Object.keys(RANKING_LISTS.programs).length).toBeGreaterThan(1); // input untouched
  });
});

describe("effective admit rate by source (§6a)", () => {
  const cs = (p: Partial<NonNullable<CollegeInput["majorProgram"]>>) => ({ cipCode: "11.0701", admitRate: null, ...p });

  it("uses a researched major rate and labels its class", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ majorProgram: cs({ admitRate: 0.07, admitRateSourceClass: "PUBLISHED" }) }));
    expect(s.effectiveAdmitRate).toBe(0.07);
    expect(s.flags).toContain("effective admit rate 0.07 (P)");
  });

  it("treats a UNIVERSITY-class program as the overall rate, without the unresearched flag", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ admitRate: 0.5, majorProgram: cs({ admitRateSourceClass: "UNIVERSITY" }) }));
    expect(s.effectiveAdmitRate).toBe(0.5);
    expect(s.flags).toContain("effective admit rate 0.5 (U)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(false);
  });

  it("uses the overall rate as U for any major when the college admits to the university", () => {
    const s = scoreCollege(student({ majorCip: "26.0101" }), college({ admitRate: 0.3, admissionUnit: "UNIVERSITY", offeredCips: ["26.0101"], majorProgram: { cipCode: "26.0101", admitRate: null } }));
    expect(s.effectiveAdmitRate).toBe(0.3);
    expect(s.flags).toContain("effective admit rate 0.3 (U)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(false);
  });

  it("falls back to the overall rate, flagged, when a major-admitting college has no researched rate", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ admitRate: 0.4, admissionUnit: "MAJOR", majorProgram: cs({}) }));
    expect(s.effectiveAdmitRate).toBe(0.4);
    expect(s.flags).toContain("effective admit rate 0.4 (fallback)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(true);
  });

  it("adds no admit-rate flag when no major is named", () => {
    const s = scoreCollege(student(), college({ admissionUnit: "UNIVERSITY" }));
    expect(s.flags.some((f) => f.startsWith("effective admit rate"))).toBe(false);
  });
});

describe("residency (§15)", () => {
  const cs = (p: Partial<NonNullable<CollegeInput["majorProgram"]>>) => ({ cipCode: "11.0701", admitRate: null, ...p });
  // Georgia Tech's published split (§15).
  const gt = (o: Partial<CollegeInput> = {}) =>
    college({ state: "GA", admitRate: 0.1274, inStateAdmitRate: 0.293, outOfStateAdmitRate: 0.0893, ...o });

  it("uses the in-state rate for a resident", () => {
    const s = scoreCollege(student({ homeState: "GA" }), gt());
    expect(s.effectiveAdmitRate).toBe(0.293);
    expect(s.flags).toContain("effective admit rate 0.293 (overall, in-state)");
  });

  it("uses the out-of-state rate for a non-resident", () => {
    const s = scoreCollege(student({ homeState: "TX" }), gt());
    expect(s.effectiveAdmitRate).toBe(0.0893);
    expect(s.flags).toContain("effective admit rate 0.0893 (overall, out-of-state)");
  });

  it("applies the split to a university-admit major run", () => {
    const s = scoreCollege(
      student({ homeState: "TX", majorCip: "11.0701" }),
      gt({ admissionUnit: "UNIVERSITY", majorProgram: cs({ admitRateSourceClass: "UNIVERSITY" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(0.0893);
    expect(s.flags).toContain("effective admit rate 0.0893 (U, out-of-state)");
  });

  it("scales a major rate by split ÷ overall when no by-residency major rate exists", () => {
    const s = scoreCollege(
      student({ homeState: "TX", majorCip: "11.0701" }),
      gt({ majorProgram: cs({ admitRate: 0.1128, admitRateSourceClass: "DERIVED" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(0.0791); // 0.1128 × 0.0893 / 0.1274
    expect(s.flags).toContain("effective admit rate 0.0791 (D, out-of-state via ratio)");
  });

  it("clamps a scaled major rate at 1", () => {
    const s = scoreCollege(
      student({ homeState: "GA", majorCip: "11.0701" }),
      gt({ majorProgram: cs({ admitRate: 0.9, admitRateSourceClass: "PUBLISHED" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(1);
  });

  it("prefers a published by-residency major rate over the ratio", () => {
    // UW: the university-wide split is nearly flat, the CS split is not (spec D6).
    const uw = college({
      state: "WA", admitRate: 0.4175, inStateAdmitRate: 0.4574, outOfStateAdmitRate: 0.4216,
      majorProgram: cs({ admitRate: 0.1473, admitRateSourceClass: "DERIVED", inStateAdmitRate: 0.4091, outOfStateAdmitRate: 0.0811 }),
    });
    const s = scoreCollege(student({ homeState: "TX", majorCip: "11.0701" }), uw);
    expect(s.effectiveAdmitRate).toBe(0.0811);
    expect(s.flags).toContain("effective admit rate 0.0811 (D, out-of-state)");
  });

  it("keeps the base rate, flagged, when the college publishes no split", () => {
    const s = scoreCollege(student({ homeState: "TX" }), college({ state: "MI", admitRate: 0.164 }));
    expect(s.effectiveAdmitRate).toBe(0.164);
    expect(s.flags).toContain("effective admit rate 0.164 (overall, residency n/a)");
    expect(s.flags).toContain("residency split unknown — rate not residency-adjusted");
  });

  it("skips residency at UC campuses", () => {
    // UC Davis: nonresidents are admitted at a higher rate, but from a stronger pool.
    const davis = college({ name: "University of California-Davis", state: "CA", admitRate: 0.4435, inStateAdmitRate: 0.3714, outOfStateAdmitRate: 0.6324 });
    const s = scoreCollege(student({ homeState: "TX" }), davis);
    expect(s.effectiveAdmitRate).toBe(0.4435);
    expect(s.flags.some((f) => f.startsWith("effective admit rate"))).toBe(false);
  });

  it("does nothing when the student gives no home state", () => {
    const s = scoreCollege(student(), gt());
    expect(s.effectiveAdmitRate).toBe(0.1274);
    expect(s.flags.some((f) => f.startsWith("effective admit rate"))).toBe(false);
  });
});
