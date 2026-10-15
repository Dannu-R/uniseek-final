// Apply a researched major-admit-rate file.
//
//   npm run major-rates:import -- data/major-rates/<file>.json [--dry-run]
//
// Sets admitRate / admitRateSourceClass / directAdmit on each college's existing
// program row for the file's major, and College.admissionUnit. Never creates program
// rows. Lists every overwrite of an already-researched value.

import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { loadEnv, parseArgs } from "../colleges/batch";
import { MajorRateFile } from "./schema";
import { planMajorRates, type RateCatalogCollege, type RateProgramRow } from "./plan";

loadEnv();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  const path = args.positional[0];
  if (!path) throw new Error("usage: npm run major-rates:import -- data/major-rates/<file>.json [--dry-run]");

  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(path, "utf8")); }
  catch (e) { throw new Error(`${path}: not valid JSON (${(e as Error).message})`); }
  const parsed = MajorRateFile.safeParse(raw);
  if (!parsed.success) throw new Error(`${path}:\n${parsed.error.issues.map((i) => `  - ${i.message}`).join("\n")}`);
  const file = parsed.data;

  const prisma = new PrismaClient();
  const colleges = await prisma.college.findMany({ select: { id: true, ipedsUnitId: true, name: true, admissionUnit: true } });
  const catalog = new Map<number, RateCatalogCollege>(
    colleges.filter((c) => c.ipedsUnitId != null).map((c) => [c.ipedsUnitId!, { collegeId: c.id, name: c.name, admissionUnit: c.admissionUnit }]),
  );
  const programRows = await prisma.collegeProgram.findMany({
    where: { cipCode: file.cip },
    select: { collegeId: true, admitRate: true, admitRateSourceClass: true, directAdmit: true, college: { select: { ipedsUnitId: true, name: true } } },
  });
  const rows: RateProgramRow[] = programRows
    .filter((r) => r.college.ipedsUnitId != null)
    .map((r) => ({ collegeId: r.collegeId, ipedsUnitId: r.college.ipedsUnitId!, name: r.college.name, admitRate: r.admitRate, admitRateSourceClass: r.admitRateSourceClass, directAdmit: r.directAdmit }));

  const plan = planMajorRates(file, rows, catalog);
  // The planner emits an update for every listed college; only write the ones that differ.
  const changed = plan.programUpdates.filter((u) => u.from.admitRate !== u.to.admitRate || u.from.sourceClass !== u.to.sourceClass || u.from.directAdmit !== u.to.directAdmit);
  const verb = dryRun ? "would " : "";
  console.log(`${path} (${file.cip}, ${file.entries.length} entries)`);
  console.log(`  ${verb}update ${changed.length} changed of ${plan.programUpdates.length} listed program rows · ${verb}set ${plan.unitUpdates.length} admission units`);
  const overwrites = changed.filter((u) => u.changedResearched || (u.from.sourceClass != null && u.from.sourceClass !== "FITTED" && u.from.directAdmit !== u.to.directAdmit));
  if (overwrites.length) {
    console.log(`  replacing ${overwrites.length} already-researched value(s):`);
    for (const u of overwrites) console.log(`    ${u.name}: ${u.from.admitRate ?? "—"} (${u.from.sourceClass}, directAdmit ${u.from.directAdmit ?? "?"}) → ${u.to.admitRate ?? "overall"} (${u.to.sourceClass}, directAdmit ${u.to.directAdmit ?? "?"})`);
  }
  if (plan.noProgramRow.length) console.log(`  ⚠ no ${file.cip} program row (college doesn't offer it per majorsOffered): ${plan.noProgramRow.map((n) => n.name).join("; ")}`);
  if (plan.missingFromFile.length) console.log(`  ⚠ catalog colleges offering ${file.cip} with no entry: ${plan.missingFromFile.map((m) => m.name).join("; ")}`);
  if (plan.notInCatalog.length) console.log(`  (ignored ${plan.notInCatalog.length} entries not in the catalog)`);

  if (!dryRun) {
    await prisma.$transaction([
      ...changed.map((u) => prisma.collegeProgram.update({
        where: { collegeId_cipCode: { collegeId: u.collegeId, cipCode: file.cip } },
        data: { admitRate: u.to.admitRate, admitRateSourceClass: u.to.sourceClass as never, directAdmit: u.to.directAdmit },
      })),
      ...plan.unitUpdates.map((u) => prisma.college.update({ where: { id: u.collegeId }, data: { admissionUnit: u.to } })),
    ]);
    console.log("  ✓ applied");
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
