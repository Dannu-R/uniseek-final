// End-to-end sanity check: score the §17 "danush" fixture against the seeded 30.
//   npx tsx scripts/score-demo.ts

import { prisma } from "../lib/prisma";
import { rankColleges } from "../lib/scoring/score";
import { mapCollege, scorableCollege } from "../lib/scoring/mapCollege";
import type { StudentInput } from "../lib/scoring/types";

const danush: StudentInput = {
  gpaUnweighted: 3.98,
  gpaGrade10: 3.95,
  gpaGrade11: 3.98,
  gpaGrade12: 4.0,
  apCoursesTaken: 16,
  apCoursesOffered: 33,
  satSuperscore: 1520,
  actSuperscore: null,
  notSubmittingScores: false,
  classRank: 12,
  classSize: 480,
  schoolDoesNotRank: false,
  activities: [{ tier: 3 }, { tier: 3 }, { tier: 2 }, { tier: 1 }, { tier: 1 }],
  volunteerHoursPerYear: 45,
  majorCip: "11.0701", // CS run
  homeState: "CA",
  homeLat: 34.05,
  homeLon: -118.24,
  budgetMaxNetPrice: 60000,
  incomeBand: null,
  maxDistanceMiles: null,
  requiredState: null,
  religiousPreference: "NO_PREFERENCE",
  preferences: {
    schoolSize: { weight: 2, direction: 4 }, // prefers large
    coOp: { weight: 3 },
    academicSupport: { weight: 2 },
  },
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function main() {
  const colleges = await prisma.college.findMany({ include: { programs: true } });
  const inputs = colleges.filter(scorableCollege).map((c) => mapCollege(c, danush.majorCip));
  const r = rankColleges(danush, inputs);

  console.log(`\nCS run — scored ${inputs.length} colleges, ${r.removed.length} filtered out.\n`);

  const row = (s: (typeof r.ranked)[number]) =>
    `  ${s.band.padEnd(6)} ${s.name.padEnd(38)} odds ${pct(s.odds).padStart(6)}  q ${s.quality.toFixed(2)}  match ${s.matchScore.toFixed(3)}  final ${s.finalScore.toFixed(3)}`;

  console.log("── Surfaced list (build_list quota, §10c) ──");
  for (const s of r.list) console.log(row(s));

  console.log("\n── Top 8 by final_score ──");
  for (const s of r.ranked.slice(0, 8)) console.log(row(s));

  console.log("\n── CS admit rate used (major offset, §6a) — sample ──");
  for (const s of r.ranked.slice(0, 5)) {
    console.log(`  ${s.name.padEnd(38)} effective admit ${pct(s.effectiveAdmitRate)}${s.flags.length ? "  ⚑ " + s.flags[0] : ""}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
