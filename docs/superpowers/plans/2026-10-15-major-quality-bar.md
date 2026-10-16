# Major-Quality Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a major run, never fill a list slot with a program ranked below a bar that scales with the student's ambition. A band that runs out of qualifying colleges shows fewer instead of padding.

**Architecture:**
- `majorQualityBar(ambition)` in `lib/scoring/quality.ts` turns ambition into a maximum program rank.
- `scoreCollege` exposes `qualityRank`, `qualityBasis` and `ambition`. Ambition depends only on the student; `rigor.effectiveVolume` doesn't use the college's floors.
- `rankColleges` computes the bar once and passes it to `buildList`, which skips over-bar colleges.
- `RankResult` reports `qualityBar` and `shortBands`, and the dashboard shows a one-line note under a short band.
- Odds, bands and scores are untouched.

**Tech Stack:** TypeScript, vitest, Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-10-15-major-quality-bar-design.md`

## Global Constraints

- The bar applies only to colleges whose `qualityBasis` is `"program"` or `"program-unranked"` and only when a major is named. Every other college passes.
- `maxRank(a) = exp(ln 50 − 6.46·(a − 0.485))`, through #50 at 0.485 and #110 at 0.363.
- Selection only: `band`, `odds`, `matchScore` and `finalScore` never change.
- Short bands are never padded. If the bar empties the whole list, fall back to the unbarred list (`qualityBar` undefined, `barRelaxed: true`).
- Branch `quality-bar`, cut from `oos-cost`. Commit per task; never push. Suite baseline: 143.

---

### Task 0: Branch

- [ ] `git checkout -b quality-bar`, then:
  - `git add docs/superpowers/specs/2026-10-15-major-quality-bar-design.md docs/superpowers/plans/2026-10-15-major-quality-bar.md && git commit -m "Drop the price exception from the quality-bar spec; add its plan"`
  - Capture `npx tsx scripts/score-demo.ts > <workspace>/bar-demo-before.txt`.

---

### Task 1: The bar in scoring

**Files:** Modify `lib/scoring/quality.ts`, `lib/scoring/score.ts`, `lib/scoring/score.test.ts`.

- [ ] **Step 1: Failing tests** — append to `lib/scoring/score.test.ts` (add `majorQualityBar` to the imports, from `./quality`):

```ts
describe("major-quality bar", () => {
  it("passes through the spec's anchors and loosens as ambition falls", () => {
    expect(majorQualityBar(0.485)).toBeCloseTo(50, 6);
    expect(majorQualityBar(0.363)).toBeCloseTo(110, 4);
    expect(majorQualityBar(0.55)).toBeLessThan(majorQualityBar(0.485));
    expect(majorQualityBar(0.2)).toBeGreaterThan(300);
  });

  const mk = (band: "reach" | "target" | "safety", final: number, qualityRank: number, qualityBasis = "program"): CollegeScore =>
    ({ band, finalScore: final, quality: 0.5, odds: 0.5, qualityRank, qualityBasis, flags: [] } as unknown as CollegeScore);

  it("skips over-bar colleges and leaves the band short instead of padding", () => {
    const kept = [mk("target", 0.9, 10), mk("target", 0.8, 141), mk("target", 0.7, 30), mk("target", 0.6, 588, "program-unranked")];
    const list = buildList(kept, 3, 5, 4, 50);
    expect(list.map((c) => c.qualityRank)).toEqual([10, 30]);
  });

  it("lets colleges with a non-program basis through", () => {
    const list = buildList([mk("target", 0.9, 200, "institutional")], 3, 5, 4, 50);
    expect(list).toHaveLength(1);
  });

  it("applies the bar on a major run and reports short bands", () => {
    // Strong student; two CS-ranked targets, one far over any bar.
    const s = student({ majorCip: "11.0701", gpaUnweighted: 4.0, satSuperscore: 1580, apCoursesTaken: 16, activities: [{ tier: 4 }, { tier: 3 }, { tier: 3 }] });
    const colleges = [
      college({ id: "good", admitRate: 0.5, majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 20 } }),
      college({ id: "weak", admitRate: 0.5, majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 400 } }),
    ];
    const r = rankColleges(s, colleges, loadedRankingLists(new Set(["11.0701"])));
    expect(r.qualityBar).toBeDefined();
    expect(r.list.map((c) => c.collegeId)).toEqual(["good"]);
    expect(r.ranked.find((c) => c.collegeId === "weak")!.flags.some((f) => f.startsWith("below major-quality bar"))).toBe(true);
    expect(r.shortBands.length).toBeGreaterThan(0);
  });

  it("does nothing without a major", () => {
    const r = rankColleges(student(), [college({ id: "a" })]);
    expect(r.qualityBar).toBeUndefined();
    expect(r.shortBands).toEqual([]);
  });

  it("falls back to the unbarred list when the bar would empty it", () => {
    const s = student({ majorCip: "11.0701" });
    const r = rankColleges(s, [college({ id: "weak", majorProgram: { cipCode: "11.0701", admitRate: null, programRank: 580 } })], loadedRankingLists(new Set(["11.0701"])));
    expect(r.list.map((c) => c.collegeId)).toEqual(["weak"]);
    expect(r.qualityBar).toBeUndefined();
    expect(r.barRelaxed).toBe(true);
  });
});
```

  Look at how the existing "program quality basis" tests build lists and colleges (`loadedRankingLists`, `RANKING_LISTS`), and adjust the two `rankColleges` tests' fixtures to match if needed. Their **intent** must hold: the major run is barred, and the no-major run isn't. If a strong-student fixture lands both colleges outside the target band, assert on the band they do land in. Report any fixture change.

- [ ] **Step 2: Run** — `npx vitest run lib/scoring/score.test.ts` → the new tests FAIL.

- [ ] **Step 3: `quality.ts`** — append:

```ts
// Major-quality bar (major-quality-bar spec D2): the worst program rank a major run may
// surface, by the student's ambition (§10b). Log-linear through #50 at ambition 0.485
// and #110 at 0.363 — judgement anchors, checked against four profiles in the spec.
const BAR_AMBITION = 0.485;
const BAR_RANK = 50;
const BAR_SLOPE = Math.log(110 / 50) / (0.485 - 0.363); // ≈ 6.46

export function majorQualityBar(ambition: number): number {
  return Math.exp(Math.log(BAR_RANK) - BAR_SLOPE * (ambition - BAR_AMBITION));
}
```

- [ ] **Step 4: `score.ts`**
  1. Import `majorQualityBar` and `type QualityBasis` from `./quality`.
  2. `CollegeScore` gains, after `quality`:
     - `qualityRank: number; // the rank behind quality (§10b)`
     - `qualityBasis: QualityBasis;`
     - `ambition: number; // §10b — depends on the student only`

     In the returned object, add `qualityRank: q.rank, qualityBasis: q.basis, ambition: amb,`.
  3. `buildList` gains a final `maxRank?: number` parameter. Update its comment to say the quota is a **maximum** when a bar applies, and filter inside `inBand`:

```ts
  const barred = (c: CollegeScore) =>
    maxRank != null && (c.qualityBasis === "program" || c.qualityBasis === "program-unranked") && c.qualityRank > maxRank;
  const inBand = (band: Band) => kept.filter((c) => c.band === band && !barred(c)).sort(byFinal);
```

  4. `RankResult` gains `qualityBar?: number; shortBands: Band[]; barRelaxed?: boolean;`. Add `shortBands: []` to the empty-result return.
  5. In `rankColleges`, replace `return { list: buildList(kept), ranked, removed, empty: false };` with:

```ts
  // Major-quality bar (spec): on a major run with a collected ranking list, a program
  // below the student's bar can't fill a slot, and a band that runs out stays short.
  const majorRanked = !!student.majorCip && kept.some((s) => s.qualityBasis === "program" || s.qualityBasis === "program-unranked");
  let qualityBar = majorRanked ? majorQualityBar(kept[0].ambition) : undefined;
  let list = buildList(kept, 3, 5, 4, qualityBar);
  let barRelaxed: boolean | undefined;
  if (qualityBar != null && list.length === 0) {
    list = buildList(kept); // D5: never silently empty
    qualityBar = undefined;
    barRelaxed = true;
  }
  if (qualityBar != null) {
    for (const s of kept) {
      if ((s.qualityBasis === "program" || s.qualityBasis === "program-unranked") && s.qualityRank > qualityBar) {
        s.flags.push(`below major-quality bar (#${s.qualityRank} > #${Math.round(qualityBar)})`);
      }
    }
  }
  const QUOTA: Record<Band, number> = { reach: 3, target: 5, safety: 4 };
  const shortBands = qualityBar == null ? [] : (["reach", "target", "safety"] as Band[]).filter(
    (b) => list.filter((c) => c.band === b).length < Math.min(QUOTA[b], kept.filter((c) => c.band === b).length),
  );
  return { list, ranked, removed, empty: false, qualityBar, shortBands, barRelaxed };
```

  A band counts as "short" only when the bar removed colleges it would otherwise have shown.

- [ ] **Step 5: Verify** — `npx vitest run` → 149; `npx tsc --noEmit -p . 2>&1 | grep lib/scoring` → nothing. The existing quota test still passes, because without `maxRank` nothing is barred.

- [ ] **Step 6: Commit** — `git add lib/scoring && git commit -m "Bar weak programs from major-run lists by the student's ambition"`

---

### Task 2: API + dashboard note

**Files:** Modify `app/api/score/route.ts`, `app/dashboard/DashboardClient.tsx`.

- [ ] **Step 1:** In `app/api/score/route.ts`'s JSON response, add `qualityBar: result.qualityBar ?? null, shortBands: result.shortBands,`.

- [ ] **Step 2:** In `DashboardClient.tsx`:
  - Add `qualityBar?: number | null; shortBands?: string[]` to the result type.
  - In the band loop (`rs-band` / `rs-band__head`), when `result.shortBands?.includes(key)`, render under the head:
    `<p className="rs-band__note">Only {cols.length} {label.toLowerCase()}{cols.length === 1 ? "" : "es"} clear the bar for your major at your level — no weaker programs added to fill the list.</p>`
  - Match the label grammar to the band names ("reach/reaches", "match/matches", "safety/safeties"), using a tiny helper if needed.
  - Add `.rs-band__note`, styled like the existing muted secondary text, in the dashboard's stylesheet under `app/styles/` (find where `.rs-band__blurb` is defined). Simple, readable code.

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p .` → only the 2 pre-existing `ExplorerView` `animate` errors; `npx vitest run` → 149.

- [ ] **Step 4: Commit** — `git add app/api/score app/dashboard app/styles && git commit -m "Show when a band is short because of the major-quality bar"`

---

### Task 3: Verify + docs

- [ ] **Step 1:** Throwaway workspace script: score the developer (`DEMO_PROFILE`), Frisco TX, mid and low profiles from the spec. Print the list, `qualityBar`, `shortBands`, and any college flagged below the bar that would otherwise have been listed.

- [ ] **Step 2:** Check the spec's table:
  - Wellesley and Hamilton gone for the developer.
  - Clemson gone for Frisco.
  - Mid and low unchanged.
  - No-major run unchanged.

  Report mismatches; don't tune them away.

- [ ] **Step 3:** Run `npx tsx scripts/score-demo.ts > <workspace>/bar-demo-after.txt` and diff it against before.

- [ ] **Step 4:** In `uniseek_procedures_v6.md` §14, update item 8 ("Document the band quota as load-bearing"): the quota is now a maximum on major runs, with the bar (link the spec). Commit `git add uniseek_procedures_v6.md && git commit -m "Note the major-quality bar in the open items"`.
