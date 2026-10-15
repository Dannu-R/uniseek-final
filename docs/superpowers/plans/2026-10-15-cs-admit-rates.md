# CS Admit Rates + Admission Unit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every catalog college a researched, source-labeled CS admit rate and an admission unit, and make the scorer use them (with university-admit colleges correctly using their overall rate for any major).

**Architecture:** A new `College.admissionUnit` enum and a small rule change in `effectiveAdmitRate` (lib/scoring/score.ts). Research results land in one committed file (`data/major-rates/cs-2026-27.json`) validated by zod, applied by a pure planner and a `major-rates:import` command. The seed stops overwriting researched CS admissions fields.

**Tech Stack:** TypeScript, Prisma 6 (Postgres in Docker), zod 4, vitest, tsx. Research via WebSearch/WebFetch, Claude in Chrome read-only as fallback.

**Spec:** `docs/superpowers/specs/2026-10-15-cs-admit-rates-design.md`

## Global Constraints

- Source classes (enum `MajorRateSourceClass`): UNIVERSITY (U), DERIVED (D), PUBLISHED (P), CONSENSUS (C), ESTIMATE (E). This run never writes FITTED.
- U stores `admitRate: null`; every other class stores a rate in (0, 1].
- Every entry has a `basis`; D and P also need a `url`; E's basis names its peers or argument.
- Scorer flag format (major runs only): `effective admit rate <rate> (<label>)`, label ∈ U/D/P/C/E/F/?/fallback.
- `major-rates:import` never creates program rows and runs `--dry-run` first.
- Work on branch `cs-admit-rates`; commit per task; never push. Suite baseline: 108 tests.
- Chrome use is read-only, own tab, never sign in, close the tab after.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `prisma/schema.prisma` + migration | Modify/Create | `enum AdmissionUnit`, `College.admissionUnit` |
| `lib/scoring/types.ts` | Modify | `MajorRateClass`, `CollegeMajorProgram.admitRateSourceClass`, `CollegeInput.admissionUnit` |
| `lib/scoring/mapCollege.ts` | Modify | Map the two new fields |
| `lib/scoring/score.ts` | Modify | New `effectiveAdmitRate` rules + flag |
| `lib/scoring/score.test.ts` | Modify | Tests for the rules |
| `scripts/major-rates/schema.ts` | Create | zod schema for the data file |
| `scripts/major-rates/plan.ts` + `plan.test.ts` | Create | Pure planner + tests |
| `scripts/major-rates/import.ts` | Create | `major-rates:import` |
| `prisma/seed.ts` | Modify | CS upsert becomes create-only |
| `data/major-rates/cs-2026-27.json` | Create | Research results |
| `.claude/skills/scrape-colleges/**` | Modify/Create | Skill update |

---

### Task 1: Admission unit + the effective-admit-rate rules

**Files:** Modify `prisma/schema.prisma`, `lib/scoring/types.ts`, `lib/scoring/mapCollege.ts`, `lib/scoring/score.ts`, `lib/scoring/score.test.ts`; create the migration.

**Interfaces:**
- Produces: Prisma `College.admissionUnit` (`AdmissionUnit` enum); `MajorRateClass` type; `CollegeInput.admissionUnit`; `CollegeMajorProgram.admitRateSourceClass`; flag `effective admit rate <rate> (<label>)`.

- [ ] **Step 1: Write the failing tests** — append to `lib/scoring/score.test.ts`:

```ts
describe("effective admit rate by source (§6a)", () => {
  const cs = (p: Partial<NonNullable<CollegeInput["majorProgram"]>>) => ({ cipCode: "11.0701", admitRate: null, ...p });

  it("uses a researched major rate and labels its class", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ majorProgram: cs({ admitRate: 0.07, admitRateSourceClass: "PUBLISHED" }) }));
    expect(s.effectiveAdmitRate).toBe(0.07);
    expect(s.flags).toContain("effective admit rate 0.07 (P)");
  });

  it("treats a UNIVERSITY-class program as the overall rate, without the unresearched flag", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ admitRate: 0.5, majorProgram: cs({ admitRateSourceClass: "UNIVERSITY" }) }));
    expect(s.effectiveAdmitRate).toBe(0.5);
    expect(s.flags).toContain("effective admit rate 0.5 (U)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(false);
  });

  it("uses the overall rate as U for any major when the college admits to the university", () => {
    const s = scoreCollege(student({ majorCip: "26.0101" }), college({ admitRate: 0.3, admissionUnit: "UNIVERSITY", offeredCips: ["26.0101"], majorProgram: { cipCode: "26.0101", admitRate: null } }));
    expect(s.effectiveAdmitRate).toBe(0.3);
    expect(s.flags).toContain("effective admit rate 0.3 (U)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(false);
  });

  it("falls back to the overall rate, flagged, when a major-admitting college has no researched rate", () => {
    const s = scoreCollege(student({ majorCip: "11.0701" }), college({ admitRate: 0.4, admissionUnit: "MAJOR", majorProgram: cs({}) }));
    expect(s.effectiveAdmitRate).toBe(0.4);
    expect(s.flags).toContain("effective admit rate 0.4 (fallback)");
    expect(s.flags.some((f) => f.includes("unresearched"))).toBe(true);
  });

  it("adds no admit-rate flag when no major is named", () => {
    const s = scoreCollege(student(), college({ admissionUnit: "UNIVERSITY" }));
    expect(s.flags.some((f) => f.startsWith("effective admit rate"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run lib/scoring/score.test.ts` → FAIL (flags missing / type errors on new fields are fine; vitest doesn't type-check).

- [ ] **Step 3: Schema + migration** — in `prisma/schema.prisma` add after the `UsNewsRankList` enum:

```prisma
// How a college admits first-years (§6a). UNIVERSITY: majors declared later, so every
// major's admit rate IS the overall rate. SCHOOL: admits into a school/college within
// it. MAJOR: admits directly to the major.
enum AdmissionUnit {
  UNIVERSITY
  SCHOOL
  MAJOR
}
```

and in `model College`, after `usNewsRankList`:

```prisma
  admissionUnit        AdmissionUnit? // null = unknown
```

Run `npx prisma migrate dev --name add_admission_unit` (Postgres is up). If it refuses as non-interactive: `npx prisma migrate dev --create-only --name add_admission_unit && npx prisma migrate deploy && npx prisma generate`. Never accept a reset.

- [ ] **Step 4: Types** — in `lib/scoring/types.ts` add above `CollegeMajorProgram`:

```ts
export type MajorRateClass = "UNIVERSITY" | "DERIVED" | "PUBLISHED" | "CONSENSUS" | "ESTIMATE" | "FITTED";
```

add to `CollegeMajorProgram`: `admitRateSourceClass?: MajorRateClass | null; // §6a source class`
add to `CollegeInput` after `usNewsRankList`: `admissionUnit?: "UNIVERSITY" | "SCHOOL" | "MAJOR" | null; // §6a`

- [ ] **Step 5: Map them** — in `lib/scoring/mapCollege.ts`: add `admissionUnit: c.admissionUnit ?? null,` after `usNewsRankList`, and add `admitRateSourceClass: program.admitRateSourceClass,` inside the `majorProgram` object.

- [ ] **Step 6: The rules** — in `lib/scoring/score.ts` replace the comment block and `effectiveAdmitRate` (lines ~45–55) with:

```ts
// §6a label for each source class, shown in the result flags.
const CLASS_LABEL: Record<MajorRateClass, string> = {
  UNIVERSITY: "U", DERIVED: "D", PUBLISHED: "P", CONSENSUS: "C", ESTIMATE: "E", FITTED: "F",
};

// The effective admit rate for tier + odds (§6a major offset). Residency (§15) is
// deferred (see OPEN_ITEMS). A researched major rate wins; a college that admits to
// the university uses its overall rate for every major (a fact, class U); otherwise
// fall back to the overall rate, flagged low-confidence.
function effectiveAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; label?: string; flag?: string } {
  if (student.majorCip && college.majorProgram) {
    const p = college.majorProgram;
    if (p.admitRate != null) return { rate: p.admitRate, label: p.admitRateSourceClass ? CLASS_LABEL[p.admitRateSourceClass] : "?" };
    if (p.admitRateSourceClass === "UNIVERSITY" || college.admissionUnit === "UNIVERSITY") {
      return { rate: college.admitRate, label: "U" };
    }
    return { rate: college.admitRate, label: "fallback", flag: "major admit rate unresearched — using overall rate" };
  }
  return { rate: college.admitRate };
}
```

add `MajorRateClass` to the `./types` import, and in `scoreCollege` replace

```ts
  const { rate, flag } = effectiveAdmitRate(student, college);
  if (flag) flags.push(flag);
```

with

```ts
  const { rate, label, flag } = effectiveAdmitRate(student, college);
  if (flag) flags.push(flag);
  if (label) flags.push(`effective admit rate ${rate} (${label})`);
```

- [ ] **Step 7: Verify** — `npx vitest run` → 113 passing; `npx tsc --noEmit -p . 2>&1 | grep -E "lib/scoring|prisma/"` → nothing.

- [ ] **Step 8: Commit** — `git add prisma lib/scoring && git commit -m "Score majors with source-labeled admit rates and the college's admission unit"`

---

### Task 2: Data-file schema + pure import planner

**Files:** Create `scripts/major-rates/schema.ts`, `scripts/major-rates/plan.ts`, `scripts/major-rates/plan.test.ts`.

**Interfaces:**
- Produces: `MajorRateFile` (zod + type), `MajorRateEntry`, `MAJOR_RATES_DIR`; `planMajorRates(file, rows, catalog): MajorRatePlan`; types `RateProgramRow`, `RateCatalogCollege`, `MajorRatePlan`.

- [ ] **Step 1: Failing tests** — `scripts/major-rates/plan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MajorRateFile } from "./schema";
import { planMajorRates, type RateProgramRow, type RateCatalogCollege } from "./plan";

const entry = (o: Record<string, unknown>) => ({
  name: "X", admissionUnit: "MAJOR", sourceClass: "PUBLISHED", admitRate: 0.05, directAdmit: true,
  basis: "published by the school, Fall 2025", url: "https://x.test/", year: "Fall 2025", ...o,
});
const file = MajorRateFile.parse({
  cip: "11.0701", cycle: "2026-27", collectedAt: "2026-10-15",
  entries: [
    entry({ ipedsUnitId: 1, name: "A" }),
    entry({ ipedsUnitId: 2, name: "B", admissionUnit: "UNIVERSITY", sourceClass: "UNIVERSITY", admitRate: null, directAdmit: false, url: null }),
    entry({ ipedsUnitId: 3, name: "C (no CS row)" }),
    entry({ ipedsUnitId: 9, name: "Not in catalog" }),
  ],
});
const catalog = new Map<number, RateCatalogCollege>([
  [1, { collegeId: "a", name: "A", admissionUnit: null }],
  [2, { collegeId: "b", name: "B", admissionUnit: "UNIVERSITY" }],
  [3, { collegeId: "c", name: "C", admissionUnit: null }],
  [4, { collegeId: "d", name: "D", admissionUnit: null }],
]);
const rows: RateProgramRow[] = [
  { collegeId: "a", ipedsUnitId: 1, name: "A", admitRate: 0.08, admitRateSourceClass: "CONSENSUS", directAdmit: null },
  { collegeId: "b", ipedsUnitId: 2, name: "B", admitRate: null, admitRateSourceClass: null, directAdmit: null },
  { collegeId: "d", ipedsUnitId: 4, name: "D", admitRate: null, admitRateSourceClass: null, directAdmit: null },
];

describe("planMajorRates", () => {
  const plan = planMajorRates(file, rows, catalog);
  it("updates each listed college's program row", () => {
    expect(plan.programUpdates.map((u) => [u.collegeId, u.to.admitRate, u.to.sourceClass])).toEqual([
      ["a", 0.05, "PUBLISHED"], ["b", null, "UNIVERSITY"],
    ]);
  });
  it("flags overwrites of an already-researched value", () => {
    expect(plan.programUpdates.find((u) => u.collegeId === "a")!.changedResearched).toBe(true);
    expect(plan.programUpdates.find((u) => u.collegeId === "b")!.changedResearched).toBe(false);
  });
  it("sets admission units that differ, including for colleges without a CS row", () => {
    expect(plan.unitUpdates).toEqual([
      { collegeId: "a", name: "A", from: null, to: "MAJOR" },
      { collegeId: "c", name: "C", from: null, to: "MAJOR" },
    ]);
  });
  it("reports colleges without a CS row, entries outside the catalog, and catalog CS rows missing from the file", () => {
    expect(plan.noProgramRow).toEqual([{ ipedsUnitId: 3, name: "C (no CS row)" }]);
    expect(plan.notInCatalog).toEqual([{ ipedsUnitId: 9, name: "Not in catalog" }]);
    expect(plan.missingFromFile).toEqual([{ collegeId: "d", name: "D" }]);
  });
});

describe("MajorRateFile validation", () => {
  const base = { cip: "11.0701", cycle: "2026-27", collectedAt: "2026-10-15" };
  const bad = (o: Record<string, unknown>) => MajorRateFile.safeParse({ ...base, entries: [entry({ ipedsUnitId: 1, ...o })] });
  it("requires U entries to store a null rate", () => {
    expect(bad({ sourceClass: "UNIVERSITY", admitRate: 0.2 }).success).toBe(false);
  });
  it("requires a rate for non-U classes", () => {
    expect(bad({ sourceClass: "ESTIMATE", admitRate: null }).success).toBe(false);
  });
  it("requires a url for DERIVED and PUBLISHED", () => {
    expect(bad({ sourceClass: "DERIVED", url: null }).success).toBe(false);
  });
  it("rejects duplicate colleges", () => {
    const r = MajorRateFile.safeParse({ ...base, entries: [entry({ ipedsUnitId: 1 }), entry({ ipedsUnitId: 1 })] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run scripts/major-rates/plan.test.ts` → FAIL (module not found).

- [ ] **Step 3: `scripts/major-rates/schema.ts`**

```ts
// Shape of a researched major-admit-rate file: data/major-rates/<major>-<cycle>.json.
// One entry per catalog college (§6a collection standard); see the design spec.

import path from "node:path";
import { z } from "zod";

export const MAJOR_RATES_DIR = path.resolve("data", "major-rates");

export const MajorRateEntry = z
  .object({
    ipedsUnitId: z.number().int().positive(),
    name: z.string().min(1),
    admissionUnit: z.enum(["UNIVERSITY", "SCHOOL", "MAJOR"]).nullable(),
    sourceClass: z.enum(["UNIVERSITY", "DERIVED", "PUBLISHED", "CONSENSUS", "ESTIMATE"]),
    admitRate: z.number().gt(0).max(1).nullable(), // null exactly when sourceClass is UNIVERSITY
    directAdmit: z.boolean().nullable(),
    basis: z.string().min(10), // where the number came from, or the estimate's peers/argument
    url: z.string().url().nullable(),
    year: z.string().nullable(), // e.g. "Fall 2025"
  })
  .superRefine((e, ctx) => {
    if (e.sourceClass === "UNIVERSITY" && e.admitRate !== null) {
      ctx.addIssue({ code: "custom", message: `${e.name}: UNIVERSITY class stores admitRate null` });
    }
    if (e.sourceClass !== "UNIVERSITY" && e.admitRate === null) {
      ctx.addIssue({ code: "custom", message: `${e.name}: admitRate required for ${e.sourceClass}` });
    }
    if ((e.sourceClass === "DERIVED" || e.sourceClass === "PUBLISHED") && !e.url) {
      ctx.addIssue({ code: "custom", message: `${e.name}: url required for ${e.sourceClass}` });
    }
  });
export type MajorRateEntry = z.infer<typeof MajorRateEntry>;

export const MajorRateFile = z
  .object({
    cip: z.string().regex(/^\d{2}\.\d{4}$/),
    cycle: z.string().regex(/^\d{4}-\d{2}$/),
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(MajorRateEntry),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<number>();
    for (const e of f.entries) {
      if (seen.has(e.ipedsUnitId)) ctx.addIssue({ code: "custom", message: `duplicate ipedsUnitId ${e.ipedsUnitId}` });
      seen.add(e.ipedsUnitId);
    }
  });
export type MajorRateFile = z.infer<typeof MajorRateFile>;
```

- [ ] **Step 4: `scripts/major-rates/plan.ts`**

```ts
// Pure planning for major-rates:import — no DB access, so it's unit-testable.

import type { MajorRateFile } from "./schema";

type Unit = "UNIVERSITY" | "SCHOOL" | "MAJOR";
interface RateValue { admitRate: number | null; sourceClass: string | null; directAdmit: boolean | null }

export interface RateCatalogCollege { collegeId: string; name: string; admissionUnit: Unit | null }
export interface RateProgramRow {
  collegeId: string; ipedsUnitId: number; name: string;
  admitRate: number | null; admitRateSourceClass: string | null; directAdmit: boolean | null;
}
export interface MajorRatePlan {
  programUpdates: { collegeId: string; name: string; from: RateValue; to: RateValue; changedResearched: boolean }[];
  unitUpdates: { collegeId: string; name: string; from: Unit | null; to: Unit | null }[];
  noProgramRow: { ipedsUnitId: number; name: string }[];
  notInCatalog: { ipedsUnitId: number; name: string }[];
  missingFromFile: { collegeId: string; name: string }[];
}

// rows: the CollegeProgram rows for file.cip (one per catalog college offering the major).
export function planMajorRates(
  file: MajorRateFile,
  rows: RateProgramRow[],
  catalog: Map<number, RateCatalogCollege>,
): MajorRatePlan {
  const plan: MajorRatePlan = { programUpdates: [], unitUpdates: [], noProgramRow: [], notInCatalog: [], missingFromFile: [] };
  const rowById = new Map(rows.map((r) => [r.ipedsUnitId, r]));
  const listed = new Set<number>();

  for (const e of file.entries) {
    listed.add(e.ipedsUnitId);
    const college = catalog.get(e.ipedsUnitId);
    if (!college) { plan.notInCatalog.push({ ipedsUnitId: e.ipedsUnitId, name: e.name }); continue; }
    if (e.admissionUnit !== null && e.admissionUnit !== college.admissionUnit) {
      plan.unitUpdates.push({ collegeId: college.collegeId, name: college.name, from: college.admissionUnit, to: e.admissionUnit });
    }
    const row = rowById.get(e.ipedsUnitId);
    if (!row) { plan.noProgramRow.push({ ipedsUnitId: e.ipedsUnitId, name: e.name }); continue; }
    const from: RateValue = { admitRate: row.admitRate, sourceClass: row.admitRateSourceClass, directAdmit: row.directAdmit };
    const to: RateValue = { admitRate: e.admitRate, sourceClass: e.sourceClass, directAdmit: e.directAdmit };
    const researched = from.sourceClass != null && from.sourceClass !== "FITTED";
    const differs = from.admitRate !== to.admitRate || from.sourceClass !== to.sourceClass;
    plan.programUpdates.push({ collegeId: row.collegeId, name: row.name, from, to, changedResearched: researched && differs });
  }

  for (const r of rows) {
    if (!listed.has(r.ipedsUnitId)) plan.missingFromFile.push({ collegeId: r.collegeId, name: r.name });
  }
  return plan;
}
```

- [ ] **Step 5: Verify** — `npx vitest run scripts/major-rates/plan.test.ts` → PASS (8); full suite → 121.

- [ ] **Step 6: Commit** — `git add scripts/major-rates && git commit -m "Add the major-admit-rate file schema and a pure import planner"`

---

### Task 3: `major-rates:import` + create-only seed

**Files:** Create `scripts/major-rates/import.ts`, `data/major-rates/.gitkeep`; modify `package.json`, `prisma/seed.ts`.

- [ ] **Step 1: `scripts/major-rates/import.ts`**

```ts
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
  const verb = dryRun ? "would " : "";
  console.log(`${path} (${file.cip}, ${file.entries.length} entries)`);
  console.log(`  ${verb}update ${plan.programUpdates.length} program rows · ${verb}set ${plan.unitUpdates.length} admission units`);
  const overwrites = plan.programUpdates.filter((u) => u.changedResearched);
  if (overwrites.length) {
    console.log(`  replacing ${overwrites.length} already-researched value(s):`);
    for (const u of overwrites) console.log(`    ${u.name}: ${u.from.admitRate ?? "—"} (${u.from.sourceClass}) → ${u.to.admitRate ?? "overall"} (${u.to.sourceClass})`);
  }
  if (plan.noProgramRow.length) console.log(`  ⚠ no ${file.cip} program row (college doesn't offer it per majorsOffered): ${plan.noProgramRow.map((n) => n.name).join("; ")}`);
  if (plan.missingFromFile.length) console.log(`  ⚠ catalog colleges offering ${file.cip} with no entry: ${plan.missingFromFile.map((m) => m.name).join("; ")}`);
  if (plan.notInCatalog.length) console.log(`  (ignored ${plan.notInCatalog.length} entries not in the catalog)`);

  if (!dryRun) {
    await prisma.$transaction([
      ...plan.programUpdates.map((u) => prisma.collegeProgram.update({
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
```

- [ ] **Step 2:** add `"major-rates:import": "tsx scripts/major-rates/import.ts",` to `package.json` scripts after `rankings:import`; `mkdir -p data/major-rates && touch data/major-rates/.gitkeep`.

- [ ] **Step 3: Seed create-only** — in `prisma/seed.ts` replace the CS-program block (comment + `const { programRank: _rank, … } = cs;` + upsert) with:

```ts
    // CS program, with the researched §18 data. Ranks (rankings:import) and admit rates
    // (major-rates:import) are owned by their import commands once collected, so the seed
    // only sets them when it first creates the row — it re-runs on every deploy.
    await prisma.collegeProgram.upsert({
      where: { collegeId_cipCode: { collegeId: row.id, cipCode: CS } },
      update: {},
      create: { collegeId: row.id, cipCode: CS, ...cs } as Prisma.CollegeProgramUncheckedCreateInput,
    });
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit -p . 2>&1 | grep -E "scripts/|prisma/seed"` → nothing; `npm run major-rates:import` (no args) exits 1 with the usage line; `npx vitest run` → 121.

- [ ] **Step 5: Commit** — `git add scripts/major-rates/import.ts package.json data/major-rates/.gitkeep prisma/seed.ts && git commit -m "Add major-rates:import and keep the seed from overwriting researched CS rates"`

---

### Task 4: Research run → `data/major-rates/cs-2026-27.json`

Operational, not TDD. Controller runs it in waves like the 100-college run.

- [ ] **Step 1:** Export the catalog (`ipedsUnitId|name|state|admitRate|current CS rate|current class`) to the workspace; group into batches of 4 colleges.
- [ ] **Step 2:** One helper per batch (≤10 at a time, sequential waves). Each writes one JSON object per college, in the `MajorRateEntry` shape, to `<workspace>/cs-rates/<ipedsUnitId>.json`. Rules: the spec's source ladder (own counts → UC Information Center → CDS/factbooks → College Transitions direct-admit table → ≥3 consensus sources → labeled E with named peers); record `admissionUnit`; U stores `admitRate: null`; `basis` always; `url` for D/P; `year` the admission year the rate describes; never invent a number; Chrome read-only only for blocked pages; own temp folder; reply briefly.
- [ ] **Step 3:** Assemble the per-college files into `data/major-rates/cs-2026-27.json` (`cip "11.0701"`, `cycle "2026-27"`, `collectedAt` = run date, entries sorted by name) and validate:
  `npx tsx -e "import fs from 'node:fs'; import { MajorRateFile } from './scripts/major-rates/schema'; const r = MajorRateFile.safeParse(JSON.parse(fs.readFileSync('data/major-rates/cs-2026-27.json','utf8'))); console.log(r.success ? 'ok '+r.data.entries.length : r.error.issues.slice(0,5))"` → `ok 131`.
- [ ] **Step 4: Commit** — `git add data/major-rates/cs-2026-27.json && git commit -m "Add researched CS admit rates and admission units for the catalog"`

---

### Task 5: Import and verify

- [ ] **Step 1:** Capture the before-picture: `npx tsx scripts/score-demo.ts > <workspace>/demo-before.txt`.
- [ ] **Step 2:** `npm run major-rates:import -- data/major-rates/cs-2026-27.json --dry-run`; review the "replacing already-researched" list against the 12 seeded rates (each replacement should be newer or better-sourced); then run without `--dry-run`.
- [ ] **Step 3: Spot-check** — query CS `admitRate`/class for UW, Maryland, Berkeley, UCLA, UNC, UT Austin, Georgia Tech, Purdue; each should be non-null and labeled (or U), and far below the overall rate where CS is capped.
- [ ] **Step 4: Seed check** — record those CS rows, run `npm run db:seed`, confirm they're unchanged; then restore UGA's batch data with `npm run colleges:import -- georgia-large-publics --only-done` (the seed resets seeded colleges' other fields — known issue).
- [ ] **Step 5:** `npx tsx scripts/score-demo.ts > <workspace>/demo-after.txt`; diff; `npx vitest run` → 121.

---

### Task 6: Update the scrape-colleges skill

**Files:** Create `.claude/skills/scrape-colleges/references/major-admit-rates.md`; modify `SKILL.md`, `references/field-guide.md`.

- [ ] **Step 1:** `references/major-admit-rates.md` — the source ladder with the class table and examples (U Michigan/Florida, D Georgia Tech counts, P UIUC 7.2%, C, E with named peers); `admissionUnit` definitions; the data-file format (point at `scripts/major-rates/schema.ts`); how to research one college; refresh steps; `major-rates:import -- <file> --dry-run` then for real; that U stores null.
- [ ] **Step 2:** `SKILL.md` — research step: record `admissionUnit` (how the college admits) for every new college; a section "After importing new colleges: CS admit rates" pointing at the reference (new colleges need a CS entry, else they fall back unless they admit to the university); "Out of scope" no longer lists per-major admit rates — point to the reference.
- [ ] **Step 3:** `field-guide.md` — an "Admission unit" row/section (CDS C/website wording that signals each value).
- [ ] **Step 4:** grep that the new reference is linked from SKILL.md; commit `"Teach the scrape-colleges skill to research CS admit rates and admission units"`.
