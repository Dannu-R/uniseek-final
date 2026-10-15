import { describe, it, expect } from "vitest";
import { MajorRateFile } from "./schema";
import { planMajorRates, type RateProgramRow, type RateCatalogCollege } from "./plan";

const entry = (o: Record<string, unknown>) => ({
  name: "X", admissionUnit: "MAJOR", sourceClass: "PUBLISHED", admitRate: 0.05, directAdmit: true,
  basis: "published by the school, Fall 2025", url: "https://x.test/", year: "Fall 2025", ...o,
});
const file = MajorRateFile.parse({
  cip: "11.0701", cycle: "2026-27", collectedAt: "2026-10-15",
  entries: [
    entry({ ipedsUnitId: 1, name: "A" }),
    entry({ ipedsUnitId: 2, name: "B", admissionUnit: "UNIVERSITY", sourceClass: "UNIVERSITY", admitRate: null, directAdmit: false, url: null }),
    entry({ ipedsUnitId: 3, name: "C (no CS row)" }),
    entry({ ipedsUnitId: 9, name: "Not in catalog" }),
  ],
});
const catalog = new Map<number, RateCatalogCollege>([
  [1, { collegeId: "a", name: "A", admissionUnit: null }],
  [2, { collegeId: "b", name: "B", admissionUnit: "UNIVERSITY" }],
  [3, { collegeId: "c", name: "C", admissionUnit: null }],
  [4, { collegeId: "d", name: "D", admissionUnit: null }],
]);
const rows: RateProgramRow[] = [
  { collegeId: "a", ipedsUnitId: 1, name: "A", admitRate: 0.08, admitRateSourceClass: "CONSENSUS", directAdmit: null },
  { collegeId: "b", ipedsUnitId: 2, name: "B", admitRate: null, admitRateSourceClass: null, directAdmit: null },
  { collegeId: "d", ipedsUnitId: 4, name: "D", admitRate: null, admitRateSourceClass: null, directAdmit: null },
];

describe("planMajorRates", () => {
  const plan = planMajorRates(file, rows, catalog);
  it("updates each listed college's program row", () => {
    expect(plan.programUpdates.map((u) => [u.collegeId, u.to.admitRate, u.to.sourceClass])).toEqual([
      ["a", 0.05, "PUBLISHED"], ["b", null, "UNIVERSITY"],
    ]);
  });
  it("flags overwrites of an already-researched value", () => {
    expect(plan.programUpdates.find((u) => u.collegeId === "a")!.changedResearched).toBe(true);
    expect(plan.programUpdates.find((u) => u.collegeId === "b")!.changedResearched).toBe(false);
  });
  it("sets admission units that differ, including for colleges without a CS row", () => {
    expect(plan.unitUpdates).toEqual([
      { collegeId: "a", name: "A", from: null, to: "MAJOR" },
      { collegeId: "c", name: "C", from: null, to: "MAJOR" },
    ]);
  });
  it("reports colleges without a CS row, entries outside the catalog, and catalog CS rows missing from the file", () => {
    expect(plan.noProgramRow).toEqual([{ ipedsUnitId: 3, name: "C (no CS row)" }]);
    expect(plan.notInCatalog).toEqual([{ ipedsUnitId: 9, name: "Not in catalog" }]);
    expect(plan.missingFromFile).toEqual([{ collegeId: "d", name: "D" }]);
  });
});

describe("MajorRateFile validation", () => {
  const base = { cip: "11.0701", cycle: "2026-27", collectedAt: "2026-10-15" };
  const bad = (o: Record<string, unknown>) => MajorRateFile.safeParse({ ...base, entries: [entry({ ipedsUnitId: 1, ...o })] });
  it("requires U entries to store a null rate", () => {
    expect(bad({ sourceClass: "UNIVERSITY", admitRate: 0.2 }).success).toBe(false);
  });
  it("requires a rate for non-U classes", () => {
    expect(bad({ sourceClass: "ESTIMATE", admitRate: null }).success).toBe(false);
  });
  it("requires a url for DERIVED and PUBLISHED", () => {
    expect(bad({ sourceClass: "DERIVED", url: null }).success).toBe(false);
  });
  it("rejects duplicate colleges", () => {
    const r = MajorRateFile.safeParse({ ...base, entries: [entry({ ipedsUnitId: 1 }), entry({ ipedsUnitId: 1 })] });
    expect(r.success).toBe(false);
  });
});
