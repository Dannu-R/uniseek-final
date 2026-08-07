// Uniseek seed — the 30-college fixture set.
//
// DATA PROVENANCE:
//   - Admissions fields (admitRate, usNewsRank, archetype, CS admit rate + program
//     rank, source classes, residency splits) trace to uniseek_procedures_v6.md
//     §16 and §18. These are the researched numbers.
//   - Every preference/filter field (geo, net price, enrollment, setting, athletics,
//     Greek/co-op, CDS-style percentages, test bands) is a HAND-FILLED PLAUSIBLE
//     PLACEHOLDER so the filters + soft factors are testable. NOT authoritative;
//     the scraper replaces these with real Scorecard/IPEDS/CDS values later.
//
// admitRate and all "percentage" fields are stored as FRACTIONS on 0..1
// (e.g. 3.65% -> 0.0365), matching the scoring model's math (§10a uses -log(rate)).
//
// Idempotent: re-running upserts by ipedsUnitId / cipCode. Safe on every deploy.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Controlled major list (student picks from this; maps 1:1 to a CIP code).
const MAJORS = [
  { cipCode: "11.0701", name: "Computer Science" },
  { cipCode: "26.0101", name: "Biology / Biological Sciences" },
  { cipCode: "52.0201", name: "Business Administration and Management" },
  { cipCode: "14.1901", name: "Mechanical Engineering" },
  { cipCode: "14.1001", name: "Electrical and Electronics Engineering" },
  { cipCode: "14.0901", name: "Computer Engineering" },
  { cipCode: "42.0101", name: "Psychology" },
  { cipCode: "45.0601", name: "Economics" },
  { cipCode: "45.1001", name: "Political Science and Government" },
  { cipCode: "51.3801", name: "Registered Nursing" },
  { cipCode: "23.0101", name: "English Language and Literature" },
  { cipCode: "27.0101", name: "Mathematics" },
  { cipCode: "40.0501", name: "Chemistry" },
  { cipCode: "09.0101", name: "Communication and Media Studies" },
  { cipCode: "52.0801", name: "Finance" },
];

const CS = "11.0701";
// Offered at every college in the fixture (existence powers the major_offered filter).
const CORE_OFFERED = [
  "26.0101", "52.0201", "42.0101", "45.0601", "45.1001",
  "23.0101", "27.0101", "40.0501", "09.0101", "52.0801",
];
const ENGINEERING = ["14.1901", "14.1001", "14.0901"];
const NO_ENGINEERING = new Set(["Emory University", "Boston College"]);
const HAS_NURSING = new Set([
  "University of Florida", "University of Virginia", "University of Michigan",
  "University of North Carolina at Chapel Hill", "University of Texas at Austin",
  "University of Georgia", "University of Tennessee", "University of Maryland",
  "Villanova University", "Temple University", "Pennsylvania State University",
  "Ohio State University", "Indiana University Bloomington", "Auburn University",
  "University of Iowa", "Michigan State University", "Arizona State University",
]);

// Each college: admissions fields are sourced; everything else is a placeholder.
// cs = { admitRate (fraction|null), admitRateSourceClass, programRank, programRankSourceClass, directAdmit }
const COLLEGES = [
  { ipedsUnitId: 166027, name: "Harvard University", city: "Cambridge", state: "MA", latitude: 42.3770, longitude: -71.1167,
    admitRate: 0.0365, admitRateProvenance: "VERIFIED", usNewsRank: 3, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1500, satP75: 1580, actP25: 34, actP75: 36, testBlind: false, superscores: true,
    netPriceAvg: 18000, netPriceLt30k: 2000, netPrice30to48k: 2800, netPrice48to75k: 6500, netPrice75to110k: 14000, netPriceGt110k: 32000,
    religiousAffiliation: null, enrollmentUndergrad: 7100, setting: "URBAN", athleticsTier: "D1_FCS", ncaaDivision: "NCAA D1 FCS", conference: "Ivy League",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.75, housingOnCampusPct: 0.97, meritAidPct: 0.0, studyAbroadRate: 0.30, firstYearRetentionRate: 0.99,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.0365, admitRateSourceClass: "UNIVERSITY", programRank: 16, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 166683, name: "Massachusetts Institute of Technology", city: "Cambridge", state: "MA", latitude: 42.3601, longitude: -71.0942,
    admitRate: 0.0452, admitRateProvenance: "VERIFIED", usNewsRank: 2, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1520, satP75: 1580, actP25: 35, actP75: 36, testBlind: false, superscores: true,
    netPriceAvg: 20000, netPriceLt30k: 3000, netPrice30to48k: 4000, netPrice48to75k: 9000, netPrice75to110k: 18000, netPriceGt110k: 33000,
    religiousAffiliation: null, enrollmentUndergrad: 4600, setting: "URBAN", athleticsTier: "D3", ncaaDivision: "NCAA D3", conference: "NEWMAC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.70, housingOnCampusPct: 0.90, meritAidPct: 0.0, studyAbroadRate: 0.10, firstYearRetentionRate: 0.99,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.0452, admitRateSourceClass: "UNIVERSITY", programRank: 1, programRankSourceClass: "VERIFIED", directAdmit: false } },

  { ipedsUnitId: 130794, name: "Yale University", city: "New Haven", state: "CT", latitude: 41.3163, longitude: -72.9223,
    admitRate: 0.0459, admitRateProvenance: "VERIFIED", usNewsRank: 4, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1500, satP75: 1580, actP25: 34, actP75: 36, testBlind: false, superscores: true,
    netPriceAvg: 19000, netPriceLt30k: 2500, netPrice30to48k: 3200, netPrice48to75k: 7000, netPrice75to110k: 15000, netPriceGt110k: 32000,
    religiousAffiliation: null, enrollmentUndergrad: 6600, setting: "URBAN", athleticsTier: "D1_FCS", ncaaDivision: "NCAA D1 FCS", conference: "Ivy League",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.75, housingOnCampusPct: 0.87, meritAidPct: 0.0, studyAbroadRate: 0.30, firstYearRetentionRate: 0.99,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.0459, admitRateSourceClass: "UNIVERSITY", programRank: 20, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 198419, name: "Duke University", city: "Durham", state: "NC", latitude: 36.0014, longitude: -78.9382,
    admitRate: 0.0480, admitRateProvenance: "VERIFIED", usNewsRank: 7, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1490, satP75: 1570, actP25: 34, actP75: 36, testBlind: false, superscores: true,
    netPriceAvg: 22000, netPriceLt30k: 3000, netPrice30to48k: 4500, netPrice48to75k: 9500, netPrice75to110k: 19000, netPriceGt110k: 34000,
    religiousAffiliation: null, enrollmentUndergrad: 6600, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "ACC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.73, housingOnCampusPct: 0.82, meritAidPct: 0.05, studyAbroadRate: 0.45, firstYearRetentionRate: 0.98,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.0480, admitRateSourceClass: "UNIVERSITY", programRank: 20, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 211440, name: "Carnegie Mellon University", city: "Pittsburgh", state: "PA", latitude: 40.4433, longitude: -79.9436,
    admitRate: 0.1107, admitRateProvenance: "CARRIED", usNewsRank: 20, usNewsRankProvenance: "VERIFIED", archetype: "RIGOR_HEAVY",
    satP25: 1500, satP75: 1560, actP25: 34, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 30000, netPriceLt30k: 8000, netPrice30to48k: 10000, netPrice48to75k: 15000, netPrice75to110k: 25000, netPriceGt110k: 40000,
    religiousAffiliation: null, enrollmentUndergrad: 7500, setting: "URBAN", athleticsTier: "D3", ncaaDivision: "NCAA D3", conference: "UAA",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.65, housingOnCampusPct: 0.60, meritAidPct: 0.10, studyAbroadRate: 0.15, firstYearRetentionRate: 0.97,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.052, admitRateSourceClass: "CONSENSUS", programRank: 2, programRankSourceClass: "VERIFIED", directAdmit: true } },

  { ipedsUnitId: 164924, name: "Boston College", city: "Chestnut Hill", state: "MA", latitude: 42.3355, longitude: -71.1685,
    admitRate: 0.1260, admitRateProvenance: "VERIFIED", usNewsRank: 36, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1420, satP75: 1520, actP25: 33, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 34000, netPriceLt30k: 12000, netPrice30to48k: 15000, netPrice48to75k: 22000, netPrice75to110k: 32000, netPriceGt110k: 50000,
    religiousAffiliation: "Roman Catholic (Jesuit)", enrollmentUndergrad: 9500, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "ACC",
    greekLife: false, coOp: false, classSizeUnder20Pct: 0.48, housingOnCampusPct: 0.85, meritAidPct: 0.05, studyAbroadRate: 0.50, firstYearRetentionRate: 0.96,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 92, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 139755, name: "Georgia Institute of Technology", city: "Atlanta", state: "GA", latitude: 33.7756, longitude: -84.3963,
    admitRate: 0.1274, admitRateProvenance: "VERIFIED", usNewsRank: 32, usNewsRankProvenance: "VERIFIED", archetype: "RIGOR_HEAVY",
    satP25: 1370, satP75: 1530, actP25: 31, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 20000, netPriceLt30k: 6000, netPrice30to48k: 8000, netPrice48to75k: 13000, netPrice75to110k: 20000, netPriceGt110k: 30000,
    religiousAffiliation: null, enrollmentUndergrad: 18000, setting: "URBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "ACC",
    greekLife: true, coOp: true, classSizeUnder20Pct: 0.40, housingOnCampusPct: 0.55, meritAidPct: 0.10, studyAbroadRate: 0.35, firstYearRetentionRate: 0.97,
    inStateAdmitRate: 0.293, outOfStateAdmitRate: 0.0893,
    cs: { admitRate: 0.1128, admitRateSourceClass: "DERIVED", programRank: 5, programRankSourceClass: "VERIFIED", directAdmit: true } },

  { ipedsUnitId: 139658, name: "Emory University", city: "Atlanta", state: "GA", latitude: 33.7925, longitude: -84.3240,
    admitRate: 0.1495, admitRateProvenance: "VERIFIED", usNewsRank: 24, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1450, satP75: 1540, actP25: 33, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 30000, netPriceLt30k: 8000, netPrice30to48k: 10000, netPrice48to75k: 16000, netPrice75to110k: 26000, netPriceGt110k: 42000,
    religiousAffiliation: null, enrollmentUndergrad: 7100, setting: "SUBURBAN", athleticsTier: "D3", ncaaDivision: "NCAA D3", conference: "UAA",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.68, housingOnCampusPct: 0.70, meritAidPct: 0.15, studyAbroadRate: 0.40, firstYearRetentionRate: 0.95,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 60, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 199120, name: "University of North Carolina at Chapel Hill", city: "Chapel Hill", state: "NC", latitude: 35.9049, longitude: -79.0469,
    admitRate: 0.1530, admitRateProvenance: "CARRIED", usNewsRank: 26, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1360, satP75: 1520, actP25: 30, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 17000, netPriceLt30k: 4000, netPrice30to48k: 6000, netPrice48to75k: 11000, netPrice75to110k: 20000, netPriceGt110k: 30000,
    religiousAffiliation: null, enrollmentUndergrad: 19000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "ACC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.45, housingOnCampusPct: 0.45, meritAidPct: 0.10, studyAbroadRate: 0.35, firstYearRetentionRate: 0.95,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 30, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 170976, name: "University of Michigan", city: "Ann Arbor", state: "MI", latitude: 42.2780, longitude: -83.7382,
    admitRate: 0.1640, admitRateProvenance: "CARRIED", usNewsRank: 20, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1360, satP75: 1530, actP25: 32, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 18000, netPriceLt30k: 5000, netPrice30to48k: 7000, netPrice48to75k: 13000, netPrice75to110k: 22000, netPriceGt110k: 30000,
    religiousAffiliation: null, enrollmentUndergrad: 32000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.50, housingOnCampusPct: 0.35, meritAidPct: 0.10, studyAbroadRate: 0.30, firstYearRetentionRate: 0.97,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.1640, admitRateSourceClass: "UNIVERSITY", programRank: 11, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 134130, name: "University of Florida", city: "Gainesville", state: "FL", latitude: 29.6436, longitude: -82.3549,
    admitRate: 0.1977, admitRateProvenance: "VERIFIED", usNewsRank: 30, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1350, satP75: 1490, actP25: 30, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 12000, netPriceLt30k: 3000, netPrice30to48k: 4000, netPrice48to75k: 8000, netPrice75to110k: 14000, netPriceGt110k: 20000,
    religiousAffiliation: null, enrollmentUndergrad: 34000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "SEC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.48, housingOnCampusPct: 0.25, meritAidPct: 0.30, studyAbroadRate: 0.25, firstYearRetentionRate: 0.97,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.1977, admitRateSourceClass: "UNIVERSITY", programRank: 45, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 234076, name: "University of Virginia", city: "Charlottesville", state: "VA", latitude: 38.0336, longitude: -78.5080,
    admitRate: 0.2300, admitRateProvenance: "VERIFIED", usNewsRank: 26, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1410, satP75: 1520, actP25: 32, actP75: 35, testBlind: false, superscores: true,
    netPriceAvg: 18000, netPriceLt30k: 5000, netPrice30to48k: 7000, netPrice48to75k: 12000, netPrice75to110k: 20000, netPriceGt110k: 30000,
    religiousAffiliation: null, enrollmentUndergrad: 17000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "ACC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.52, housingOnCampusPct: 0.40, meritAidPct: 0.10, studyAbroadRate: 0.35, firstYearRetentionRate: 0.97,
    inStateAdmitRate: 0.30, outOfStateAdmitRate: 0.125,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 33, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 110680, name: "University of California, San Diego", city: "La Jolla", state: "CA", latitude: 32.8801, longitude: -117.2340,
    admitRate: 0.2400, admitRateProvenance: "APPROX", usNewsRank: 29, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1310, satP75: 1520, actP25: 28, actP75: 35, testBlind: true, superscores: null,
    netPriceAvg: 16000, netPriceLt30k: 4000, netPrice30to48k: 6000, netPrice48to75k: 11000, netPrice75to110k: 20000, netPriceGt110k: 28000,
    religiousAffiliation: null, enrollmentUndergrad: 33000, setting: "SUBURBAN", athleticsTier: "D1_NO_FOOTBALL", ncaaDivision: "NCAA D1", conference: "Big West",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.35, housingOnCampusPct: 0.40, meritAidPct: 0.05, studyAbroadRate: 0.20, firstYearRetentionRate: 0.95,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 12, programRankSourceClass: "VERIFIED", directAdmit: null } },

  { ipedsUnitId: 228778, name: "University of Texas at Austin", city: "Austin", state: "TX", latitude: 30.2849, longitude: -97.7341,
    admitRate: 0.2660, admitRateProvenance: "CARRIED", usNewsRank: 30, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1350, satP75: 1520, actP25: 29, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 15000, netPriceLt30k: 3000, netPrice30to48k: 5000, netPrice48to75k: 10000, netPrice75to110k: 18000, netPriceGt110k: 26000,
    religiousAffiliation: null, enrollmentUndergrad: 40000, setting: "URBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "SEC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.42, housingOnCampusPct: 0.18, meritAidPct: 0.15, studyAbroadRate: 0.25, firstYearRetentionRate: 0.96,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.085, admitRateSourceClass: "CONSENSUS", programRank: 10, programRankSourceClass: "LIST_ORDER", directAdmit: true } },

  { ipedsUnitId: 216597, name: "Villanova University", city: "Villanova", state: "PA", latitude: 40.0372, longitude: -75.3430,
    admitRate: 0.2740, admitRateProvenance: "VERIFIED", usNewsRank: 51, usNewsRankProvenance: "APPROX", archetype: "HOLISTIC",
    satP25: 1370, satP75: 1500, actP25: 32, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 38000, netPriceLt30k: 15000, netPrice30to48k: 18000, netPrice48to75k: 26000, netPrice75to110k: 36000, netPriceGt110k: 52000,
    religiousAffiliation: "Roman Catholic (Augustinian)", enrollmentUndergrad: 7000, setting: "SUBURBAN", athleticsTier: "D1_FCS", ncaaDivision: "NCAA D1 FCS", conference: "Big East / CAA (football)",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.45, housingOnCampusPct: 0.70, meritAidPct: 0.25, studyAbroadRate: 0.55, firstYearRetentionRate: 0.96,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 95, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 110653, name: "University of California, Irvine", city: "Irvine", state: "CA", latitude: 33.6405, longitude: -117.8443,
    admitRate: 0.2894, admitRateProvenance: "CARRIED", usNewsRank: 32, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1230, satP75: 1450, actP25: 27, actP75: 34, testBlind: true, superscores: null,
    netPriceAvg: 14000, netPriceLt30k: 3000, netPrice30to48k: 5000, netPrice48to75k: 10000, netPrice75to110k: 18000, netPriceGt110k: 26000,
    religiousAffiliation: null, enrollmentUndergrad: 29000, setting: "SUBURBAN", athleticsTier: "D1_NO_FOOTBALL", ncaaDivision: "NCAA D1", conference: "Big West",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.38, housingOnCampusPct: 0.40, meritAidPct: 0.05, studyAbroadRate: 0.18, firstYearRetentionRate: 0.94,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 35, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 139959, name: "University of Georgia", city: "Athens", state: "GA", latitude: 33.9480, longitude: -83.3773,
    admitRate: 0.3300, admitRateProvenance: "VERIFIED", usNewsRank: 46, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1290, satP75: 1440, actP25: 29, actP75: 33, testBlind: false, superscores: true,
    netPriceAvg: 14000, netPriceLt30k: 4000, netPrice30to48k: 5000, netPrice48to75k: 9000, netPrice75to110k: 15000, netPriceGt110k: 22000,
    religiousAffiliation: null, enrollmentUndergrad: 30000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "SEC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.44, housingOnCampusPct: 0.28, meritAidPct: 0.35, studyAbroadRate: 0.30, firstYearRetentionRate: 0.96,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 62, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 145637, name: "University of Illinois Urbana-Champaign", city: "Champaign", state: "IL", latitude: 40.1020, longitude: -88.2272,
    admitRate: 0.3660, admitRateProvenance: "CARRIED", usNewsRank: 36, usNewsRankProvenance: "VERIFIED", archetype: "RIGOR_HEAVY",
    satP25: 1330, satP75: 1500, actP25: 29, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 17000, netPriceLt30k: 5000, netPrice30to48k: 7000, netPrice48to75k: 12000, netPrice75to110k: 20000, netPriceGt110k: 28000,
    religiousAffiliation: null, enrollmentUndergrad: 35000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: true, classSizeUnder20Pct: 0.43, housingOnCampusPct: 0.48, meritAidPct: 0.10, studyAbroadRate: 0.25, firstYearRetentionRate: 0.93,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.072, admitRateSourceClass: "PUBLISHED", programRank: 8, programRankSourceClass: "LIST_ORDER", directAdmit: true } },

  { ipedsUnitId: 221759, name: "University of Tennessee", city: "Knoxville", state: "TN", latitude: 35.9544, longitude: -83.9295,
    admitRate: 0.3832, admitRateProvenance: "VERIFIED", usNewsRank: 102, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1180, satP75: 1360, actP25: 25, actP75: 31, testBlind: false, superscores: true,
    netPriceAvg: 14000, netPriceLt30k: 4000, netPrice30to48k: 6000, netPrice48to75k: 10000, netPrice75to110k: 16000, netPriceGt110k: 22000,
    religiousAffiliation: null, enrollmentUndergrad: 24000, setting: "URBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "SEC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.40, housingOnCampusPct: 0.35, meritAidPct: 0.35, studyAbroadRate: 0.20, firstYearRetentionRate: 0.90,
    inStateAdmitRate: 0.6276, outOfStateAdmitRate: 0.3117,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 75, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 195030, name: "University of Rochester", city: "Rochester", state: "NY", latitude: 43.1284, longitude: -77.6284,
    admitRate: 0.4010, admitRateProvenance: "CARRIED", usNewsRank: 46, usNewsRankProvenance: "VERIFIED", archetype: "HOLISTIC",
    satP25: 1380, satP75: 1520, actP25: 31, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 32000, netPriceLt30k: 8000, netPrice30to48k: 11000, netPrice48to75k: 17000, netPrice75to110k: 27000, netPriceGt110k: 44000,
    religiousAffiliation: null, enrollmentUndergrad: 6800, setting: "SUBURBAN", athleticsTier: "D3", ncaaDivision: "NCAA D3", conference: "UAA / Liberty (football)",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.65, housingOnCampusPct: 0.78, meritAidPct: 0.30, studyAbroadRate: 0.30, firstYearRetentionRate: 0.94,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 48, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 163286, name: "University of Maryland", city: "College Park", state: "MD", latitude: 38.9869, longitude: -76.9426,
    admitRate: 0.4500, admitRateProvenance: "APPROX", usNewsRank: 42, usNewsRankProvenance: "VERIFIED", archetype: "GPA_HEAVY",
    satP25: 1370, satP75: 1510, actP25: 31, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 17000, netPriceLt30k: 5000, netPrice30to48k: 7000, netPrice48to75k: 12000, netPrice75to110k: 20000, netPriceGt110k: 28000,
    religiousAffiliation: null, enrollmentUndergrad: 30000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.42, housingOnCampusPct: 0.38, meritAidPct: 0.15, studyAbroadRate: 0.25, firstYearRetentionRate: 0.95,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 16, programRankSourceClass: "VERIFIED", directAdmit: true } },

  { ipedsUnitId: 243780, name: "Purdue University", city: "West Lafayette", state: "IN", latitude: 40.4237, longitude: -86.9212,
    admitRate: 0.4980, admitRateProvenance: "CARRIED", usNewsRank: 46, usNewsRankProvenance: "VERIFIED", archetype: "RIGOR_HEAVY",
    satP25: 1210, satP75: 1460, actP25: 27, actP75: 34, testBlind: false, superscores: true,
    netPriceAvg: 14000, netPriceLt30k: 4000, netPrice30to48k: 6000, netPrice48to75k: 10000, netPrice75to110k: 16000, netPriceGt110k: 24000,
    religiousAffiliation: null, enrollmentUndergrad: 37000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: true, classSizeUnder20Pct: 0.40, housingOnCampusPct: 0.42, meritAidPct: 0.20, studyAbroadRate: 0.20, firstYearRetentionRate: 0.93,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.359, admitRateSourceClass: "PUBLISHED", programRank: 16, programRankSourceClass: "VERIFIED", directAdmit: true } },

  { ipedsUnitId: 216339, name: "Temple University", city: "Philadelphia", state: "PA", latitude: 39.9812, longitude: -75.1554,
    admitRate: 0.5220, admitRateProvenance: "APPROX", usNewsRank: 102, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1150, satP75: 1340, actP25: 24, actP75: 31, testBlind: false, superscores: true,
    netPriceAvg: 20000, netPriceLt30k: 8000, netPrice30to48k: 10000, netPrice48to75k: 16000, netPrice75to110k: 24000, netPriceGt110k: 32000,
    religiousAffiliation: null, enrollmentUndergrad: 24000, setting: "URBAN", athleticsTier: "D1_FBS_OTHER", ncaaDivision: "NCAA D1 FBS", conference: "American (AAC)",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.42, housingOnCampusPct: 0.22, meritAidPct: 0.30, studyAbroadRate: 0.15, firstYearRetentionRate: 0.88,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 88, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 214777, name: "Pennsylvania State University", city: "University Park", state: "PA", latitude: 40.7982, longitude: -77.8599,
    admitRate: 0.5533, admitRateProvenance: "VERIFIED", usNewsRank: 59, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1230, satP75: 1410, actP25: 27, actP75: 32, testBlind: false, superscores: true,
    netPriceAvg: 24000, netPriceLt30k: 12000, netPrice30to48k: 15000, netPrice48to75k: 20000, netPrice75to110k: 28000, netPriceGt110k: 36000,
    religiousAffiliation: null, enrollmentUndergrad: 40000, setting: "RURAL", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: true, classSizeUnder20Pct: 0.38, housingOnCampusPct: 0.35, meritAidPct: 0.15, studyAbroadRate: 0.20, firstYearRetentionRate: 0.93,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: 0.5533, admitRateSourceClass: "UNIVERSITY", programRank: 40, programRankSourceClass: "ESTIMATE", directAdmit: false } },

  { ipedsUnitId: 204796, name: "Ohio State University", city: "Columbus", state: "OH", latitude: 40.0067, longitude: -83.0305,
    admitRate: 0.6060, admitRateProvenance: "CARRIED", usNewsRank: 41, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1280, satP75: 1450, actP25: 28, actP75: 32, testBlind: false, superscores: true,
    netPriceAvg: 18000, netPriceLt30k: 6000, netPrice30to48k: 8000, netPrice48to75k: 13000, netPrice75to110k: 20000, netPriceGt110k: 28000,
    religiousAffiliation: null, enrollmentUndergrad: 45000, setting: "URBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.40, housingOnCampusPct: 0.30, meritAidPct: 0.20, studyAbroadRate: 0.20, firstYearRetentionRate: 0.94,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 40, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 151351, name: "Indiana University Bloomington", city: "Bloomington", state: "IN", latitude: 39.1682, longitude: -86.5230,
    admitRate: 0.7821, admitRateProvenance: "VERIFIED", usNewsRank: 73, usNewsRankProvenance: "APPROX", archetype: "RANK_STATE",
    satP25: 1150, satP75: 1360, actP25: 25, actP75: 31, testBlind: false, superscores: true,
    netPriceAvg: 16000, netPriceLt30k: 5000, netPrice30to48k: 7000, netPrice48to75k: 11000, netPrice75to110k: 17000, netPriceGt110k: 24000,
    religiousAffiliation: null, enrollmentUndergrad: 35000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.40, housingOnCampusPct: 0.32, meritAidPct: 0.30, studyAbroadRate: 0.25, firstYearRetentionRate: 0.90,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 54, programRankSourceClass: "VERIFIED", directAdmit: null } },

  { ipedsUnitId: 100858, name: "Auburn University", city: "Auburn", state: "AL", latitude: 32.6030, longitude: -85.4808,
    admitRate: 0.8050, admitRateProvenance: "APPROX", usNewsRank: 102, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1180, satP75: 1340, actP25: 25, actP75: 31, testBlind: false, superscores: true,
    netPriceAvg: 20000, netPriceLt30k: 10000, netPrice30to48k: 12000, netPrice48to75k: 17000, netPrice75to110k: 24000, netPriceGt110k: 30000,
    religiousAffiliation: null, enrollmentUndergrad: 25000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "SEC",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.38, housingOnCampusPct: 0.18, meritAidPct: 0.25, studyAbroadRate: 0.15, firstYearRetentionRate: 0.91,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 78, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 153658, name: "University of Iowa", city: "Iowa City", state: "IA", latitude: 41.6627, longitude: -91.5550,
    admitRate: 0.8070, admitRateProvenance: "APPROX", usNewsRank: 102, usNewsRankProvenance: "VERIFIED", archetype: "RANK_STATE",
    satP25: 1130, satP75: 1330, actP25: 23, actP75: 29, testBlind: false, superscores: true,
    netPriceAvg: 16000, netPriceLt30k: 6000, netPrice30to48k: 8000, netPrice48to75k: 12000, netPrice75to110k: 18000, netPriceGt110k: 24000,
    religiousAffiliation: null, enrollmentUndergrad: 22000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.45, housingOnCampusPct: 0.28, meritAidPct: 0.30, studyAbroadRate: 0.20, firstYearRetentionRate: 0.88,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 80, programRankSourceClass: "ESTIMATE", directAdmit: null } },

  { ipedsUnitId: 171100, name: "Michigan State University", city: "East Lansing", state: "MI", latitude: 42.7018, longitude: -84.4822,
    admitRate: 0.8480, admitRateProvenance: "CARRIED", usNewsRank: 63, usNewsRankProvenance: "APPROX", archetype: "RANK_STATE",
    satP25: 1100, satP75: 1310, actP25: 23, actP75: 29, testBlind: false, superscores: true,
    netPriceAvg: 18000, netPriceLt30k: 7000, netPrice30to48k: 9000, netPrice48to75k: 14000, netPrice75to110k: 20000, netPriceGt110k: 26000,
    religiousAffiliation: null, enrollmentUndergrad: 40000, setting: "SUBURBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big Ten",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.38, housingOnCampusPct: 0.38, meritAidPct: 0.25, studyAbroadRate: 0.20, firstYearRetentionRate: 0.91,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 54, programRankSourceClass: "VERIFIED", directAdmit: null } },

  { ipedsUnitId: 104151, name: "Arizona State University", city: "Tempe", state: "AZ", latitude: 33.4242, longitude: -111.9281,
    admitRate: 0.8840, admitRateProvenance: "CARRIED", usNewsRank: 117, usNewsRankProvenance: "CARRIED", archetype: "RANK_STATE",
    satP25: 1120, satP75: 1350, actP25: 22, actP75: 29, testBlind: false, superscores: true,
    netPriceAvg: 15000, netPriceLt30k: 6000, netPrice30to48k: 8000, netPrice48to75k: 12000, netPrice75to110k: 18000, netPriceGt110k: 24000,
    religiousAffiliation: null, enrollmentUndergrad: 65000, setting: "URBAN", athleticsTier: "D1_FBS_POWER", ncaaDivision: "NCAA D1 FBS", conference: "Big 12",
    greekLife: true, coOp: false, classSizeUnder20Pct: 0.35, housingOnCampusPct: 0.25, meritAidPct: 0.35, studyAbroadRate: 0.15, firstYearRetentionRate: 0.88,
    inStateAdmitRate: null, outOfStateAdmitRate: null,
    cs: { admitRate: null, admitRateSourceClass: "FITTED", programRank: 45, programRankSourceClass: "ESTIMATE", directAdmit: null } },
];

async function main() {
  // Major controlled list.
  for (const m of MAJORS) {
    await prisma.major.upsert({ where: { cipCode: m.cipCode }, update: { name: m.name }, create: m });
  }

  for (const c of COLLEGES) {
    const { cs, ...college } = c;

    const row = await prisma.college.upsert({
      where: { ipedsUnitId: college.ipedsUnitId },
      update: college,
      create: college,
    });

    // Which CIPs this college confers (existence powers major_offered).
    const offered = [
      ...CORE_OFFERED,
      ...(NO_ENGINEERING.has(college.name) ? [] : ENGINEERING),
      ...(HAS_NURSING.has(college.name) ? ["51.3801"] : []),
    ];

    // Offered-only programs (no admissions data).
    for (const cip of offered) {
      await prisma.collegeProgram.upsert({
        where: { collegeId_cipCode: { collegeId: row.id, cipCode: cip } },
        update: {},
        create: { collegeId: row.id, cipCode: cip },
      });
    }

    // CS program, with the researched §18 admissions data.
    await prisma.collegeProgram.upsert({
      where: { collegeId_cipCode: { collegeId: row.id, cipCode: CS } },
      update: cs,
      create: { collegeId: row.id, cipCode: CS, ...cs },
    });
  }

  const [colleges, programs, majors] = await Promise.all([
    prisma.college.count(),
    prisma.collegeProgram.count(),
    prisma.major.count(),
  ]);
  console.log(`🌱  Seeded ${colleges} colleges, ${programs} programs, ${majors} majors.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
