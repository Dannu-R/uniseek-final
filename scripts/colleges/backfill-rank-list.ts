// One-off: set usNewsRankList on every batch record from its usNewsRank source note
// ("2027 National Liberal Arts Colleges #1" / "2027 National Universities #16 (tie)").
//
//   npx tsx scripts/colleges/backfill-rank-list.ts
//
// Then re-run colleges:import for the batches to write the column to the DB.

import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, readBatch, writeBatch } from "./batch";

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
let lac = 0, nat = 0;
const unknown: string[] = [];

for (const f of files) {
  const file = path.join(DATA_DIR, f);
  const batch = readBatch(file);
  for (const c of batch.colleges) {
    const note = c.sources.usNewsRank?.note ?? "";
    if (/liberal arts/i.test(note)) { c.usNewsRankList = "NATIONAL_LIBERAL_ARTS"; lac++; }
    else if (/national universities/i.test(note)) { c.usNewsRankList = "NATIONAL_UNIVERSITIES"; nat++; }
    else { if (c.usNewsRank != null) unknown.push(`${c.name} (${f})`); continue; }
    c.sources.usNewsRankList = { source: "derived", note: "from the usNewsRank source note" };
  }
  writeBatch(file, batch);
}

console.log(`✓ National Universities ${nat} · Liberal Arts ${lac}`);
if (unknown.length) console.log(`⚠ rank but no recognizable list in the note: ${unknown.join("; ")}`);
