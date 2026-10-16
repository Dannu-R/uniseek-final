# Residency-adjusted admit rates — design

Date: 2026-10-15 · Status: approved in conversation (D3 = A, D5 = A)

## Problem

§15: public universities admit in-state and out-of-state applicants at very different
rates. The scorer uses one blended rate for both. That blend covers two pools, and the
student belongs to exactly one of them, so the effective admit rate is wrong for both
kinds of applicant, at exactly the selective publics where the tier matters most.

Seen on the Frisco CS test profile (TX resident), after the CS admit-rate work:

| College | Rate the scorer uses | Rate for a TX applicant | Tier now | Expected |
|---|---|---|---|---|
| UW (CS) | 14.7% blended | 8.1% (Allen School, out-of-state) | target | reach |
| Georgia Tech | 12.7% overall | 8.9% out-of-state (§13d's reach judgement) | — | reach |
| Michigan | 16.4% overall | unknown (no split in catalog) | target | reach |

§14 also lists residency as item #3 and blocks setting the cubic term `D` (#4) on it:
Georgia Tech's out-of-state rate settles the §10a conflict without touching `D`.

## What already exists

- The quiz collects `homeState` (Goals step) and sends it to the scorer
  (`app/build/toPayload.ts` → `StudentInput.homeState`).
- `College.inStateAdmitRate` / `outOfStateAdmitRate` exist (schema, batch files,
  `mapCollege`) and are filled for **74 of 131** colleges from CDS C1's residency
  table (`references/field-guide.md`). Both **exclude international** applicants.
- Every admit-rate use in scoring goes through `effectiveAdmitRate` in
  `lib/scoring/score.ts`: tier floors (`floorsForAdmitRate`) and odds
  (`admissionOdds` → `collegeBar`). One substitution point covers §1, §10a and §10b.
- The scorer ignores both residency fields today (the comment says "deferred").

### The coverage gap

The 57 colleges with no split include **24 publics**, and they're the ones where
residency matters most:

> Arizona State, Auburn, Florida, Illinois Urbana-Champaign, Illinois Chicago, Indiana,
> Iowa, Kennesaw State, Maryland, Michigan, Michigan State, North Carolina, Ohio State,
> Penn State, Pittsburgh, Purdue, South Florida, Temple, Texas (Austin),
> UC Berkeley, UC Irvine, UC Los Angeles, UC San Diego, William & Mary

NC State and Missouri have an in-state rate only. The other 31 colleges without a split
are privates.

## Decisions

| # | Question | Proposal |
|---|---|---|
| D1 | Which rate counts as "in-state"? | `homeState === college.state` (two-letter codes; DC counts as a state). |
| D2 | No home state given | Overall rate, no residency label. Same as today. |
| D3 | **Privates that publish a split** (e.g. Amherst 7.7% overall, 11.6% in / 12.0% out) | **Decided: A.** The split excludes international applicants, so for a domestic student it is the more accurate pool, but it makes many selective privates easier: Amherst goes 7.7% → 12.0%, Brown 6.3% → 6.9%. Option A: use the split wherever it's published (simplest, consistent, no new field). Option B: publics only, which needs a new `College.control` field. |
| D4 | College has no split | Overall rate, flagged `residency split unknown — using overall rate`. No peer estimates (§15's own recommendation). |
| D5 | **Major rate × residency** when only the university-wide split exists | **Decided: A.** Option A, ratio: `majorRate × residencyRate / overallRate`, clamped to (0, 1]. This assumes the major's pool has the same in/out mix as the university's. Georgia Tech CS: 11.3% → 7.9% out-of-state, 25.9% in-state. Option B: ignore residency for major rates. Flagged. |
| D6 | Major rate published **by residency** (UW Allen School) | Use it directly; it wins over the ratio. UW shows why: its university-wide split is nearly flat (45.7 / 42.2) but CS is 40.9 / 8.1, so the ratio would get UW badly wrong. |
| D7 | International applicants | Out of scope. The quiz only takes US states, so they get the overall rate (D2). |

## Scoring rule (`effectiveAdmitRate`)

1. Pick the **base**: today's rule (major rate / U / fallback, §6a).
2. If `homeState` is set, apply **residency**:
   - **Major rate with a by-residency value (D6):** use that value.
   - **Base is the overall rate (U or fallback):** use `inStateAdmitRate` or
     `outOfStateAdmitRate` if present.
   - **Base is a major rate:** scale it by the matching split ÷ overall (D5), clamped
     to (0, 1].
   - **Matching split missing:** keep the base and add the D4 flag.
3. **Flag format** extends §6a's to `effective admit rate <rate> (<class>, <residency>)`,
   where residency is `in-state`, `out-of-state` or `residency n/a`. With no major and
   no home state, there's no flag (as today).

The rule needs no new constants.

## Data changes

1. **College split for the 24 publics.** A `colleges:import` batch filling only
   `inStateAdmitRate` / `outOfStateAdmitRate`, using the same CDS C1 rule as the field
   guide. For the UCs, the UC Information Center gives admits by residency. If C1 has no
   residency table, leave the fields blank (D4 applies); never estimate.
2. **Major rates by residency (D6).**
   - Add optional `inStateAdmitRate` / `outOfStateAdmitRate` to `MajorRateEntry` and
     `CollegeProgram`, plus a migration.
   - Teach `planMajorRates` / `major-rates:import` to carry them.
   - Known sources: UW (493 / 1,205 resident and 243 / 2,995 nonresident, 2026 cycle).
     Check whether the UC Information Center discipline dashboard filters by residency,
     and whether UT Austin, UNC or Maryland publish CS splits.
   - Values must come from published counts (class D or P); no estimates by residency.
3. **Same-cycle check.** The ratio (D5) mixes a split with `admitRate`, so both must come
   from the same CDS. The import should warn when they don't. UVA is already suspect:
   its catalog overall is 0.23, but its Fall 2025 rate is about 0.156.

## Expected effect (acceptance checks)

| Profile | College | Before | After |
|---|---|---|---|
| Frisco TX, CS | UW | target (14.7%) | reach (8.1%, D6) |
| Frisco TX, CS | Georgia Tech | reach (11.3%) | reach (7.9%, ratio) |
| §17 "danush" fixture | Georgia Tech | as §13d | out-of-state column reproduces §13d's reach |
| Frisco TX, CS | Michigan | target | **unchanged until** data step 1 fills its split |
| Frisco TX, CS | Wisconsin | safety | **≈ unchanged**: out-of-state 40.3% vs 40.8% overall. Residency doesn't explain this one. |
| any WI resident | Wisconsin | 40.8% | 56.4% (in-state) |

Re-run `scripts/score-demo.ts` before and after, and §10a's table, then revisit `D` (§14 #4).

## Tests (`lib/scoring/score.test.ts`)

- In-state and out-of-state each pick their rate for a U-class college; the flag names
  the residency.
- No home state → overall, no residency label.
- Split missing → base rate plus the D4 flag.
- Major rate scaled by ratio, and clamped at 1.
- By-residency major rate overrides the ratio.
- Schema: by-residency rates must be in (0, 1]; the planner passes them through.

## Out of scope

Auto-admission (§7; UT Austin's top-6% rule is residency-conditional and still
untreated). International applicants (D7). Showing the effective rate on the dashboard
cards: cards still show the overall rate, a known display gap. Setting `D`: that's a
follow-up once this lands.
