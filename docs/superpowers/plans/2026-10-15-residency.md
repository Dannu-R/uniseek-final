# Residency-Adjusted Admit Rates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score each college with the admit rate of the pool the student is actually in (in-state or out-of-state), using published splits only, so selective publics stop looking too easy to out-of-state applicants.

**Architecture:** `effectiveAdmitRate` (lib/scoring/score.ts) becomes two steps: the existing §6a base rate, then a residency step. The residency step prefers a published by-residency major rate, then the college's own split (scaling a major rate by split ÷ overall), and otherwise keeps the base rate with a flag. By-residency major rates are new optional fields on `CollegeProgram`, carried by the major-rates file. The college split for the 24 publics that lack it comes through a `colleges:import` batch. The seed stops erasing imported values.

**Tech Stack:** TypeScript, Prisma 6 (Postgres in Docker), zod 4, vitest, tsx. Research via WebFetch on CDS PDFs; WebSearch sparingly (the per-session budget runs out).

**Spec:** `docs/superpowers/specs/2026-10-15-residency-design.md` (D3 = use splits at privates too; D5 = ratio scaling)

## Global Constraints

- In-state means `student.homeState === college.state` (two-letter codes, DC included). No home state → no residency step.
- Published numbers only. No estimated splits; a missing split falls back to the base rate, flagged.
- Residency rates exclude international applicants (CDS C1 convention). Major by-residency rates follow the same convention.
- By-residency major rates only for `DERIVED` / `PUBLISHED` entries.
- Scorer flag format: `effective admit rate <rate> (<class>, <residency>)`. Class is §6a's label, or `overall` with no major. Residency is `in-state`, `out-of-state`, `out-of-state via ratio` / `in-state via ratio`, or `residency n/a`. Runs with no home state keep today's format.
- Branch `residency`, cut from `cs-admit-rates`. Commit per task; never push. Suite baseline: 121 tests.
- Imports run `--dry-run` first. Chrome use is read-only, own tab, never sign in, close the tab after.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `prisma/schema.prisma` + migration | Modify/Create | `CollegeProgram.inStateAdmitRate` / `outOfStateAdmitRate` |
| `lib/scoring/types.ts` | Modify | The same two fields on `CollegeMajorProgram` |
| `lib/scoring/mapCollege.ts` | Modify | Map them |
| `lib/scoring/score.ts` | Modify | `baseAdmitRate` + residency step in `effectiveAdmitRate` |
| `lib/scoring/score.test.ts` | Modify | Residency tests |
| `scripts/major-rates/schema.ts`, `plan.ts`, `plan.test.ts`, `import.ts` | Modify | Carry by-residency major rates |
| `data/major-rates/cs-2026-27.json` | Modify | UW's by-residency CS rates |
| `prisma/seed.ts` | Modify | A null in the seed never erases DB data |
| `data/colleges/residency-publics.json` (+ work files) | Create | Splits for the 24 publics |
| `docs/scoring-model.md`, `.claude/skills/scrape-colleges/references/*.md` | Modify | Docs |

---

### Task 0: Branch

- [ ] `git checkout cs-admit-rates && git checkout -b residency`. Capture the before-picture: `npx tsx scripts/score-demo.ts > <workspace>/demo-before.txt`. Then commit the spec and this plan: `git add docs/superpowers/specs/2026-10-15-residency-design.md docs/superpowers/plans/2026-10-15-residency.md && git commit -m "Add spec and plan for residency-adjusted admit rates"`

---

### Task 1: The residency step in `effectiveAdmitRate`

**Files:** Modify `prisma/schema.prisma`, `lib/scoring/types.ts`, `lib/scoring/mapCollege.ts`, `lib/scoring/score.ts`, `lib/scoring/score.test.ts`; create the migration.

**Interfaces:**
- Produces: `CollegeProgram.inStateAdmitRate` / `outOfStateAdmitRate` (Prisma + `CollegeMajorProgram`); the residency flag labels above.

- [ ] **Step 1: Write the failing tests** — append to `lib/scoring/score.test.ts`:

```ts
describe("residency (§15)", () => {
  const cs = (p: Partial<NonNullable<CollegeInput["majorProgram"]>>) => ({ cipCode: "11.0701", admitRate: null, ...p });
  // Georgia Tech's published split (§15).
  const gt = (o: Partial<CollegeInput> = {}) =>
    college({ state: "GA", admitRate: 0.1274, inStateAdmitRate: 0.293, outOfStateAdmitRate: 0.0893, ...o });

  it("uses the in-state rate for a resident", () => {
    const s = scoreCollege(student({ homeState: "GA" }), gt());
    expect(s.effectiveAdmitRate).toBe(0.293);
    expect(s.flags).toContain("effective admit rate 0.293 (overall, in-state)");
  });

  it("uses the out-of-state rate for a non-resident", () => {
    const s = scoreCollege(student({ homeState: "TX" }), gt());
    expect(s.effectiveAdmitRate).toBe(0.0893);
    expect(s.flags).toContain("effective admit rate 0.0893 (overall, out-of-state)");
  });

  it("applies the split to a university-admit major run", () => {
    const s = scoreCollege(
      student({ homeState: "TX", majorCip: "11.0701" }),
      gt({ admissionUnit: "UNIVERSITY", majorProgram: cs({ admitRateSourceClass: "UNIVERSITY" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(0.0893);
    expect(s.flags).toContain("effective admit rate 0.0893 (U, out-of-state)");
  });

  it("scales a major rate by split ÷ overall when no by-residency major rate exists", () => {
    const s = scoreCollege(
      student({ homeState: "TX", majorCip: "11.0701" }),
      gt({ majorProgram: cs({ admitRate: 0.1128, admitRateSourceClass: "DERIVED" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(0.0791); // 0.1128 × 0.0893 / 0.1274
    expect(s.flags).toContain("effective admit rate 0.0791 (D, out-of-state via ratio)");
  });

  it("clamps a scaled major rate at 1", () => {
    const s = scoreCollege(
      student({ homeState: "GA", majorCip: "11.0701" }),
      gt({ majorProgram: cs({ admitRate: 0.9, admitRateSourceClass: "PUBLISHED" }) }),
    );
    expect(s.effectiveAdmitRate).toBe(1);
  });

  it("prefers a published by-residency major rate over the ratio", () => {
    // UW: the university-wide split is nearly flat, the CS split is not (spec D6).
    const uw = college({
      state: "WA", admitRate: 0.4175, inStateAdmitRate: 0.4574, outOfStateAdmitRate: 0.4216,
      majorProgram: cs({ admitRate: 0.1473, admitRateSourceClass: "DERIVED", inStateAdmitRate: 0.4091, outOfStateAdmitRate: 0.0811 }),
    });
    const s = scoreCollege(student({ homeState: "TX", majorCip: "11.0701" }), uw);
    expect(s.effectiveAdmitRate).toBe(0.0811);
    expect(s.flags).toContain("effective admit rate 0.0811 (D, out-of-state)");
  });

  it("keeps the base rate, flagged, when the college publishes no split", () => {
    const s = scoreCollege(student({ homeState: "TX" }), college({ state: "MI", admitRate: 0.164 }));
    expect(s.effectiveAdmitRate).toBe(0.164);
    expect(s.flags).toContain("effective admit rate 0.164 (overall, residency n/a)");
    expect(s.flags).toContain("residency split unknown — rate not residency-adjusted");
  });

  it("does nothing when the student gives no home state", () => {
    const s = scoreCollege(student(), gt());
    expect(s.effectiveAdmitRate).toBe(0.1274);
    expect(s.flags.some((f) => f.startsWith("effective admit rate"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run lib/scoring/score.test.ts` → the 8 new tests FAIL; the existing ones pass.

- [ ] **Step 3: Schema + migration** — in `prisma/schema.prisma`, `model CollegeProgram`, after `directAdmit`:

```prisma
  // §15: the major's admit rate by residency, only where the school publishes counts
  // (e.g. UW's Allen School). Out-of-state excludes international, like CDS C1.
  inStateAdmitRate       Float?
  outOfStateAdmitRate    Float?
```

Run `npx prisma migrate dev --name add_program_residency_rates`. If it refuses as non-interactive: `npx prisma migrate dev --create-only --name add_program_residency_rates && npx prisma migrate deploy && npx prisma generate`. Never accept a reset.

- [ ] **Step 4: Types** — in `lib/scoring/types.ts`, `CollegeMajorProgram`, after `directAdmit`:

```ts
  inStateAdmitRate?: number | null; // §15 — published by-residency major rate
  outOfStateAdmitRate?: number | null;
```

- [ ] **Step 5: Map them** — in `lib/scoring/mapCollege.ts`, inside the `majorProgram` object, after `directAdmit: program.directAdmit`, add `, inStateAdmitRate: program.inStateAdmitRate, outOfStateAdmitRate: program.outOfStateAdmitRate`.

- [ ] **Step 6: The rule** — in `lib/scoring/score.ts`, replace the comment block and `effectiveAdmitRate` with:

```ts
type Residency = "in-state" | "out-of-state";

// §15: which admission pool the student competes in. Null when either state is unknown.
function residencyOf(student: StudentInput, college: CollegeInput): Residency | null {
  if (!student.homeState || !college.state) return null;
  return student.homeState === college.state ? "in-state" : "out-of-state";
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

// The §6a base rate. A researched major rate wins; a college that admits to the
// university uses its overall rate for every major (a fact, class U); otherwise fall
// back to the overall rate, flagged low-confidence. `major` says the base is a major rate.
function baseAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; label?: string; flag?: string; major: boolean } {
  if (student.majorCip && college.majorProgram) {
    const p = college.majorProgram;
    if (p.admitRate != null) return { rate: p.admitRate, label: p.admitRateSourceClass ? CLASS_LABEL[p.admitRateSourceClass] : "?", major: true };
    if (p.admitRateSourceClass === "UNIVERSITY" || college.admissionUnit === "UNIVERSITY") {
      return { rate: college.admitRate, label: "U", major: false };
    }
    return { rate: college.admitRate, label: "fallback", flag: "major admit rate unresearched — using overall rate", major: false };
  }
  return { rate: college.admitRate, major: false };
}

// The effective admit rate for tier + odds: the §6a base, then residency (§15).
// A published by-residency major rate wins; else the college's split replaces the
// overall rate, or scales a major rate by split ÷ overall (spec D5); else keep the
// base, flagged. Published numbers only — no estimated splits.
function effectiveAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; label?: string; flags: string[] } {
  const base = baseAdmitRate(student, college);
  const flags = base.flag ? [base.flag] : [];
  const res = residencyOf(student, college);
  if (!res) return { rate: base.rate, label: base.label, flags };

  const cls = base.label ?? "overall";
  const inState = res === "in-state";
  const p = college.majorProgram;
  const majorSplit = base.major ? (inState ? p?.inStateAdmitRate : p?.outOfStateAdmitRate) : null;
  if (majorSplit != null) return { rate: majorSplit, label: `${cls}, ${res}`, flags };

  const split = inState ? college.inStateAdmitRate : college.outOfStateAdmitRate;
  if (split == null) {
    flags.push("residency split unknown — rate not residency-adjusted");
    return { rate: base.rate, label: `${cls}, residency n/a`, flags };
  }
  if (!base.major) return { rate: split, label: `${cls}, ${res}`, flags };
  return { rate: Math.min(1, round4((base.rate * split) / college.admitRate)), label: `${cls}, ${res} via ratio`, flags };
}
```

and in `scoreCollege` replace

```ts
  const { rate, label, flag } = effectiveAdmitRate(student, college);
  if (flag) flags.push(flag);
```

with

```ts
  const { rate, label, flags: rateFlags } = effectiveAdmitRate(student, college);
  flags.push(...rateFlags);
```

(keep the following `if (label) flags.push(...)` line). Update the `effectiveAdmitRate` field comment in `CollegeScore` to `// after the major offset (§6a) and residency (§15)`.

- [ ] **Step 7: Verify** — `npx vitest run` → 129 passing; `npx tsc --noEmit -p . 2>&1 | grep -E "lib/scoring|prisma/"` → nothing.

- [ ] **Step 8: Commit** — `git add prisma lib/scoring && git commit -m "Score each college with the student's residency pool (§15)"`

---

### Task 2: By-residency major rates through `major-rates:import` + UW

**Files:** Modify `scripts/major-rates/schema.ts`, `plan.ts`, `plan.test.ts`, `import.ts`, `data/major-rates/cs-2026-27.json`.

- [ ] **Step 1: Failing tests** — append to `scripts/major-rates/plan.test.ts`:

```ts
describe("by-residency major rates (§15)", () => {
  const base = { cip: "11.0701", cycle: "2026-27", collectedAt: "2026-10-15" };

  it("carries them through the plan", () => {
    const f = MajorRateFile.parse({ ...base, entries: [entry({ ipedsUnitId: 1, name: "A", sourceClass: "DERIVED", inStateAdmitRate: 0.41, outOfStateAdmitRate: 0.08 })] });
    const a = planMajorRates(f, rows, catalog).programUpdates.find((u) => u.collegeId === "a")!;
    expect([a.to.inStateAdmitRate, a.to.outOfStateAdmitRate]).toEqual([0.41, 0.08]);
  });

  it("defaults them to null when absent", () => {
    const a = planMajorRates(file, rows, catalog).programUpdates.find((u) => u.collegeId === "a")!;
    expect([a.to.inStateAdmitRate, a.to.outOfStateAdmitRate]).toEqual([null, null]);
  });

  it("rejects them outside DERIVED / PUBLISHED", () => {
    const r = MajorRateFile.safeParse({ ...base, entries: [entry({ ipedsUnitId: 1, sourceClass: "ESTIMATE", outOfStateAdmitRate: 0.08 })] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run scripts/major-rates/plan.test.ts` → the 3 new tests FAIL.

- [ ] **Step 3: Schema** — in `scripts/major-rates/schema.ts`, `MajorRateEntry` object, after `year`:

```ts
    // §15: the major's rate by residency, only from published counts. Out-of-state
    // excludes international (CDS C1 convention). Optional: most schools don't publish it.
    inStateAdmitRate: z.number().gt(0).max(1).nullable().optional(),
    outOfStateAdmitRate: z.number().gt(0).max(1).nullable().optional(),
```

and in its `superRefine`, add:

```ts
    if ((e.inStateAdmitRate != null || e.outOfStateAdmitRate != null) && e.sourceClass !== "DERIVED" && e.sourceClass !== "PUBLISHED") {
      ctx.addIssue({ code: "custom", message: `${e.name}: by-residency rates need DERIVED or PUBLISHED counts` });
    }
```

- [ ] **Step 4: Planner** — in `scripts/major-rates/plan.ts`:
  - `RateValue` gains `inStateAdmitRate: number | null; outOfStateAdmitRate: number | null`.
  - `RateProgramRow` gains `inStateAdmitRate?: number | null; outOfStateAdmitRate?: number | null` (optional, so existing callers and tests still type-check).
  - Build `from` with `inStateAdmitRate: row.inStateAdmitRate ?? null, outOfStateAdmitRate: row.outOfStateAdmitRate ?? null`.
  - Build `to` with `inStateAdmitRate: e.inStateAdmitRate ?? null, outOfStateAdmitRate: e.outOfStateAdmitRate ?? null`.
  - Extend `differs` with `|| from.inStateAdmitRate !== to.inStateAdmitRate || from.outOfStateAdmitRate !== to.outOfStateAdmitRate`.

- [ ] **Step 5: Importer** — in `scripts/major-rates/import.ts`:
  - Add `inStateAdmitRate: true, outOfStateAdmitRate: true` to the `collegeProgram.findMany` select.
  - Add both fields to the `rows` map.
  - Extend the `changed` filter with the same two comparisons.
  - Add `inStateAdmitRate: u.to.inStateAdmitRate, outOfStateAdmitRate: u.to.outOfStateAdmitRate` to the `collegeProgram.update` data.
  - In the overwrite listing line, append ` · by residency ${u.to.inStateAdmitRate ?? "—"}/${u.to.outOfStateAdmitRate ?? "—"}` when either is set.

- [ ] **Step 6: Verify** — `npx vitest run` → 132; `npx tsc --noEmit -p . 2>&1 | grep scripts/` → nothing.

- [ ] **Step 7: UW data** — in `data/major-rates/cs-2026-27.json`, entry `236948`:
  - Add `"inStateAdmitRate": 0.4091, "outOfStateAdmitRate": 0.0811`.
  - Append to its `basis`: ` By residency (same page, 2026 cycle): WA residents 493/1,205 = 0.4091; US non-residents 243/2,995 = 0.0811; international (37/1,049) excluded, as in CDS C1.`
  - Validate with the Task 4 command from the CS plan → `ok 131`.
  - `npm run major-rates:import -- data/major-rates/cs-2026-27.json --dry-run` → exactly 1 changed row (UW). Then run it without `--dry-run`.

- [ ] **Step 8: Check for more** — WebFetch only, ≤ 3 searches in all: does the UC Information Center "Freshman admission by discipline" dashboard filter by residency (California resident / domestic non-resident)? If it does, add UC rates the same way, with a basis stating the counts. Don't research other schools in this task. Record what you found in the commit message.

- [ ] **Step 9: Commit** — `git add scripts/major-rates data/major-rates && git commit -m "Carry by-residency major rates through major-rates:import; add UW's"`

---

### Task 3: The seed stops erasing imported values

**Files:** Modify `prisma/seed.ts`.

The seed re-runs on every production start and writes each seeded college with
`inStateAdmitRate: null, outOfStateAdmitRate: null`. 17 of the 24 publics Task 4
fills are seeded, so the next deploy would erase their splits.

- [ ] **Step 1:** In `prisma/seed.ts`, in the college loop, replace `update: college as Prisma.CollegeUncheckedUpdateInput,` with `update: nonNull(college) as Prisma.CollegeUncheckedUpdateInput,` and add above `main()`:

```ts
// A null in the seed means "not curated here", never "erase": colleges:import and
// major-rates:import may have filled the field since, and the seed re-runs on every
// deploy. Same rule as colleges:import ("a null in the batch never erases DB data").
function nonNull<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)) as Partial<T>;
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit -p . 2>&1 | grep prisma/seed` → nothing. Then:
  1. Record UGA's `inStateAdmitRate` (currently 0.4213 from its batch; the seed has null).
  2. Run `npm run db:seed`.
  3. Confirm UGA's value is unchanged, and that Georgia Tech still reads 0.293 / 0.0893.
  4. Restore UGA's other batch fields with `npm run colleges:import -- georgia-large-publics --only-done`. Non-null seed placeholders still overwrite them; that's a known issue, out of scope here.

- [ ] **Step 3: Commit** — `git add prisma/seed.ts && git commit -m "Keep the seed from erasing imported values it doesn't curate"`

---

### Task 4: Research splits for the 24 publics → `residency-publics` batch

Operational, not TDD. The controller runs it in one wave: 6 helpers × 4 colleges.

The colleges (ipedsUnitId from the catalog):

> Arizona State, Auburn, Florida, Illinois Urbana-Champaign, Illinois Chicago, Indiana,
> Iowa, Kennesaw State, Maryland, Michigan, Michigan State, North Carolina, Ohio State,
> Penn State, Pittsburgh, Purdue, South Florida, Temple, Texas (Austin), UC Berkeley,
> UC Irvine, UC Los Angeles, UC San Diego, William & Mary

- [ ] **Step 1:** Before briefing helpers, read `.claude/skills/scrape-colleges/SKILL.md`, `references/field-guide.md` (the `inStateAdmitRate` row) and `scripts/colleges/batch.ts`, to learn the work-file shape and which fields `CollegeRecord` requires. Export each college's `ipedsUnitId | name | state | admitRate | majorsOffered` to the workspace.

- [ ] **Step 2:** Brief each helper with these rules:
  - Fill `inStateAdmitRate` / `outOfStateAdmitRate` **only** from the CDS C1 residency table (in-state / out-of-state / international, applied and admitted). In-state = admitted ÷ applied; out-of-state likewise, excluding international.
  - Use the most recent CDS; WebFetch the PDF directly (≤ 4 searches per college).
  - For UCs, if the CDS lacks the table, the UC Information Center admissions-by-residency dashboard counts are acceptable, with source `"web"` and both counts in the note.
  - In the source note, record that CDS's overall C1 rate and its year.
  - Every other field stays `null`, except what `CollegeRecord` requires. Copy `majorsOffered` from the export if it's required.
  - No table → leave both fields null and set `status: "partial"` with the reason.
  - Never estimate.
  - Write work files to `data/colleges/work/residency-publics/<ipedsUnitId>.json`.

- [ ] **Step 3:** Run `npm run colleges:build -- residency-publics` and fix any validation errors. Then the **same-cycle check**: list every college whose recorded CDS overall rate differs from the DB `admitRate` by > 0.02. Don't change `admitRate`; it's protected. Report the list, including UVA's known 0.23 vs ~0.156, since the ratio (spec D5) is skewed for those.

- [ ] **Step 4:** `npm run colleges:import -- residency-publics --only-done --dry-run`. Confirm it only fills `inStateAdmitRate` / `outOfStateAdmitRate`; nothing else non-null should change. Then run it without `--dry-run`.

- [ ] **Step 5: Commit** — `git add data/colleges/residency-publics.json data/colleges/work/residency-publics && git commit -m "Add in-state / out-of-state admit rates for 24 public universities"`

---

### Task 5: Verify against the spec's expectations

- [ ] **Step 1:** Write a throwaway script in the workspace, not the repo. It loads the catalog like `scripts/score-demo.ts` and scores the Frisco CS profile from `uniseek-test-profile.txt` (CS, `homeState: "TX"`) twice: with `homeState` and with `homeState: null`. Print band, odds and effective-rate flag for UW, Georgia Tech, Michigan, Wisconsin, UT Austin and Berkeley.

- [ ] **Step 2:** Check against the spec's table:
  - UW → reach on 0.0811 (by-residency).
  - Georgia Tech → `out-of-state via ratio`.
  - Michigan → moves only if Task 4 found its split.
  - Wisconsin ≈ unchanged.
  - UT Austin uses the in-state rate for a TX student (via ratio on its CS estimate).

  Report each one; a mismatch is a finding, not something to tune away.

- [ ] **Step 3:** §15 table check: score Georgia Tech for the §17 "danush" fixture in `scripts/score-demo.ts` with no major and `homeState: "IL"`. Odds should be ≈ 29.5% and the band reach (§15's table).

- [ ] **Step 4:** `npx tsx scripts/score-demo.ts > <workspace>/demo-after.txt`; diff against Task 0's `demo-before.txt`. Then `npx vitest run` → 132.

---

### Task 6: Docs

- [ ] **Step 1:** `docs/scoring-model.md`: replace the "Residency isn't modeled yet" limitation with a short "Residency" section. Cover which rate is used, the ratio assumption, the no-split fallback, and the flag labels. Note that dashboard cards still show the overall rate.

- [ ] **Step 2:** `.claude/skills/scrape-colleges/references/major-admit-rates.md`: add "By-residency major rates": when to record them (DERIVED/PUBLISHED counts only; international excluded) and the UW example. `references/field-guide.md`: add to the `inStateAdmitRate` row that UCs may use the UC Information Center residency dashboard when C1 lacks the table.

- [ ] **Step 3:** In `uniseek_procedures_v6.md` §14, mark item 3 (Residency) done with the commit range, and note item 4 (`D`) is unblocked: re-run §10a's table.

- [ ] **Step 4: Commit** — `git add docs .claude/skills/scrape-colleges uniseek_procedures_v6.md && git commit -m "Document residency-adjusted admit rates"`

## Follow-ups (not in this plan)

- Set the cubic term `D` (§14 #4) now that §15 lands.
- Show the effective (major + residency) rate on dashboard cards, explorer and Compare.
- Auto-admission (§7), which is residency-conditional (UT Austin top 6%).
- Fix stale overall rates found in Task 4 Step 3 (UVA first).
