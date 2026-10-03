// Assemble researched college files into a batch file.
//
//   npm run colleges:build -- <batch> [--description "3 largest Georgia publics"]
//
// Reads data/colleges/work/<batch>/<ipedsUnitId>.json (one per college, written by
// Claude via the scrape-colleges skill), validates each, and writes
// data/colleges/<batch>.json with every College field present (null = unknown).
// Colleges already in the batch file are kept; a work file for the same college
// overlays it, so you can re-research one school and rebuild. Safe to re-run.

import fs from "node:fs";
import path from "node:path";
import {
  type BatchFile, CollegeFile, type CollegeRecord, FIELD_NAMES, WORK_DIR, batchPath, formatIssues,
  parseArgs, readBatch, writeBatch,
} from "./batch";

function emptyRecord(f: CollegeFile): CollegeRecord {
  const blank = Object.fromEntries(FIELD_NAMES.map((k) => [k, null]));
  return {
    ...(blank as unknown as CollegeRecord),
    name: f.name,
    ipedsUnitId: f.ipedsUnitId,
    website: null,
    majorsOffered: [],
    status: f.status,
    sources: {},
    notes: [],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const batch = args.positional[0];
  if (!batch || !/^[a-z0-9-]+$/.test(batch)) {
    throw new Error('usage: npm run colleges:build -- <kebab-case-batch> [--description "..."]');
  }

  const file = batchPath(batch);
  const data: BatchFile = fs.existsSync(file)
    ? readBatch(file)
    : { batch, description: "", updatedAt: "", colleges: [] };
  if (args.get("description")) data.description = args.get("description")!;

  const dir = path.join(WORK_DIR, batch);
  const workFiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  if (!workFiles.length && !data.colleges.length) throw new Error(`No college files in ${dir}`);
  const byId = new Map(data.colleges.map((c) => [c.ipedsUnitId, c]));

  let applied = 0;
  const problems: string[] = [];
  for (const f of workFiles) {
    let raw: unknown;
    try { raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch (e) { problems.push(`${f}: not valid JSON (${(e as Error).message})`); continue; }
    const parsed = CollegeFile.safeParse(raw);
    if (!parsed.success) { problems.push(`${f}:\n${formatIssues(parsed.error)}`); continue; }
    const cf = parsed.data;
    if (f !== `${cf.ipedsUnitId}.json`) problems.push(`${f}: file name should be ${cf.ipedsUnitId}.json`);

    const missingSource = Object.keys(cf.fields).filter((k) => !cf.sources[k]);
    if (missingSource.length) problems.push(`${f}: no source for ${missingSource.join(", ")} (built anyway)`);

    const rec = byId.get(cf.ipedsUnitId) ?? emptyRecord(cf);
    Object.assign(rec, cf.fields);
    rec.name = cf.name;
    rec.website = cf.website ?? rec.website;
    if (cf.majorsOffered.length) rec.majorsOffered = [...cf.majorsOffered].sort();
    Object.assign(rec.sources, cf.sources);
    rec.notes = [...new Set([...rec.notes, ...cf.notes])];
    rec.status = cf.status;
    byId.set(cf.ipedsUnitId, rec);
    applied++;
  }

  // Cross-field sanity checks — the kind of mistake zod ranges can't see.
  for (const c of byId.values()) {
    const tag = `${c.name} (${c.ipedsUnitId})`;
    if (c.satP25 != null && c.satP75 != null && c.satP25 > c.satP75) problems.push(`${tag}: satP25 > satP75`);
    if (c.actP25 != null && c.actP75 != null && c.actP25 > c.actP75) problems.push(`${tag}: actP25 > actP75`);
    const c7 = [c.c7Rigor, c.c7Gpa, c.c7Test, c.c7Rank, c.c7Ec, c.c7Service];
    if (c7.some((v) => v != null) && c7.some((v) => v == null)) {
      problems.push(`${tag}: partial C7 vector — the scorer ignores it unless all six are set`);
    }
    if (c.admitRate == null || c.usNewsRank == null) {
      const missing = [c.admitRate == null && "admitRate", c.usNewsRank == null && "usNewsRank"].filter(Boolean).join(" + ");
      problems.push(`${tag}: no ${missing}. The scorer skips it (lib/scoring/mapCollege.ts scorableCollege)`);
    }
    if (c.latitude == null || c.longitude == null) problems.push(`${tag}: no coordinates (distance filter can't use it)`);
    for (const k of ["edDeadline", "ed2Deadline", "eaDeadline", "reaDeadline", "priorityDeadline", "rdDeadline"] as const) {
      if (c[k] && !c.deadlinesCycle) { problems.push(`${tag}: deadlines set without deadlinesCycle`); break; }
    }
    if (c.edDeadline && c.rdDeadline && c.edDeadline >= c.rdDeadline) problems.push(`${tag}: ED deadline not before RD`);
  }

  data.colleges = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  data.updatedAt = new Date().toISOString();
  writeBatch(file, data);

  const partial = data.colleges.filter((c) => c.status === "partial");
  console.log(`✓ built ${path.relative(process.cwd(), file)} — ${data.colleges.length} colleges (${applied} from work files)`);
  console.log(`  done ${data.colleges.length - partial.length} · partial ${partial.length}`);
  for (const c of data.colleges) {
    const filled = FIELD_NAMES.filter((k) => c[k] != null).length;
    console.log(`  ${String(c.ipedsUnitId).padEnd(7)} ${c.name} — ${filled}/${FIELD_NAMES.length} fields, ${c.majorsOffered.length} majors, ${c.status}`);
  }
  if (problems.length) {
    console.log(`\n⚠  ${problems.length} problem(s):\n${problems.map((p) => "  " + p).join("\n")}`);
    process.exitCode = 1;
  }
}

try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
