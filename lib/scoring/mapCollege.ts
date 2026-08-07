// Map a Prisma College (with its programs) onto the scoring engine's CollegeInput.
// Callers should pre-filter to colleges that have the admissions data scoring needs
// (admitRate + usNewsRank); see `scorableCollege`.

import type { College, CollegeProgram, Archetype as PrismaArchetype, AthleticsTier, Setting } from "@prisma/client";
import type { CollegeInput } from "./types";
import type { Archetype } from "./weights";

export type CollegeWithPrograms = College & { programs: CollegeProgram[] };

// A college can be scored only if it has the core admissions fields.
export function scorableCollege(c: CollegeWithPrograms): boolean {
  return c.admitRate != null && c.usNewsRank != null;
}

export function mapCollege(c: CollegeWithPrograms, majorCip?: string | null): CollegeInput {
  const program = majorCip ? c.programs.find((p) => p.cipCode === majorCip) ?? null : null;

  return {
    id: c.id,
    name: c.name,
    admitRate: c.admitRate!, // guarded by scorableCollege
    usNewsRank: c.usNewsRank!,
    archetype: (c.archetype as PrismaArchetype | null) as Archetype | null,
    c7: { rigor: c.c7Rigor, gpa: c.c7Gpa, test: c.c7Test, rank: c.c7Rank, ec: c.c7Ec, service: c.c7Service },
    satP25: c.satP25,
    satP75: c.satP75,
    testBlind: c.testBlind,
    inStateAdmitRate: c.inStateAdmitRate,
    outOfStateAdmitRate: c.outOfStateAdmitRate,
    state: c.state,
    latitude: c.latitude,
    longitude: c.longitude,
    offeredCips: c.programs.map((p) => p.cipCode),
    majorProgram: program
      ? { cipCode: program.cipCode, admitRate: program.admitRate, programRank: program.programRank, directAdmit: program.directAdmit }
      : null,
    facts: {
      enrollmentUndergrad: c.enrollmentUndergrad,
      classSizeUnder20Pct: c.classSizeUnder20Pct,
      greekLife: c.greekLife,
      housingOnCampusPct: c.housingOnCampusPct,
      athleticsTier: (c.athleticsTier as AthleticsTier | null) as CollegeInput["facts"]["athleticsTier"],
      setting: (c.setting as Setting | null) as CollegeInput["facts"]["setting"],
      firstYearRetentionRate: c.firstYearRetentionRate,
      meritAidPct: c.meritAidPct,
      studyAbroadRate: c.studyAbroadRate,
      coOp: c.coOp,
    },
    netPriceAvg: c.netPriceAvg,
    netPriceBands: {
      LT_30K: c.netPriceLt30k,
      B30_48K: c.netPrice30to48k,
      B48_75K: c.netPrice48to75k,
      B75_110K: c.netPrice75to110k,
      GT_110K: c.netPriceGt110k,
    },
    religiousAffiliation: c.religiousAffiliation,
  };
}
