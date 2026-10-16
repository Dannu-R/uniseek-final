// Pure planning for major-rates:import — no DB access, so it's unit-testable.

import type { MajorRateFile } from "./schema";

type Unit = "UNIVERSITY" | "SCHOOL" | "MAJOR";
interface RateValue {
  admitRate: number | null; sourceClass: string | null; directAdmit: boolean | null;
  inStateAdmitRate: number | null; outOfStateAdmitRate: number | null;
}

export interface RateCatalogCollege { collegeId: string; name: string; admissionUnit: Unit | null }
export interface RateProgramRow {
  collegeId: string; ipedsUnitId: number; name: string;
  admitRate: number | null; admitRateSourceClass: string | null; directAdmit: boolean | null;
  inStateAdmitRate?: number | null; outOfStateAdmitRate?: number | null;
}
export interface MajorRatePlan {
  programUpdates: { collegeId: string; name: string; from: RateValue; to: RateValue; changedResearched: boolean }[];
  unitUpdates: { collegeId: string; name: string; from: Unit | null; to: Unit | null }[];
  noProgramRow: { ipedsUnitId: number; name: string }[];
  notInCatalog: { ipedsUnitId: number; name: string }[];
  missingFromFile: { collegeId: string; name: string }[];
}

// rows: the CollegeProgram rows for file.cip (one per catalog college offering the major).
export function planMajorRates(
  file: MajorRateFile,
  rows: RateProgramRow[],
  catalog: Map<number, RateCatalogCollege>,
): MajorRatePlan {
  const plan: MajorRatePlan = { programUpdates: [], unitUpdates: [], noProgramRow: [], notInCatalog: [], missingFromFile: [] };
  const rowById = new Map(rows.map((r) => [r.ipedsUnitId, r]));
  const listed = new Set<number>();

  for (const e of file.entries) {
    listed.add(e.ipedsUnitId);
    const college = catalog.get(e.ipedsUnitId);
    if (!college) { plan.notInCatalog.push({ ipedsUnitId: e.ipedsUnitId, name: e.name }); continue; }
    if (e.admissionUnit !== null && e.admissionUnit !== college.admissionUnit) {
      plan.unitUpdates.push({ collegeId: college.collegeId, name: college.name, from: college.admissionUnit, to: e.admissionUnit });
    }
    const row = rowById.get(e.ipedsUnitId);
    if (!row) { plan.noProgramRow.push({ ipedsUnitId: e.ipedsUnitId, name: e.name }); continue; }
    const from: RateValue = {
      admitRate: row.admitRate, sourceClass: row.admitRateSourceClass, directAdmit: row.directAdmit,
      inStateAdmitRate: row.inStateAdmitRate ?? null, outOfStateAdmitRate: row.outOfStateAdmitRate ?? null,
    };
    const to: RateValue = {
      admitRate: e.admitRate, sourceClass: e.sourceClass, directAdmit: e.directAdmit,
      inStateAdmitRate: e.inStateAdmitRate ?? null, outOfStateAdmitRate: e.outOfStateAdmitRate ?? null,
    };
    const researched = from.sourceClass != null && from.sourceClass !== "FITTED";
    const differs = from.admitRate !== to.admitRate || from.sourceClass !== to.sourceClass
      || from.inStateAdmitRate !== to.inStateAdmitRate || from.outOfStateAdmitRate !== to.outOfStateAdmitRate;
    plan.programUpdates.push({ collegeId: row.collegeId, name: row.name, from, to, changedResearched: researched && differs });
  }

  for (const r of rows) {
    if (!listed.has(r.ipedsUnitId)) plan.missingFromFile.push({ collegeId: r.collegeId, name: r.name });
  }
  return plan;
}
