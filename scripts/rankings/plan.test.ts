import { describe, it, expect } from "vitest";
import { checkAgainstConfig, RankingFile } from "./schema";
import { planRankingUpdates, type ProgramRow, type CatalogCollege } from "./plan";
import type { RankingLists } from "../../lib/scoring/rankingLists";

const file = RankingFile.parse({
  source: "USNEWS", edition: "2027", cip: "11.0701", listKey: "computer-science-overall",
  url: "https://www.usnews.com/best-colleges/rankings/computer-science-overall", size: 587, collectedAt: "2026-10-04",
  entries: [
    { ipedsUnitId: 1, name: "A", rank: 5 },
    { ipedsUnitId: 2, name: "B", rank: 40, tie: true },
    { ipedsUnitId: 3, name: "C", rank: 541, band: "#541-587" },
    { ipedsUnitId: 9, name: "Not in catalog", rank: 60 },
  ],
});

const catalog = new Map<number, CatalogCollege>([
  [1, { collegeId: "a", name: "A" }],
  [2, { collegeId: "b", name: "B" }],
  [3, { collegeId: "c", name: "C" }],
  [4, { collegeId: "d", name: "D" }],
]);

const rows: ProgramRow[] = [
  { collegeId: "a", ipedsUnitId: 1, name: "A", programRank: 5 }, // unchanged rank
  { collegeId: "b", ipedsUnitId: 2, name: "B", programRank: 20 }, // stale estimate
  { collegeId: "d", ipedsUnitId: 4, name: "D", programRank: 92 }, // not on the list any more
  // C (id 3) offers no CS row
];

describe("planRankingUpdates", () => {
  const plan = planRankingUpdates(file, rows, catalog);

  it("sets every listed college that has a program row (rank + LIST_ORDER)", () => {
    expect(plan.set).toEqual([
      { collegeId: "a", name: "A", from: 5, to: 5 },
      { collegeId: "b", name: "B", from: 20, to: 40 },
    ]);
  });
  it("clears ranks of catalog colleges absent from a collected list", () => {
    expect(plan.clear).toEqual([{ collegeId: "d", name: "D", from: 92 }]);
  });
  it("reports ranked colleges with no program row instead of creating one", () => {
    expect(plan.noProgramRow).toEqual([{ ipedsUnitId: 3, name: "C", rank: 541 }]);
  });
  it("reports entries that aren't in the catalog", () => {
    expect(plan.notInCatalog).toEqual([{ ipedsUnitId: 9, name: "Not in catalog" }]);
  });
});

describe("RankingFile + checkAgainstConfig", () => {
  const lists: RankingLists = {
    institutional: { NATIONAL_UNIVERSITIES: { edition: "2027", size: 428 }, NATIONAL_LIBERAL_ARTS: { edition: "2027", size: 206 } },
    programs: { "11.0701": { source: "USNEWS", listKey: "computer-science-overall", url: "u", edition: "2027", size: 587 } },
  };

  it("passes when the file matches its config entry", () => {
    expect(checkAgainstConfig(file, lists)).toEqual([]);
  });
  it("errors when the major isn't registered in RANKING_LISTS", () => {
    expect(checkAgainstConfig(file, { ...lists, programs: {} })[0]).toMatch(/not registered/);
  });
  it("errors on size or edition mismatch", () => {
    const wrong = { ...lists, programs: { "11.0701": { ...lists.programs["11.0701"], size: 600, edition: "2026" } } };
    const errs = checkAgainstConfig(file, wrong);
    expect(errs.some((e) => e.includes("size"))).toBe(true);
    expect(errs.some((e) => e.includes("edition"))).toBe(true);
  });
  it("rejects duplicate colleges", () => {
    const bad = { ...file, entries: [{ ipedsUnitId: 1, name: "A", rank: 5 }, { ipedsUnitId: 1, name: "A", rank: 6 }] };
    const r = RankingFile.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.message.includes("duplicate ipedsUnitId 1"))).toBe(true);
  });
  it("rejects ranks beyond the list size", () => {
    const bad = { ...file, entries: [{ ipedsUnitId: 1, name: "A", rank: 600 }] };
    const r = RankingFile.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.message.includes("rank 600 > list size 587"))).toBe(true);
  });
});
