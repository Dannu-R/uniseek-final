// Upsert reviewed batch files into Postgres.
//
//   npm run colleges:import -- <batch> [<batch> ...] [--dry-run] [--overwrite-protected] [--only-done]
//
// - Keyed on ipedsUnitId, so re-running is safe.
// - Only non-null values are written: a null in the batch never erases DB data.
// - PROTECTED fields (hand-curated admissions numbers from the procedures doc) are
//   only filled when the DB value is null, unless --overwrite-protected.
// - Programs: each controlled Major in the college's majorsOffered gets a CollegeProgram
//   row. Existing rows are left untouched, so researched per-major admit rates / ranks survive.
// - --dry-run validates and prints the plan; it works even with the DB down.
// - --only-done skips colleges whose status is "partial" (they stay in the batch file for review).

import { Prisma, PrismaClient } from "@prisma/client";
import { CollegeRecord, FIELD_NAMES, type FieldName, batchPath, loadEnv, parseArgs, readBatch } from "./batch";

loadEnv();

const PROTECTED = new Set<FieldName>([
  "admitRate", "admitRateProvenance", "usNewsRank", "usNewsRankProvenance",
  "inStateAdmitRate", "outOfStateAdmitRate",
]);
const DATE_FIELDS = new Set<FieldName>([
  "edDeadline", "ed2Deadline", "eaDeadline", "reaDeadline", "priorityDeadline", "rdDeadline",
]);

function toDb(field: FieldName, value: unknown) {
  return DATE_FIELDS.has(field) ? new Date(`${value}T00:00:00Z`) : value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.has("dry-run");
  const overwriteProtected = args.has("overwrite-protected");
  if (!args.positional.length) throw new Error("usage: npm run colleges:import -- <batch> [...] [--dry-run]");

  const all: CollegeRecord[] = args.positional.flatMap((b) => readBatch(batchPath(b)).colleges);
  const colleges = args.has("only-done") ? all.filter((c) => c.status === "done") : all;
  if (colleges.length !== all.length) {
    console.log(`Skipping ${all.length - colleges.length} partial college(s) (--only-done): ` +
      all.filter((c) => c.status !== "done").map((c) => c.name).join("; "));
  }
  console.log(`Validated ${colleges.length} colleges from ${args.positional.join(", ")}.`);

  const prisma = new PrismaClient();
  let dbUp = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch {
    dbUp = false;
    if (!dryRun) throw new Error("Database unreachable — start it with `npm run db:up` (or pass --dry-run).");
    console.log("(DB unreachable — dry run will treat every college as new.)");
  }

  const majors = dbUp ? await prisma.major.findMany({ select: { cipCode: true, name: true } }) : [];
  let created = 0, updated = 0, programsAdded = 0;
  const protectedSkips: string[] = [];
  const partial = colleges.filter((c) => c.status === "partial").map((c) => c.name);

  for (const c of colleges) {
    const existing = dbUp ? await prisma.college.findUnique({ where: { ipedsUnitId: c.ipedsUnitId } }) : null;
    const data: Record<string, unknown> = { name: c.name };

    for (const f of FIELD_NAMES) {
      const v = c[f];
      if (v == null) continue;
      const current = existing?.[f as keyof typeof existing];
      if (existing && PROTECTED.has(f) && current != null && !overwriteProtected) {
        if (current !== v) protectedSkips.push(`${c.name}.${f}: kept ${String(current)} (batch had ${String(v)})`);
        continue;
      }
      data[f] = toDb(f, v);
    }

    const offered = majors.filter((m) => (c.majorsOffered as string[]).includes(m.cipCode));
    if (dryRun) {
      console.log(`  ${existing ? "update" : "create"} ${c.name} — ${Object.keys(data).length} fields, ` +
        `${dbUp ? offered.length : c.majorsOffered.length} majors`);
      existing ? updated++ : created++;
      continue;
    }

    const row = await prisma.college.upsert({
      where: { ipedsUnitId: c.ipedsUnitId },
      create: { ...(data as Prisma.CollegeCreateInput), ipedsUnitId: c.ipedsUnitId },
      update: data as Prisma.CollegeUpdateInput,
    });
    existing ? updated++ : created++;

    for (const m of offered) {
      await prisma.collegeProgram.upsert({
        where: { collegeId_cipCode: { collegeId: row.id, cipCode: m.cipCode } },
        create: { collegeId: row.id, cipCode: m.cipCode, cipTitle: m.name },
        update: {},
      });
      programsAdded++;
    }
  }

  console.log(`${dryRun ? "[dry run] would create" : "✓ created"} ${created}, ${dryRun ? "update" : "updated"} ${updated}` +
    (dryRun ? "" : `, ensured ${programsAdded} program rows`));
  if (protectedSkips.length) {
    console.log(`\nKept ${protectedSkips.length} hand-curated value(s) (use --overwrite-protected to replace):`);
    for (const s of protectedSkips) console.log(`  ${s}`);
  }
  if (partial.length) console.log(`
⚠  ${partial.length} college(s) only partially researched: ${partial.join("; ")}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
