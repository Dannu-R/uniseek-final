# Major-Specific Program Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `program_quality` read each major's published program rank (US News or Niche) with explicit rules for unranked colleges and uncollected lists, and put Liberal Arts institutional ranks on the national scale.

**Architecture:** A typed config (`lib/scoring/rankingLists.ts`) records which ranking lists have been collected and their sizes. A pure `qualityRank()` turns (major, program rank, institutional rank + list) into a quality rank plus a `basis` label; `programQuality()` is unchanged. Rankings are collected into committed JSON files (`data/rankings/`) and loaded into `CollegeProgram.programRank` by a new `rankings:import` command.

**Tech Stack:** TypeScript, Next.js 16, Prisma 6 (Postgres via docker compose), zod 4, vitest, tsx. Data collection uses Claude in Chrome (read-only).

**Spec:** `docs/superpowers/specs/2026-10-03-major-specific-program-quality-design.md`

## Global Constraints

- `programQuality(rank)` stays exactly `clip(1.157 - 0.1425 * ln(rank), 0.45, 1.0)` — no new parameters (§10b).
- Institutional list sizes (US News 2027): National Universities **428**, National Liberal Arts **206**.
- LAC conversion: `max(1, round(lacRank / 206 × 428))`.
- Unranked on a collected list: rank = `size + 1`.
- Work happens on branch `major-program-quality`; commit after each task; never push.
- Every DB write path gets a `--dry-run` first; colleges:import keeps `--only-done`.
- Chrome use is read-only, own tab, never sign in, close the tab after.
- Run the full suite with `npx vitest run` (baseline: 7 files, 76 tests passing).
- Postgres must be up for Tasks 2, 3, 5, 9 (`npm run db:up`).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `lib/scoring/rankingLists.ts` | Create | Config: institutional list sizes + collected program lists |
| `lib/scoring/quality.ts` | Modify | `qualityRank()` rules R1/R1-finance/R2/R3; `programQuality()` unchanged |
| `lib/scoring/recommend.test.ts` | Modify | Unit tests for `qualityRank()` |
| `lib/scoring/types.ts` | Modify | `CollegeInput.usNewsRankList`, `CollegeInput.fallbackProgramRank` |
| `lib/scoring/mapCollege.ts` | Modify | Map new fields; find Finance→Business fallback row |
| `lib/scoring/score.ts` | Modify | Call new `qualityRank`; flag the basis |
| `lib/scoring/score.test.ts` | Modify | Orchestration test for the basis flag + LAC conversion |
| `prisma/schema.prisma` + migration | Modify/Create | `enum UsNewsRankList`, `College.usNewsRankList` |
| `prisma/seed.ts` | Modify | Stop overwriting `programRank` on re-seed |
| `scripts/colleges/batch.ts` | Modify | `usNewsRankList` batch field |
| `scripts/colleges/backfill-rank-list.ts` | Create | One-off: derive `usNewsRankList` from batch source notes |
| `scripts/rankings/schema.ts` | Create | zod schema for ranking files + config check |
| `scripts/rankings/plan.ts` | Create | Pure planner: which program ranks to set/clear |
| `scripts/rankings/plan.test.ts` | Create | Tests for planner + config check |
| `scripts/rankings/import.ts` | Create | `rankings:import` (DB I/O, dry-run) |
| `data/rankings/*.json` | Create | Collected ranking lists (committed) |
| `.claude/skills/scrape-colleges/**` | Modify/Create | Skill update (Task 10) |

---

### Task 1: Ranking-list config and the quality-rank rules

**Files:**
- Create: `lib/scoring/rankingLists.ts`
- Modify: `lib/scoring/quality.ts`
- Modify: `lib/scoring/recommend.test.ts:75-79` (the old `qualityRank` test)
- Modify: `docs/superpowers/specs/2026-10-03-major-specific-program-quality-design.md` (R2 amendment)

**Interfaces:**
- Produces: `RANKING_LISTS: RankingLists`, types `InstitutionalList`, `ProgramList`, `RankingLists` (from `rankingLists.ts`); `qualityRank(input: QualityRankInput, lists?: RankingLists): QualityRankResult`, `QualityBasis` (from `quality.ts`).

- [ ] **Step 1: Amend the spec's R2 rule (keeps today's researched CS ranks working until lists are collected)**

In the spec, replace the R2 bullet with:

```markdown
- **R2 — major named, its list not yet collected:** the college's program rank if it
  has one anyway (individually researched, §18b — e.g. the seeded CS ranks);
  otherwise the institutional rank, normalized as in R3. (Today's behavior; a
  safety net while lists are filled in.)
```

- [ ] **Step 2: Write the failing tests**

In `lib/scoring/recommend.test.ts`, delete only the `it("picks program rank in a major run, institutional otherwise", …)` block (lines 75–79, inside `describe("program_quality (§10b)")`; keep the two `programQuality` tests), then add this new `describe` after that block's closing `});`:

```ts
describe("qualityRank (§10b, major-specific with collected lists)", () => {
  const LISTS: RankingLists = {
    institutional: {
      NATIONAL_UNIVERSITIES: { edition: "t", size: 400 },
      NATIONAL_LIBERAL_ARTS: { edition: "t", size: 200 },
    },
    programs: {
      "11.0701": { source: "USNEWS", listKey: "cs", url: "https://x.test/cs", edition: "t", size: 587 },
      "52.0201": { source: "USNEWS", listKey: "biz", url: "https://x.test/biz", edition: "t", size: 535 },
      "52.0801": { source: "USNEWS", listKey: "fin", url: "https://x.test/fin", edition: "t", size: 46, fallbackCip: "52.0201" },
    },
  };
  const base: QualityRankInput = {
    majorCip: null,
    institutionalRank: 32,
    institutionalList: "NATIONAL_UNIVERSITIES",
    programRank: null,
    fallbackProgramRank: null,
  };

  it("R1: collected list, college ranked → its program rank", () => {
    expect(qualityRank({ ...base, majorCip: "11.0701", programRank: 5 }, LISTS)).toEqual({ rank: 5, basis: "program" });
  });
  it("R1: collected list, college absent → just past the end", () => {
    expect(qualityRank({ ...base, majorCip: "11.0701" }, LISTS)).toEqual({ rank: 588, basis: "program-unranked" });
  });
  it("R2: list not collected → institutional rank", () => {
    expect(qualityRank({ ...base, majorCip: "26.0101" }, LISTS)).toEqual({ rank: 32, basis: "institutional" });
  });
  it("R2: list not collected but an individually researched program rank exists → use it", () => {
    expect(qualityRank({ ...base, majorCip: "26.0101", programRank: 7 }, LISTS)).toEqual({ rank: 7, basis: "program" });
  });
  it("R2: list not collected, LAC → converted institutional rank", () => {
    const r = qualityRank({ ...base, majorCip: "26.0101", institutionalRank: 3, institutionalList: "NATIONAL_LIBERAL_ARTS" }, LISTS);
    expect(r).toEqual({ rank: 6, basis: "institutional-lac-converted" }); // round(3/200*400)
  });
  it("R3: no major, national university → unchanged", () => {
    expect(qualityRank(base, LISTS)).toEqual({ rank: 32, basis: "institutional" });
  });
  it("R3: no major, LAC #22 → national-equivalent #44", () => {
    const r = qualityRank({ ...base, institutionalRank: 22, institutionalList: "NATIONAL_LIBERAL_ARTS" }, LISTS);
    expect(r).toEqual({ rank: 44, basis: "institutional-lac-converted" });
  });
  it("R3: conversion never goes below 1", () => {
    const big: RankingLists = { ...LISTS, institutional: { ...LISTS.institutional, NATIONAL_LIBERAL_ARTS: { edition: "t", size: 2000 } } };
    const r = qualityRank({ ...base, institutionalRank: 1, institutionalList: "NATIONAL_LIBERAL_ARTS" }, big);
    expect(r.rank).toBe(1); // round(0.2) = 0 → clamped
  });
  it("R3: unknown list (null) is treated as National Universities", () => {
    expect(qualityRank({ ...base, institutionalList: null }, LISTS)).toEqual({ rank: 32, basis: "institutional" });
  });
  it("R1-finance: finance specialty rank wins", () => {
    expect(qualityRank({ ...base, majorCip: "52.0801", programRank: 3, fallbackProgramRank: 12 }, LISTS)).toEqual({ rank: 3, basis: "program" });
  });
  it("R1-finance: no finance rank → Business rank", () => {
    expect(qualityRank({ ...base, majorCip: "52.0801", fallbackProgramRank: 12 }, LISTS)).toEqual({ rank: 12, basis: "fallback-program" });
  });
  it("R1-finance: no finance or Business rank → past the end of Business", () => {
    expect(qualityRank({ ...base, majorCip: "52.0801" }, LISTS)).toEqual({ rank: 536, basis: "program-unranked" });
  });
  it("R1-finance: Business list not collected → R2", () => {
    const noBiz: RankingLists = { ...LISTS, programs: { "52.0801": LISTS.programs["52.0801"] } };
    expect(qualityRank({ ...base, majorCip: "52.0801" }, noBiz)).toEqual({ rank: 32, basis: "institutional" });
  });
});
```

And update the imports at the top of `recommend.test.ts`:

```ts
import { programQuality, qualityRank, type QualityRankInput } from "./quality";
import type { RankingLists } from "./rankingLists";
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/scoring/recommend.test.ts`
Expected: FAIL — `Cannot find module './rankingLists'` / type errors on `qualityRank`.

- [ ] **Step 4: Create `lib/scoring/rankingLists.ts`**

```ts
// §10b — which published ranking lists feed program_quality, and how long each is.
//
// A major present in RANKING_LISTS.programs means its list HAS BEEN COLLECTED into
// data/rankings/ and imported: a college missing from it is unranked (rank = size + 1).
// A major absent here falls back to the institutional rank (see quality.ts R2).
// Sizes are the "N results" counts shown on each list page.

export type InstitutionalList = "NATIONAL_UNIVERSITIES" | "NATIONAL_LIBERAL_ARTS";

export interface ListMeta {
  edition: string;
  size: number;
}

export interface ProgramList extends ListMeta {
  source: "USNEWS" | "NICHE";
  listKey: string; // the list's slug on its source site
  url: string;
  fallbackCip?: string; // Finance → Business (52.0201) when the specialty list is short
}

export interface RankingLists {
  institutional: Record<InstitutionalList, ListMeta>;
  programs: Record<string, ProgramList>; // keyed by CIP code
}

export const RANKING_LISTS: RankingLists = {
  institutional: {
    NATIONAL_UNIVERSITIES: { edition: "2027", size: 428 },
    NATIONAL_LIBERAL_ARTS: { edition: "2027", size: 206 },
  },
  // Filled in as each list is collected and imported (plan Task 9).
  programs: {},
};
```

- [ ] **Step 5: Rewrite `qualityRank` in `lib/scoring/quality.ts`**

Replace the existing `qualityRank` function (keep `programQuality` and the file header) with:

```ts
import { RANKING_LISTS, type InstitutionalList, type RankingLists } from "./rankingLists";

export type QualityBasis =
  | "program" // the college's rank on the major's list (or an individually researched one)
  | "program-unranked" // list collected, college not on it → size + 1
  | "fallback-program" // Finance → the college's Business rank
  | "institutional" // overall US News rank (National Universities scale)
  | "institutional-lac-converted"; // Liberal Arts rank mapped onto the national scale

export interface QualityRankInput {
  majorCip: string | null | undefined;
  institutionalRank: number;
  institutionalList: InstitutionalList | null | undefined;
  programRank: number | null | undefined; // rank for majorCip
  fallbackProgramRank: number | null | undefined; // rank for the list's fallbackCip
}

export interface QualityRankResult {
  rank: number;
  basis: QualityBasis;
}

// R3: institutional rank, with Liberal Arts ranks converted by percentile of their list.
function institutionalQualityRank(rank: number, list: InstitutionalList | null | undefined, lists: RankingLists): QualityRankResult {
  if (list === "NATIONAL_LIBERAL_ARTS") {
    const lac = lists.institutional.NATIONAL_LIBERAL_ARTS.size;
    const nat = lists.institutional.NATIONAL_UNIVERSITIES.size;
    return { rank: Math.max(1, Math.round((rank / lac) * nat)), basis: "institutional-lac-converted" };
  }
  return { rank, basis: "institutional" };
}

// §10b rank selection (spec rules R1, R1-finance, R2, R3).
export function qualityRank(input: QualityRankInput, lists: RankingLists = RANKING_LISTS): QualityRankResult {
  const list = input.majorCip ? lists.programs[input.majorCip] : undefined;

  if (!list) {
    // R2 (major named, list not collected) or R3 (no major).
    if (input.majorCip && input.programRank != null) return { rank: input.programRank, basis: "program" };
    return institutionalQualityRank(input.institutionalRank, input.institutionalList, lists);
  }

  // R1: the major's list has been collected.
  if (input.programRank != null) return { rank: input.programRank, basis: "program" };

  if (list.fallbackCip) {
    // R1-finance: short specialty list → fall back to the broader list.
    const fallback = lists.programs[list.fallbackCip];
    if (!fallback) return institutionalQualityRank(input.institutionalRank, input.institutionalList, lists);
    if (input.fallbackProgramRank != null) return { rank: input.fallbackProgramRank, basis: "fallback-program" };
    return { rank: fallback.size + 1, basis: "program-unranked" };
  }

  return { rank: list.size + 1, basis: "program-unranked" };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run lib/scoring/recommend.test.ts`
Expected: PASS. Full suite: `npx vitest run` → 88 tests (76 − 1 removed + 13 new). (`score.ts` won't type-check yet — that's Task 2; vitest doesn't type-check.)

- [ ] **Step 7: Commit**

```bash
git add lib/scoring/rankingLists.ts lib/scoring/quality.ts lib/scoring/recommend.test.ts docs/superpowers/specs/2026-10-03-major-specific-program-quality-design.md
git commit -m "Add ranking-list config and major-specific quality-rank rules"
```

---

### Task 2: Schema column + wire the rules into scoring

**Files:**
- Modify: `prisma/schema.prisma` (College model + new enum)
- Create: migration via `npx prisma migrate dev --name add_usnews_rank_list`
- Modify: `lib/scoring/types.ts` (`CollegeInput`)
- Modify: `lib/scoring/mapCollege.ts`
- Modify: `lib/scoring/score.ts:99-100`
- Modify: `lib/scoring/score.test.ts`

**Interfaces:**
- Consumes: `qualityRank`, `QualityRankInput` (Task 1), `RANKING_LISTS`, `InstitutionalList`.
- Produces: `CollegeInput.usNewsRankList?: InstitutionalList | null`, `CollegeInput.fallbackProgramRank?: number | null`; Prisma `College.usNewsRankList` (`UsNewsRankList` enum); each `CollegeScore.flags` gains `quality rank <n> (<basis>)`.

- [ ] **Step 1: Capture the before-picture**

Run: `npx tsx scripts/score-demo.ts > "$TEMP/score-demo-before.txt"; head -20 "$TEMP/score-demo-before.txt"`
Expected: the CS run list (Williams appears as a reach with q 1.00). Keep the file for Task 9.

- [ ] **Step 2: Write the failing orchestration test**

Append to `lib/scoring/score.test.ts`:

```ts
describe("program quality basis (§10b)", () => {
  it("converts a Liberal Arts rank onto the national scale in a general run", () => {
    const lac = scoreCollege(student(), college({ usNewsRank: 3, usNewsRankList: "NATIONAL_LIBERAL_ARTS" }));
    const nat = scoreCollege(student(), college({ usNewsRank: 3, usNewsRankList: "NATIONAL_UNIVERSITIES" }));
    expect(lac.quality).toBeLessThan(nat.quality); // LAC #3 ≈ national #6
    expect(lac.flags).toContain("quality rank 6 (institutional-lac-converted)");
    expect(nat.flags).toContain("quality rank 3 (institutional)");
  });

  it("keeps an individually researched program rank when the list isn't collected", () => {
    const c = college({ majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 5 } });
    const s = scoreCollege(student({ majorCip: "11.0701" }), c);
    expect(s.flags).toContain("quality rank 5 (program)");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run lib/scoring/score.test.ts`
Expected: FAIL — flags don't contain `quality rank …`.

- [ ] **Step 4: Add the schema enum and column**

In `prisma/schema.prisma`, add after the `ProgramRankSourceClass` enum:

```prisma
// Which US News institutional list `usNewsRank` comes from. The lists aren't
// comparable; scoring converts Liberal Arts ranks to the national scale (§10b).
enum UsNewsRankList {
  NATIONAL_UNIVERSITIES
  NATIONAL_LIBERAL_ARTS
}
```

and in `model College`, directly under `usNewsRankProvenance`:

```prisma
  usNewsRankList       UsNewsRankList? // null = treat as National Universities
```

Run: `npm run db:up && npx prisma migrate dev --name add_usnews_rank_list`
Expected: a new folder `prisma/migrations/<timestamp>_add_usnews_rank_list/` with `CREATE TYPE "UsNewsRankList"` and `ALTER TABLE "College" ADD COLUMN "usNewsRankList"`; client regenerated.

- [ ] **Step 5: Extend `CollegeInput` in `lib/scoring/types.ts`**

Add the import at the top: `import type { InstitutionalList } from "./rankingLists";`
In `interface CollegeInput`, under `usNewsRank: number;` add:

```ts
  usNewsRankList?: InstitutionalList | null; // which US News list usNewsRank is on
```

and under `majorProgram?: …` add:

```ts
  fallbackProgramRank?: number | null; // rank on the fallback list (Finance → Business), §10b
```

- [ ] **Step 6: Map the new fields in `lib/scoring/mapCollege.ts`**

Add `import { RANKING_LISTS } from "./rankingLists";`. In `mapCollege`, after the `const program = …` line add:

```ts
  const fallbackCip = majorCip ? RANKING_LISTS.programs[majorCip]?.fallbackCip : undefined;
  const fallback = fallbackCip ? c.programs.find((p) => p.cipCode === fallbackCip) ?? null : null;
```

and in the returned object, after `usNewsRank: c.usNewsRank!,` add `usNewsRankList: c.usNewsRankList ?? null,`; after the `majorProgram: …` property add `fallbackProgramRank: fallback?.programRank ?? null,`.

- [ ] **Step 7: Use the new rules in `lib/scoring/score.ts`**

Replace lines 99–100:

```ts
  const rankForQuality = qualityRank(college.usNewsRank, college.majorProgram?.programRank, majorNamed);
  const quality = programQuality(rankForQuality);
```

with:

```ts
  const q = qualityRank({
    majorCip: student.majorCip,
    institutionalRank: college.usNewsRank,
    institutionalList: college.usNewsRankList,
    programRank: college.majorProgram?.programRank,
    fallbackProgramRank: college.fallbackProgramRank,
  });
  flags.push(`quality rank ${q.rank} (${q.basis})`);
  const quality = programQuality(q.rank);
```

- [ ] **Step 8: Run the full suite and the type check**

Run: `npx vitest run && npx tsc --noEmit -p . 2>&1 | grep -E "lib/scoring|scripts/" ; echo done`
Expected: 90 tests PASS (88 + 2 new), no type errors listed before `done`.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/scoring/types.ts lib/scoring/mapCollege.ts lib/scoring/score.ts lib/scoring/score.test.ts
git commit -m "Score program quality with list-aware ranks and record the basis"
```

---

### Task 3: Record which US News list each college is on

**Files:**
- Modify: `scripts/colleges/batch.ts` (`CollegeFields`)
- Create: `scripts/colleges/backfill-rank-list.ts`
- Modify: `data/colleges/*.json` (by running the script)

**Interfaces:**
- Consumes: Prisma `College.usNewsRankList` (Task 2).
- Produces: `usNewsRankList` on every batch record; DB column populated for the 102 imported batch colleges (the 29 seeded-only colleges stay null = national).

- [ ] **Step 1: Add the field to the batch schema**

In `scripts/colleges/batch.ts`, in `CollegeFields` directly after `usNewsRankProvenance: …`, add:

```ts
  usNewsRankList: z.enum(["NATIONAL_UNIVERSITIES", "NATIONAL_LIBERAL_ARTS"]).nullable().default(null),
```

(`.default(null)` lets existing batch files without the key still validate.)

- [ ] **Step 2: Write the backfill script**

Create `scripts/colleges/backfill-rank-list.ts`:

```ts
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
```

- [ ] **Step 3: Run the backfill**

Run: `npx tsx scripts/colleges/backfill-rank-list.ts`
Expected: `✓ National Universities 90 · Liberal Arts 22` (counts include the 10 partial colleges in the batch files) and **no** `⚠` line. If a `⚠` line appears, open that college's batch record, read its `usNewsRank` source note, and set `usNewsRankList` by hand.

- [ ] **Step 4: Write the column to the DB**

Run:
```bash
npm run colleges:import -- georgia-large-publics tulane-rice-wake-forest ma-selective-privates vanderbilt usnews-2027-next --only-done --dry-run
npm run colleges:import -- georgia-large-publics tulane-rice-wake-forest ma-selective-privates vanderbilt usnews-2027-next --only-done
docker exec uniseek-postgres psql -U uniseek -d uniseek -At -c "SELECT \"usNewsRankList\", count(*) FROM \"College\" GROUP BY 1 ORDER BY 1;"
```
Expected: dry run lists 0 creates; real import "created 0, updated 102"; query shows `NATIONAL_LIBERAL_ARTS|21`, `NATIONAL_UNIVERSITIES|81`, `|29` (seeded colleges not in any batch; null = national).

- [ ] **Step 5: Commit**

```bash
git add scripts/colleges/batch.ts scripts/colleges/backfill-rank-list.ts data/colleges/*.json
git commit -m "Record which US News list each college's rank comes from"
```

---

### Task 4: Ranking-file schema and the import planner (pure)

**Files:**
- Create: `scripts/rankings/schema.ts`
- Create: `scripts/rankings/plan.ts`
- Test: `scripts/rankings/plan.test.ts`

**Interfaces:**
- Consumes: `RankingLists` (Task 1).
- Produces: `RankingFile` (zod) + `type RankingFile`; `RANKINGS_DIR`; `checkAgainstConfig(file: RankingFile, lists: RankingLists): string[]`; `planRankingUpdates(file: RankingFile, rows: ProgramRow[], catalog: Map<number, CatalogCollege>): RankingPlan`; types `ProgramRow`, `CatalogCollege`, `RankingPlan`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/rankings/plan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkAgainstConfig, RankingFile } from "./schema";
import { planRankingUpdates, type ProgramRow, type CatalogCollege } from "./plan";
import type { RankingLists } from "../../lib/scoring/rankingLists";

const file = RankingFile.parse({
  source: "USNEWS", edition: "2027", cip: "11.0701", listKey: "computer-science-overall",
  url: "https://www.usnews.com/best-colleges/rankings/computer-science-overall", size: 587, collectedAt: "2026-10-04",
  entries: [
    { ipedsUnitId: 1, name: "A", rank: 5 },
    { ipedsUnitId: 2, name: "B", rank: 40, tie: true },
    { ipedsUnitId: 3, name: "C", rank: 541, band: "#541-587" },
    { ipedsUnitId: 9, name: "Not in catalog", rank: 60 },
  ],
});

const catalog = new Map<number, CatalogCollege>([
  [1, { collegeId: "a", name: "A" }],
  [2, { collegeId: "b", name: "B" }],
  [3, { collegeId: "c", name: "C" }],
  [4, { collegeId: "d", name: "D" }],
]);

const rows: ProgramRow[] = [
  { collegeId: "a", ipedsUnitId: 1, name: "A", programRank: 5 }, // unchanged rank
  { collegeId: "b", ipedsUnitId: 2, name: "B", programRank: 20 }, // stale estimate
  { collegeId: "d", ipedsUnitId: 4, name: "D", programRank: 92 }, // not on the list any more
  // C (id 3) offers no CS row
];

describe("planRankingUpdates", () => {
  const plan = planRankingUpdates(file, rows, catalog);

  it("sets every listed college that has a program row (rank + LIST_ORDER)", () => {
    expect(plan.set).toEqual([
      { collegeId: "a", name: "A", from: 5, to: 5 },
      { collegeId: "b", name: "B", from: 20, to: 40 },
    ]);
  });
  it("clears ranks of catalog colleges absent from a collected list", () => {
    expect(plan.clear).toEqual([{ collegeId: "d", name: "D", from: 92 }]);
  });
  it("reports ranked colleges with no program row instead of creating one", () => {
    expect(plan.noProgramRow).toEqual([{ ipedsUnitId: 3, name: "C", rank: 541 }]);
  });
  it("reports entries that aren't in the catalog", () => {
    expect(plan.notInCatalog).toEqual([{ ipedsUnitId: 9, name: "Not in catalog" }]);
  });
});

describe("RankingFile + checkAgainstConfig", () => {
  const lists: RankingLists = {
    institutional: { NATIONAL_UNIVERSITIES: { edition: "2027", size: 428 }, NATIONAL_LIBERAL_ARTS: { edition: "2027", size: 206 } },
    programs: { "11.0701": { source: "USNEWS", listKey: "computer-science-overall", url: "u", edition: "2027", size: 587 } },
  };

  it("passes when the file matches its config entry", () => {
    expect(checkAgainstConfig(file, lists)).toEqual([]);
  });
  it("errors when the major isn't registered in RANKING_LISTS", () => {
    expect(checkAgainstConfig(file, { ...lists, programs: {} })[0]).toMatch(/not registered/);
  });
  it("errors on size or edition mismatch", () => {
    const wrong = { ...lists, programs: { "11.0701": { ...lists.programs["11.0701"], size: 600, edition: "2026" } } };
    const errs = checkAgainstConfig(file, wrong);
    expect(errs.some((e) => e.includes("size"))).toBe(true);
    expect(errs.some((e) => e.includes("edition"))).toBe(true);
  });
  it("rejects duplicate colleges and ranks beyond the list size", () => {
    const bad = { ...file, entries: [{ ipedsUnitId: 1, name: "A", rank: 5 }, { ipedsUnitId: 1, name: "A", rank: 600 }] };
    expect(RankingFile.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/rankings/plan.test.ts`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 3: Create `scripts/rankings/schema.ts`**

```ts
// Shape of a collected ranking list: data/rankings/<source>-<edition>-<listKey>.json
// One file per (source, list). Entries cover only colleges in the Uniseek catalog;
// a catalog college that offers the major but is absent from `entries` is unranked.

import path from "node:path";
import { z } from "zod";
import type { RankingLists } from "../../lib/scoring/rankingLists";

export const RANKINGS_DIR = path.resolve("data", "rankings");

export const RankingEntry = z.object({
  ipedsUnitId: z.number().int().positive(),
  name: z.string().min(1),
  rank: z.number().int().positive(), // for a range like "#541-587", its first number
  tie: z.boolean().default(false),
  band: z.string().nullable().default(null), // the range as shown, e.g. "#541-587"
});

export const RankingFile = z
  .object({
    source: z.enum(["USNEWS", "NICHE"]),
    edition: z.string().min(1),
    cip: z.string().regex(/^\d{2}\.\d{4}$/),
    listKey: z.string().min(1),
    url: z.string().url(),
    size: z.number().int().positive(), // the list's "N results"
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(RankingEntry),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<number>();
    for (const e of f.entries) {
      if (seen.has(e.ipedsUnitId)) ctx.addIssue({ code: "custom", message: `duplicate ipedsUnitId ${e.ipedsUnitId}` });
      seen.add(e.ipedsUnitId);
      if (e.rank > f.size) ctx.addIssue({ code: "custom", message: `${e.name}: rank ${e.rank} > list size ${f.size}` });
    }
  });
export type RankingFile = z.infer<typeof RankingFile>;

// The file must match its RANKING_LISTS entry, so scoring's "size + 1" is right.
export function checkAgainstConfig(file: RankingFile, lists: RankingLists): string[] {
  const cfg = lists.programs[file.cip];
  if (!cfg) return [`${file.cip} is not registered in RANKING_LISTS.programs (lib/scoring/rankingLists.ts)`];
  const errs: string[] = [];
  if (cfg.source !== file.source) errs.push(`source ${file.source} ≠ config ${cfg.source}`);
  if (cfg.listKey !== file.listKey) errs.push(`listKey ${file.listKey} ≠ config ${cfg.listKey}`);
  if (cfg.size !== file.size) errs.push(`size ${file.size} ≠ config ${cfg.size}`);
  if (cfg.edition !== file.edition) errs.push(`edition ${file.edition} ≠ config ${cfg.edition}`);
  return errs;
}
```

- [ ] **Step 4: Create `scripts/rankings/plan.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/rankings/plan.test.ts`
Expected: PASS (8 tests). Full suite: 98 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/rankings/schema.ts scripts/rankings/plan.ts scripts/rankings/plan.test.ts
git commit -m "Add ranking-file schema and a pure planner for program-rank imports"
```

---

### Task 5: `rankings:import` command + stop the seed overwriting program ranks

**Files:**
- Create: `scripts/rankings/import.ts`
- Modify: `package.json` (scripts)
- Modify: `prisma/seed.ts` (CS program upsert, ~line 364)
- Create: `data/rankings/.gitkeep`

**Interfaces:**
- Consumes: `RankingFile`, `RANKINGS_DIR`, `checkAgainstConfig` (Task 4), `planRankingUpdates` (Task 4), `RANKING_LISTS` (Task 1), `loadEnv`, `parseArgs` from `scripts/colleges/batch.ts`.
- Produces: `npm run rankings:import -- [<file> ...] [--dry-run]`.

- [ ] **Step 1: Write `scripts/rankings/import.ts`**

```ts
// Load collected ranking lists into CollegeProgram.programRank.
//
//   npm run rankings:import -- [data/rankings/<file>.json ...] [--dry-run]
//
// With no files, imports every *.json in data/rankings/. For each file:
// - validates it and checks it against RANKING_LISTS (register the list there first);
// - sets programRank + programRankSourceClass = LIST_ORDER on existing program rows;
// - clears programRank on catalog colleges absent from the list (stale estimates);
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
    const parsed = RankingFile.safeParse(JSON.parse(fs.readFileSync(f, "utf8")));
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
```

- [ ] **Step 2: Register the npm script and the data folder**

In `package.json` `scripts`, after `"colleges:import": …,` add:

```json
    "rankings:import": "tsx scripts/rankings/import.ts",
```

Run: `mkdir -p data/rankings && touch data/rankings/.gitkeep`

- [ ] **Step 3: Verify the command fails cleanly with no files**

Run: `npm run rankings:import -- --dry-run`
Expected: exits 1 with `No ranking files in …data\rankings`.

- [ ] **Step 4: Stop the seed overwriting program ranks**

The Dockerfile re-runs the seed on every production start; today it would reset imported ranks to the 2026 estimates. In `prisma/seed.ts`, replace the CS program upsert:

```ts
    await prisma.collegeProgram.upsert({
      where: { collegeId_cipCode: { collegeId: row.id, cipCode: CS } },
      update: cs as Prisma.CollegeProgramUncheckedUpdateInput,
      create: { collegeId: row.id, cipCode: CS, ...cs } as Prisma.CollegeProgramUncheckedCreateInput,
    });
```

with:

```ts
    // Program ranks are owned by rankings:import once lists are collected, so the
    // seed only sets them when it first creates the row (it re-runs on every deploy).
    const { programRank: _rank, programRankSourceClass: _rankSrc, ...csAdmissions } = cs;
    await prisma.collegeProgram.upsert({
      where: { collegeId_cipCode: { collegeId: row.id, cipCode: CS } },
      update: csAdmissions as Prisma.CollegeProgramUncheckedUpdateInput,
      create: { collegeId: row.id, cipCode: CS, ...cs } as Prisma.CollegeProgramUncheckedCreateInput,
    });
```

- [ ] **Step 5: Type-check and run the suite**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "scripts/|prisma/seed" ; npx vitest run`
Expected: no type errors listed; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/rankings/import.ts package.json data/rankings/.gitkeep prisma/seed.ts
git commit -m "Add rankings:import and keep the seed from resetting program ranks"
```

---

### Task 6: Niche spike (one major) — no code

**Goal:** decide whether Niche lists can be collected reliably before spending on 10 majors.

- [ ] **Step 1: Run the probe** (subagent with Claude in Chrome; load `anthropic-skills:chrome-browser` first; own tab, read-only, never sign in)

Probe `https://www.niche.com/colleges/search/best-colleges-for-biology/` and answer:
1. Does the page load in Chrome (not a bot wall)? Is the list's total count shown (record it)?
2. How is it paged (`?page=N`), and how many colleges per page?
3. Can rank, name and city/state be read per card (text, `find`, or `javascript_tool` on `document.body.innerText`)?
4. Time per page, and whether 10+ consecutive pages load without a challenge.
5. Do the exact Niche list URLs exist for: political science, English, mathematics, chemistry, communications, psychology, mechanical engineering, electrical engineering, computer engineering? Record each URL and total count.

- [ ] **Step 2: Decide and record**

Append the findings to the spec under a new heading `## Niche spike result`, whose first line is `Run on: <date of the run, YYYY-MM-DD>`. Decision rule: **go** if pages load reliably and the counts are readable → Task 8 collects Niche majors; **no-go** otherwise → those majors stay out of `PROGRAM_LISTS` (rule R2 applies) and Task 8 is skipped.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-03-major-specific-program-quality-design.md
git commit -m "Record the Niche collection spike result"
```

---

### Task 7: Collect US News program ranks

**Files:**
- Create: `data/rankings/usnews-2027-computer-science-overall.json`, `usnews-2027-business-overall.json`, `usnews-2027-economics-overall.json`, `usnews-2027-nursing-overall.json`, `usnews-2027-business-finance.json`

**List metadata (from the 2026-10-03 coverage check):**

| cip | listKey | size |
|---|---|---|
| 11.0701 | computer-science-overall | 587 |
| 52.0201 | business-overall | 535 |
| 45.0601 | economics-overall | 237 |
| 51.3801 | nursing-overall | 671 |
| 52.0801 | business-finance | 46 |

URL pattern: `https://www.usnews.com/best-colleges/rankings/<listKey>`. Before writing, re-read each list page's "N results"; if it differs from the table, use the page's number and note it.

- [ ] **Step 1: Export the catalog for the collector**

Run: `docker exec uniseek-postgres psql -U uniseek -d uniseek -At -F '|' -c "SELECT \"ipedsUnitId\", name, state FROM \"College\" ORDER BY name;" > data/rankings/catalog.tmp.txt; wc -l data/rankings/catalog.tmp.txt`
Expected: 131 lines.

- [ ] **Step 2: Collect** (subagent with Claude in Chrome; load `anthropic-skills:chrome-browser` first; one own tab, read-only, never sign in, close at end)

For each catalog college, open its US News profile and then `/overall-rankings` (e.g. `https://www.usnews.com/best-colleges/rice-university-3604/overall-rankings`). Find the profile slug from the National Universities / Liberal Arts list pages' links, or via the site's own search box. Read its ranks in Computer Science, Business, Economics, Nursing and Finance. Fetching the page from inside the usnews.com tab and reading the text is fine. Ranks may be exact ("#21 (tie)") or a band ("#541-587"). For a band, `rank` = first number and `band` = the text. Absent → leave the college out of that file.

Write the five files in the `RankingFile` shape (`scripts/rankings/schema.ts`): `source: "USNEWS"`, `edition: "2027"`, `collectedAt` = run date, entries sorted by rank. Report any college whose page couldn't be read.

- [ ] **Step 3: Validate the files' shape**

Run: `npx tsx -e "import fs from 'node:fs'; import { RankingFile } from './scripts/rankings/schema'; for (const f of fs.readdirSync('data/rankings').filter(f=>f.startsWith('usnews-'))) { const r = RankingFile.safeParse(JSON.parse(fs.readFileSync('data/rankings/'+f,'utf8'))); console.log(f, r.success ? 'ok '+r.data.entries.length : r.error.issues[0].message) }"`
Expected: five `ok <n>` lines. Sanity: Carnegie Mellon / MIT / Stanford are #1 (tie) in CS.

- [ ] **Step 4: Commit**

```bash
rm data/rankings/catalog.tmp.txt
git add data/rankings/usnews-2027-*.json
git commit -m "Add US News 2027 program ranks for the catalog (CS, Business, Economics, Nursing, Finance)"
```

---

### Task 8: Collect Niche program ranks (only if Task 6 said go)

**Files:**
- Create: `data/rankings/niche-2027-<listKey>.json` for each major that passed the spike (biology, political science, English, mathematics, chemistry, communications, psychology, mechanical / electrical / computer engineering)

- [ ] **Step 1: Collect** (subagent with Claude in Chrome, same rules as Task 7)

For each Niche list from the spike: page through until every catalog college (`data/rankings/catalog.tmp.txt`, re-exported as in Task 7 Step 1) has been seen or the list ends. Record catalog colleges only: `{ ipedsUnitId, name, rank, tie }`. Match names to the catalog by name + state, and report any doubtful matches instead of guessing. `size` = the list's total count from the spike. `source: "NICHE"`, `edition` = the edition year Niche shows (e.g. "2027"), and `listKey` = the URL slug (e.g. `best-colleges-for-biology`).

- [ ] **Step 2: Validate and commit**

Run the Task 7 Step 3 validation command with `startsWith('niche-')` instead of `'usnews-'`.
Expected: one `ok <n>` line per file.

```bash
rm -f data/rankings/catalog.tmp.txt
git add data/rankings/niche-2027-*.json
git commit -m "Add Niche 2027 program ranks for the catalog"
```

---

### Task 9: Register the lists, import, and verify

**Files:**
- Modify: `lib/scoring/rankingLists.ts` (`programs`)

**Interfaces:**
- Consumes: the ranking files (Tasks 7–8), `rankings:import` (Task 5).

- [ ] **Step 1: Register each collected list**

Fill `RANKING_LISTS.programs` with one entry per committed file, copying `source`, `listKey`, `edition`, `size`, `url` from the file. Finance gets `fallbackCip: "52.0201"`. US News entries look like:

```ts
  programs: {
    "11.0701": { source: "USNEWS", listKey: "computer-science-overall", edition: "2027", size: 587, url: "https://www.usnews.com/best-colleges/rankings/computer-science-overall" },
    "52.0201": { source: "USNEWS", listKey: "business-overall", edition: "2027", size: 535, url: "https://www.usnews.com/best-colleges/rankings/business-overall" },
    "45.0601": { source: "USNEWS", listKey: "economics-overall", edition: "2027", size: 237, url: "https://www.usnews.com/best-colleges/rankings/economics-overall" },
    "51.3801": { source: "USNEWS", listKey: "nursing-overall", edition: "2027", size: 671, url: "https://www.usnews.com/best-colleges/rankings/nursing-overall" },
    "52.0801": { source: "USNEWS", listKey: "business-finance", edition: "2027", size: 46, url: "https://www.usnews.com/best-colleges/rankings/business-finance", fallbackCip: "52.0201" },
    // + one { source: "NICHE", … } entry per niche-2027-*.json file
  },
```

(If Task 7 recorded a different `size` from a list page, use the file's value.)

- [ ] **Step 2: Dry run, then import**

Run: `npm run rankings:import -- --dry-run`
Expected: one block per file; no exceptions. Review the `⚠ ranked but no … program row` list. Each is a college where `majorsOffered` and the ranking disagree. Note them in the final summary for the user; don't create rows.

Run: `npm run rankings:import`
Expected: same counts, without "would".

- [ ] **Step 3: Check the seed no longer resets ranks**

Run:
```bash
docker exec uniseek-postgres psql -U uniseek -d uniseek -At -c "SELECT c.name, p.\"programRank\", p.\"programRankSourceClass\" FROM \"CollegeProgram\" p JOIN \"College\" c ON c.id=p.\"collegeId\" WHERE p.\"cipCode\"='11.0701' AND c.name IN ('Harvard University','Georgia Institute of Technology') ORDER BY 1;" > "$TEMP/ranks-before-seed.txt"
npm run db:seed
docker exec uniseek-postgres psql -U uniseek -d uniseek -At -c "SELECT c.name, p.\"programRank\", p.\"programRankSourceClass\" FROM \"CollegeProgram\" p JOIN \"College\" c ON c.id=p.\"collegeId\" WHERE p.\"cipCode\"='11.0701' AND c.name IN ('Harvard University','Georgia Institute of Technology') ORDER BY 1;" | diff "$TEMP/ranks-before-seed.txt" - && echo "ranks unchanged by seed"
```
Expected: `ranks unchanged by seed`, with `LIST_ORDER` as the source class.

- [ ] **Step 4: Before/after comparison**

Run: `npx tsx scripts/score-demo.ts > "$TEMP/score-demo-after.txt"; diff "$TEMP/score-demo-before.txt" "$TEMP/score-demo-after.txt" | head -40`
Expected: in the CS run, Williams no longer sits at `q 1.00`. LACs that US News doesn't rank high in CS drop out of the reaches, and the CS powerhouses' `q` values come from the 2027 list. Also run `npx vitest run`: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring/rankingLists.ts
git commit -m "Register collected program-ranking lists for scoring"
```

---

### Task 10: Update the scrape-colleges skill

**Files:**
- Create: `.claude/skills/scrape-colleges/references/program-rankings.md`
- Modify: `.claude/skills/scrape-colleges/SKILL.md`
- Modify: `.claude/skills/scrape-colleges/references/field-guide.md`

- [ ] **Step 1: Write `references/program-rankings.md`**

```markdown
# Program rankings (per-major quality)

When a student names a major, scoring uses the college's rank on that major's
published list (lib/scoring/quality.ts). Which list each major uses, and how long
it is, lives in `lib/scoring/rankingLists.ts` → `RANKING_LISTS.programs`. A major
registered there means its list is collected; a college missing from it counts as
unranked (rank = list size + 1, the quality floor). Unregistered majors fall back
to the institutional rank.

## Sources

| Majors | Source | Where ranks are readable |
|---|---|---|
| CS, Business, Economics, Nursing, Finance | US News 2027 | each college's free `/best-colleges/<slug>/overall-rankings` page (list pages paywall ranks below ~#10) |
| Biology, Political Science, English, Math, Chemistry, Communication, Psychology, ME/EE/CompE | Niche | the per-major list pages (`niche.com/colleges/search/best-colleges-for-<major>/?page=N`) |

usnews.com and niche.com block scripted fetches. Use Claude in Chrome (load the
`anthropic-skills:chrome-browser` skill first), your own tab, read-only, never
sign in, and close the tab after.

## File format: `data/rankings/<source>-<edition>-<listKey>.json`

Schema: `scripts/rankings/schema.ts` (`RankingFile`). One file per list; `entries`
hold only catalog colleges (`{ ipedsUnitId, name, rank, tie, band }`). For a range
like "#541-587", `rank` is the first number and `band` is the text. `size` is the
list's "N results" and must match `RANKING_LISTS`.

## Refreshing or adding colleges

1. New colleges imported? Add their entries to every existing ranking file (same
   collection method), or re-collect the lists.
2. New edition? Re-collect every file, update `edition`/`size` in `RANKING_LISTS`.
3. `npm run rankings:import -- --dry-run`, review (`⚠ ranked but no program row`
   means the college's offered majors and the ranking disagree; check the majors,
   don't force a row), then `npm run rankings:import`.
```

- [ ] **Step 2: Update `SKILL.md`**

(a) In the research step for the US News rank (step 6, "US News rank from the college's usnews.com profile…"), append:

```markdown
   Also set `usNewsRankList` (`"NATIONAL_UNIVERSITIES"` or `"NATIONAL_LIBERAL_ARTS"`)
   to the list the rank comes from. Scoring converts Liberal Arts ranks to the
   national scale, so this matters.
```

(b) Add a section before "## Out of scope (leave null)":

```markdown
## After importing new colleges: program rankings

Per-major quality comes from collected ranking lists, not from this research pass.
After importing new colleges, add them to the ranking files and run
`npm run rankings:import` (see `references/program-rankings.md`). Until then, a
new college counts as unranked for every collected major (lowest quality) — so
don't skip this step.
```

(c) In "## Out of scope (leave null)", change "Per-major admit rates / program ranks, and `archetype`" to "Per-major admit rates and `archetype`", and add the sentence "Program ranks are collected separately; see `references/program-rankings.md`."

- [ ] **Step 3: Update `references/field-guide.md`**

In the "## US News rank" section, after the "Say which list it's from" paragraph, add:

```markdown
Record the list in `usNewsRankList` as well as in the source note:
`"NATIONAL_UNIVERSITIES"` or `"NATIONAL_LIBERAL_ARTS"`. Regional lists aren't
supported; leave `usNewsRank` out for regionally ranked colleges and note it.
```

- [ ] **Step 4: Verify the skill's references resolve**

Run: `grep -n "program-rankings.md\|usNewsRankList\|rankings:import" .claude/skills/scrape-colleges/SKILL.md .claude/skills/scrape-colleges/references/*.md`
Expected: matches in SKILL.md (step 6, the new section, Out of scope), field-guide.md, and program-rankings.md.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/scrape-colleges
git commit -m "Teach the scrape-colleges skill about program rankings and usNewsRankList"
```
