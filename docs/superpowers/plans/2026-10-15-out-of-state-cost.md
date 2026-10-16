# Out-of-State Cost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Price each college at what this student would actually pay: the published net price, plus the nonresident tuition premium when the student is out of state. Then use that price everywhere: budget filter, list, explorer, Compare, Stats and the AI briefing.

**Architecture:**
- A pure helper `lib/scoring/price.ts` with `residencyFor()` and `studentNetPrice()`. It replaces `selectNetPrice` and is shared by `/api/score` (via `scoreCollege`) and `/api/explore`.
- New `College.tuitionInState` / `tuitionOutOfState`, collected for all 159 colleges from College Navigator through the normal `colleges:import` pipeline.
- The admit-rate residency step keeps its UC skip, but builds on `residencyFor`.

**Tech Stack:** TypeScript, Prisma 6 (Postgres in Docker), zod 4, vitest, tsx, Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-10-15-out-of-state-cost-design.md`

## Global Constraints

- Nonresident price = published band price (or average) + `max(0, tuitionOutOfState − tuitionInState)`. No other constants.
- Residency is `homeState === college.state`, with no UC exception for cost.
- Missing tuition → keep the published price, basis `"in-state (premium unknown)"`. Never estimate a premium.
- Every adjusted price is labeled as an estimate in the UI ("est. for out-of-state").
- Branch `oos-cost` cut from `residency`. Commit per task; never push. Suite baseline: 133.
- Imports run `--dry-run` first. Research uses College Navigator only, by unit-ID URL: no WebSearch needed.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `prisma/schema.prisma` + migration | Modify/Create | `College.tuitionInState`, `tuitionOutOfState` |
| `scripts/colleges/batch.ts` | Modify | The two batch fields |
| `.claude/skills/scrape-colleges/references/field-guide.md` | Modify | Where tuition comes from |
| `lib/scoring/types.ts`, `mapCollege.ts` | Modify | Carry tuition into `CollegeInput` |
| `lib/scoring/price.ts` + `price.test.ts` | Create | `residencyFor`, `studentNetPrice` |
| `lib/scoring/filters.ts` | Modify | Remove `selectNetPrice` |
| `lib/scoring/score.ts` + `score.test.ts` | Modify | Use the helper; `netPriceBasis`; flags |
| `app/api/explore/route.ts`, `lib/collegeInsight.ts` | Modify | Same price for the explorer and the AI briefing |
| `app/dashboard/*.tsx` | Modify | The estimate label and the no-home-state note |
| `data/colleges/tuition-backfill.json` | Create | Tuition for 159 colleges |

---

### Task 0: Branch

- [ ] `git checkout -b oos-cost` (from `residency`; the uncommitted `app/build/demoProfile.ts` carries over). Then:
  - `git add docs/superpowers/plans/2026-10-15-out-of-state-cost.md && git commit -m "Add plan for out-of-state cost"`
  - Capture `npx tsx scripts/score-demo.ts > <workspace>/cost-demo-before.txt`.

---

### Task 1: Tuition fields end to end (no behaviour change)

**Files:** Modify `prisma/schema.prisma`, `scripts/colleges/batch.ts`, `references/field-guide.md`, `lib/scoring/types.ts`, `lib/scoring/mapCollege.ts`; create the migration.

- [ ] **Step 1: Schema** — in `model College`, after `netPriceGt110k`:

```prisma
  // Tuition + required fees, full-time first-year undergraduate, most recent year
  // (College Navigator). Privates charge one rate, so both are equal. The gap is the
  // nonresident premium added to the in-state net price (out-of-state cost spec).
  tuitionInState    Int?
  tuitionOutOfState Int?
```

  Run `npx prisma migrate dev --create-only --name add_college_tuition && npx prisma migrate deploy && npx prisma generate`. Never accept a reset. An EPERM from `generate` while the dev server runs is harmless; the types still update.

- [ ] **Step 2: Batch field** — in `scripts/colleges/batch.ts`, `CollegeFields`, after `netPriceGt110k`:

```ts
  tuitionInState: z.number().int().min(0).nullable(), // tuition + required fees, most recent year
  tuitionOutOfState: z.number().int().min(0).nullable(), // = tuitionInState at privates
```

- [ ] **Step 3: Field guide** — add a row after the net-price rows in `.claude/skills/scrape-colleges/references/field-guide.md`:
  `| tuitionInState, tuitionOutOfState | College Navigator "Tuition, fees, and estimated student expenses": the most recent year's **Tuition and fees** row, In-state and Out-of-state columns (ignore In-district). A private shows one figure: store it in both. | Integer dollars. Source year in the note. |`

- [ ] **Step 4: Types + map** — add `tuitionInState?: number | null; tuitionOutOfState?: number | null;` to `CollegeInput` after `netPriceBands`. In `mapCollege`, after `netPriceBands`, add `tuitionInState: c.tuitionInState, tuitionOutOfState: c.tuitionOutOfState,`.

- [ ] **Step 5: Verify** — `npx vitest run` → 133; `npx tsc --noEmit -p . 2>&1 | grep -E "lib/|scripts/|prisma/"` → nothing.

- [ ] **Step 6: Commit** — `git add prisma scripts/colleges/batch.ts lib/scoring .claude/skills/scrape-colleges/references/field-guide.md && git commit -m "Add in-state / out-of-state tuition to the College model and batch format"`

---

### Task 2: `studentNetPrice` + the budget filter

**Files:** Create `lib/scoring/price.ts`, `lib/scoring/price.test.ts`; modify `lib/scoring/filters.ts`, `lib/scoring/score.ts`, `lib/scoring/score.test.ts`.

- [ ] **Step 1: Failing tests** — create `lib/scoring/price.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { residencyFor, studentNetPrice } from "./price";

const pub = { bands: { B75_110K: 20000 }, average: 18000, tuitionInState: 12000, tuitionOutOfState: 40000 };

describe("residencyFor", () => {
  it("compares two-letter states", () => {
    expect(residencyFor("TX", "TX")).toBe("in-state");
    expect(residencyFor("TX", "FL")).toBe("out-of-state");
    expect(residencyFor(null, "FL")).toBeNull();
    expect(residencyFor("TX", null)).toBeNull();
  });
});

describe("studentNetPrice (out-of-state cost spec)", () => {
  it("uses the published band price in state", () => {
    expect(studentNetPrice({ ...pub, incomeBand: "B75_110K", residency: "in-state" })).toEqual({ price: 20000, basis: "published", premium: 28000 });
  });
  it("adds the nonresident premium out of state", () => {
    expect(studentNetPrice({ ...pub, incomeBand: "B75_110K", residency: "out-of-state" })).toEqual({ price: 48000, basis: "out-of-state estimate", premium: 28000 });
  });
  it("leaves a single-tuition (private) college unchanged", () => {
    const r = studentNetPrice({ bands: {}, average: 30000, tuitionInState: 60000, tuitionOutOfState: 60000, residency: "out-of-state" });
    expect(r).toEqual({ price: 30000, basis: "published", premium: 0 });
  });
  it("keeps the published price, flagged, when tuition is unknown", () => {
    const r = studentNetPrice({ bands: {}, average: 18000, residency: "out-of-state" });
    expect(r).toEqual({ price: 18000, basis: "in-state (premium unknown)", premium: null });
  });
  it("reports the premium but doesn't apply it with no home state", () => {
    expect(studentNetPrice({ ...pub, residency: null })).toEqual({ price: 18000, basis: "published", premium: 28000 });
  });
  it("falls back to the average without an income band", () => {
    expect(studentNetPrice({ ...pub, residency: "out-of-state" }).price).toBe(46000);
  });
  it("returns null price when nothing is published", () => {
    expect(studentNetPrice({ bands: {}, average: null, residency: "out-of-state", tuitionInState: 1, tuitionOutOfState: 2 }).price).toBeNull();
  });
});
```

  and append to `lib/scoring/score.test.ts`:

```ts
describe("out-of-state cost", () => {
  const ga = college({ state: "GA", netPriceAvg: 20000, tuitionInState: 12000, tuitionOutOfState: 40000 });

  it("removes a public over budget once the nonresident premium is added", () => {
    const s = scoreCollege(student({ homeState: "TX", budgetMaxNetPrice: 40000 }), ga);
    expect(s.netPrice).toBe(48000);
    expect(s.netPriceBasis).toBe("out-of-state estimate");
    expect(s.removedBy).toContain("price");
  });

  it("keeps the same college for an in-state student", () => {
    const s = scoreCollege(student({ homeState: "GA", budgetMaxNetPrice: 40000 }), ga);
    expect(s.netPrice).toBe(20000);
    expect(s.removedBy).not.toContain("price");
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run lib/scoring/price.test.ts lib/scoring/score.test.ts` → FAIL (module not found; `netPriceBasis` undefined).

- [ ] **Step 3: `lib/scoring/price.ts`**

```ts
// §2.2 net price, residency-aware (out-of-state cost spec). Scorecard's net price is
// reported for in-state students at publics; a nonresident pays the tuition premium
// on top. Privates charge one rate, so their premium is 0 and nothing changes.

import type { IncomeBand } from "./filters";

export type Residency = "in-state" | "out-of-state";
export type NetPriceBasis = "published" | "out-of-state estimate" | "in-state (premium unknown)";

// Which pool the student is in. Null when either state is unknown.
export function residencyFor(homeState: string | null | undefined, collegeState: string | null | undefined): Residency | null {
  if (!homeState || !collegeState) return null;
  return homeState === collegeState ? "in-state" : "out-of-state";
}

export interface StudentNetPrice {
  price: number | null; // what the budget filter and the UI use; null = unknown
  basis: NetPriceBasis;
  premium: number | null; // nonresident tuition premium; null = tuition unknown
}

export function studentNetPrice(input: {
  incomeBand?: IncomeBand | null;
  bands: Partial<Record<IncomeBand, number | null>>;
  average?: number | null;
  residency: Residency | null;
  tuitionInState?: number | null;
  tuitionOutOfState?: number | null;
}): StudentNetPrice {
  const banded = input.incomeBand ? input.bands[input.incomeBand] : null;
  const published = banded ?? input.average ?? null;
  const premium = input.tuitionInState != null && input.tuitionOutOfState != null
    ? Math.max(0, input.tuitionOutOfState - input.tuitionInState)
    : null;
  if (published == null) return { price: null, basis: "published", premium };
  if (input.residency !== "out-of-state" || premium === 0) return { price: published, basis: "published", premium };
  if (premium == null) return { price: published, basis: "in-state (premium unknown)", premium: null };
  return { price: published + premium, basis: "out-of-state estimate", premium };
}
```

- [ ] **Step 4: Remove `selectNetPrice`** from `lib/scoring/filters.ts`, including its comment. First run `grep -rn selectNetPrice lib app scripts` and update every caller found. Expected: `score.ts`, plus one test in `lib/scoring/preferences.test.ts` ("selectNetPrice picks the income-band column, else the average"). Move that test into `price.test.ts`, rewritten for `studentNetPrice` with `residency: null`, and keep all three cases (band, no band, band missing → average). Drop it from `preferences.test.ts` and its import. The total stays at 143.

- [ ] **Step 5: `score.ts`**
  - Import `residencyFor`, `studentNetPrice`, `type NetPriceBasis` from `./price`.
  - Change `residencyOf` to `return isUC(college) ? null : residencyFor(student.homeState, college.state);`, keeping its comment and the UC note.
  - Add `netPriceBasis: NetPriceBasis;` to `CollegeScore` after `netPrice`.
  - Replace `const netPrice = selectNetPrice(...)` with:

```ts
  const np = studentNetPrice({
    incomeBand: student.incomeBand, bands: college.netPriceBands, average: college.netPriceAvg,
    residency: residencyFor(student.homeState, college.state), // cost has no UC exception
    tuitionInState: college.tuitionInState, tuitionOutOfState: college.tuitionOutOfState,
  });
  const netPrice = np.price;
  if (np.basis === "out-of-state estimate") flags.push(`net price ${np.price} (out-of-state estimate: published + ${np.premium} nonresident premium)`);
  if (np.basis === "in-state (premium unknown)") flags.push("out-of-state cost unknown — showing in-state net price");
  if (!student.homeState && np.premium) flags.push(`price shown is in-state; out-of-state costs $${np.premium} more`);
```

  - Add `netPriceBasis: np.basis,` to the returned object after `netPrice`.

- [ ] **Step 6: Verify** — `npx vitest run` → 143; `npx tsc --noEmit -p . 2>&1 | grep lib/scoring` → nothing.

- [ ] **Step 7: Commit** — `git add lib/scoring && git commit -m "Price out-of-state students at publics with the nonresident premium"`

---

### Task 3: Explorer and AI briefing use the same price

**Files:** Modify `app/api/explore/route.ts`, `lib/collegeInsight.ts`.

- [ ] **Step 1:** In `app/api/explore/route.ts`:
  - Delete `NET_PRICE_COLUMN`, `PrismaCollegeNetPrice` and the `netPriceForStudent` lines.
  - Compute with `studentNetPrice({ incomeBand, bands: <the five columns mapped to IncomeBand keys>, average: college.netPriceAvg, residency: residencyFor(<profile.homeState>, college.state), tuitionInState: college.tuitionInState, tuitionOutOfState: college.tuitionOutOfState })`.
  - Pass `netPriceForStudent: np.price` and the new `netPriceBasis: np.basis` into `InsightCollege`.
  - Reuse `mapCollege`'s band mapping if it reads cleanly; otherwise a five-line object is fine.

- [ ] **Step 2:** In `lib/collegeInsight.ts`:
  - Add `netPriceBasis` and both tuitions to `InsightCollege`.
  - Replace the net-price line with `line("Net price for this student ($/yr)", c.netPriceForStudent == null ? null : c.netPriceBasis === "out-of-state estimate" ? \`${c.netPriceForStudent} (estimate: in-state net price + nonresident tuition premium)\` : c.netPriceForStudent)`.
  - Add `line("Tuition + fees in-state / out-of-state", …)` when both are known.
  - Note: the insight cache (`collegeInsight` table) holds old briefings with in-state prices. Say so in the commit message. Don't clear user data; a briefing regenerates when its cache entry is deleted.

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p . 2>&1 | grep -E "app/api|lib/collegeInsight"` → nothing; `npx vitest run` → 143.

- [ ] **Step 4: Commit** — `git add app/api/explore lib/collegeInsight.ts && git commit -m "Use the residency-aware net price in the explorer and AI briefing"`

---

### Task 4: UI labels

**Files:** Modify the dashboard components that show `netPrice`: `DashboardClient.tsx`, `ExplorerView.tsx`, `CompareView.tsx` and `StatsView.tsx`.

- [ ] **Step 1:** Trace how `/api/score`'s `CollegeScore` reaches each view, and carry `netPriceBasis` through every mapping or type that copies `netPrice`.

- [ ] **Step 2:** Wherever a price shows:
  - When `netPriceBasis === "out-of-state estimate"`, append a small muted "est. for out-of-state" label, styled like the existing secondary text in that component.
  - When it is `"in-state (premium unknown)"`, show "in-state price; out-of-state cost unknown".
  - In the explorer's cost card, change "Net price for you" to "Estimated net price for you" for estimates.

- [ ] **Step 3:** Plain CSS in `app/globals.css` only if no existing class fits. Keep the change visual-only.

- [ ] **Step 4: Verify** — `npx tsc --noEmit -p .` → no new errors; `npx vitest run` → 143. Report which files and spots changed.

- [ ] **Step 5: Commit** — `git add app && git commit -m "Label out-of-state price estimates in the dashboard"`

---

### Task 5: Backfill tuition for all 159 colleges

Operational. The controller runs it: 10 helpers × ~16 colleges, WebFetch only.

- [ ] **Step 1:** Export `ipedsUnitId | name` for all colleges; split into 10 groups.

- [ ] **Step 2:** Helper rules, per college:
  - WebFetch `https://nces.ed.gov/collegenavigator/?id=<ipedsUnitId>`, asking for the "Tuition, fees, and estimated student expenses" table: the most recent year's **Tuition and fees** row, In-state and Out-of-state, and the year label.
  - Write `data/colleges/work/tuition-backfill/<ipedsUnitId>.json`:
    - `{ ipedsUnitId, name (catalog name exactly), website: null, fields: { tuitionInState, tuitionOutOfState }, majorsOffered: [], sources: { both: { source: "college-navigator", url, year, note } }, notes: [], status: "done" }`
    - A private shows one figure: put it in both.
    - Missing or blocked → omit the fields, set `status: "partial"` with a note.
  - **Cross-check:** for a public, out-of-state > in-state; otherwise note it.

- [ ] **Step 3:** Build and import:
  - `npm run colleges:build -- tuition-backfill --description "In-state / out-of-state tuition for the catalog (out-of-state cost spec)"`
  - `npm run colleges:import -- tuition-backfill --dry-run`: confirm each college writes only name + the two tuition fields.
  - Then run it without `--dry-run`.

- [ ] **Step 4: Commit** — `git add data/colleges/tuition-backfill.json && git commit -m "Add in-state / out-of-state tuition for the catalog"`

---

### Task 6: Verify

- [ ] **Step 1:** In a throwaway workspace script, score the Frisco TX CS profile ($55k budget, $75–110k income) and the developer profile (`DEMO_PROFILE`) against the catalog. For every public with a premium, print `published → adjusted (premium)`, kept or removed, and band.

- [ ] **Step 2:** Check against the spec:
  - Large-premium publics (Florida, Michigan, the UCs, UNC, Georgia Tech) rise by their premium, and any over $55k are removed.
  - Texas publics are unchanged for TX students.
  - Privates are unchanged.

  List every college that left the list; that's a finding to report, not something to tune.

- [ ] **Step 3:** Run `npx tsx scripts/score-demo.ts > <workspace>/cost-demo-after.txt`, diff it against the before file, and run `npx vitest run` → 143.

---

### Task 7: Docs

- [ ] **Step 1:** `uniseek_student_preferences.md` §2.2: one paragraph on the residency-aware price, plus the D5 approximation.

- [ ] **Step 2:** `docs/scoring-model.md`: the same note. It's **untracked**, so edit it but don't stage it.

- [ ] **Step 3: Commit** — `git add uniseek_student_preferences.md && git commit -m "Document residency-aware net price"`

## Follow-ups

- The major-quality bar (`2026-10-15-major-quality-bar-design.md`), now unblocked: its D7 price exception uses `netPrice`.
- Merit-aid modelling for nonresidents (spec D5).
