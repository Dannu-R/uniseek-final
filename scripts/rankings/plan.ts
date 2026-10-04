// Pure planning for rankings:import — no DB access, so it's unit-testable.

import type { RankingFile } from "./schema";

export interface CatalogCollege { collegeId: string; name: string }
export interface ProgramRow { collegeId: string; ipedsUnitId: number; name: string; programRank: number | null }

export interface RankingPlan {
  set: { collegeId: string; name: string; from: number | null; to: number }[];
  clear: { collegeId: string; name: string; from: number }[];
  noProgramRow: { ipedsUnitId: number; name: string; rank: number }[];
  notInCatalog: { ipedsUnitId: number; name: string }[];
}

// rows: the CollegeProgram rows for file.cip (one per catalog college offering the major).
export function planRankingUpdates(
  file: RankingFile,
  rows: ProgramRow[],
  catalog: Map<number, CatalogCollege>,
): RankingPlan {
  const plan: RankingPlan = { set: [], clear: [], noProgramRow: [], notInCatalog: [] };
  const rowById = new Map(rows.map((r) => [r.ipedsUnitId, r]));
  const listed = new Set<number>();

  for (const e of file.entries) {
    listed.add(e.ipedsUnitId);
    if (!catalog.has(e.ipedsUnitId)) { plan.notInCatalog.push({ ipedsUnitId: e.ipedsUnitId, name: e.name }); continue; }
    const row = rowById.get(e.ipedsUnitId);
    if (!row) { plan.noProgramRow.push({ ipedsUnitId: e.ipedsUnitId, name: e.name, rank: e.rank }); continue; }
    plan.set.push({ collegeId: row.collegeId, name: row.name, from: row.programRank, to: e.rank });
  }

  for (const r of rows) {
    if (!listed.has(r.ipedsUnitId) && r.programRank != null) {
      plan.clear.push({ collegeId: r.collegeId, name: r.name, from: r.programRank });
    }
  }
  return plan;
}
