// Load collected ranking lists into CollegeProgram.programRank.
//
//   npm run rankings:import -- [data/rankings/<file>.json ...] [--dry-run] [--force]
//
// With no files, imports every *.json in data/rankings/. For each file:
// - validates it and checks it against RANKING_LISTS (register the list there first);
// - sets programRank + programRankSourceClass = LIST_ORDER on existing program rows;
// - clears programRank on catalog colleges absent from the list (stale estimates);
// - refuses (unless --force) a file that would clear over half of that CIP's ranked rows;
// - never creates program rows: a ranked college without one is reported for review.

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { RANKING_LISTS } from "../../lib/scoring/rankingLists";
import { loadEnv, parseArgs } from "../colleges/batch";
import { RANKINGS_DIR, RankingFile, checkAgainstConfig } from "./schema";
import { planRankingUpdates, type CatalogCollege, type ProgramRow } from "./plan";

loadEnv();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  const force = args.has("force");
  const files = args.positional.length
    ? args.positional
    : fs.readdirSync(RANKINGS_DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(RANKINGS_DIR, f));
  if (!files.length) throw new Error(`No ranking files in ${RANKINGS_DIR}`);

  const prisma = new PrismaClient();
  const colleges = await prisma.college.findMany({ select: { id: true, ipedsUnitId: true, name: true } });
  const catalog = new Map<number, CatalogCollege>(
    colleges.filter((c) => c.ipedsUnitId != null).map((c) => [c.ipedsUnitId!, { collegeId: c.id, name: c.name }]),
  );

  for (const f of files) {
    let raw: unknown;
    try { raw = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) {
      throw new Error(`${f}: invalid JSON (${(e as Error).message})`);
    }
    const parsed = RankingFile.safeParse(raw);
    if (!parsed.success) throw new Error(`${f}:\n${parsed.error.issues.map((i) => `  - ${i.message}`).join("\n")}`);
    const file = parsed.data;
    const errs = checkAgainstConfig(file, RANKING_LISTS);
    if (errs.length) throw new Error(`${path.basename(f)}:\n${errs.map((e) => `  - ${e}`).join("\n")}`);

    const programRows = await prisma.collegeProgram.findMany({
      where: { cipCode: file.cip },
      select: { collegeId: true, programRank: true, college: { select: { ipedsUnitId: true, name: true } } },
    });
    const rows: ProgramRow[] = programRows
      .filter((r) => r.college.ipedsUnitId != null)
      .map((r) => ({ collegeId: r.collegeId, ipedsUnitId: r.college.ipedsUnitId!, name: r.college.name, programRank: r.programRank }));

    const plan = planRankingUpdates(file, rows, catalog);
    const changed = plan.set.filter((s) => s.from !== s.to);
    console.log(`\n${path.basename(f)} (${file.cip}, ${file.entries.length} entries, size ${file.size})`);
    console.log(`  ${dryRun ? "would set" : "set"} ${plan.set.length} (${changed.length} changed) · ${dryRun ? "would clear" : "cleared"} ${plan.clear.length}`);
    for (const s of changed) console.log(`    ${s.name}: ${s.from ?? "—"} → ${s.to}`);
    for (const c of plan.clear) console.log(`    ${c.name}: ${c.from} → (unranked)`);
    if (plan.noProgramRow.length) {
      console.log(`  ⚠ ranked but no ${file.cip} program row (offered-majors disagree; review):`);
      for (const n of plan.noProgramRow) console.log(`    ${n.name} (#${n.rank})`);
    }
    if (plan.notInCatalog.length) console.log(`  (ignored ${plan.notInCatalog.length} entries not in the catalog)`);

    const rankedNow = rows.filter((r) => r.programRank != null).length;
    if (plan.clear.length > rankedNow / 2) {
      const msg = `would clear ${plan.clear.length} of ${rankedNow} currently-ranked ${file.cip} rows (over 50%): wrong or truncated file?`;
      if (!dryRun && !force) throw new Error(`${path.basename(f)}: refusing, ${msg} Pass --force to proceed.`);
      console.log(`  ⚠ ${msg}${dryRun ? " (a real run needs --force)" : " (--force given)"}`);
    }

    if (dryRun) continue;
    await prisma.$transaction([
      ...plan.set.map((s) => prisma.collegeProgram.update({
        where: { collegeId_cipCode: { collegeId: s.collegeId, cipCode: file.cip } },
        data: { programRank: s.to, programRankSourceClass: "LIST_ORDER" },
      })),
      ...plan.clear.map((c) => prisma.collegeProgram.update({
        where: { collegeId_cipCode: { collegeId: c.collegeId, cipCode: file.cip } },
        data: { programRank: null, programRankSourceClass: null },
      })),
    ]);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
