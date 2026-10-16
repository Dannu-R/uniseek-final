# Major-quality bar + short bands — design

Date: 2026-10-15 · Status: approved in conversation (D2 anchor = #50, D4 = show fewer,
D7 = price exception). **Depends on** `2026-10-15-out-of-state-cost-design.md`; implement
that first, because D7 compares net prices.

## Problem

For a strong CS applicant, the surfaced list fills its target slots with weak CS programs.
Example: the Frisco TX CS profile gets Clemson (CS #75) as a target, and earlier runs showed
Wesleyan (#173).

Two mechanisms cause it:

1. **The band quota is fixed** (`buildList`: 3 reach / 5 target / 4 safety, §10c). When only
   about four strong-CS colleges fall in a student's 30–70% odds band, slot 5 goes to whatever
   is next, however weak its program.
2. **Quality barely separates programs below the top tier.**
   `programQuality = clip(1.157 − 0.1425·ln rank, 0.45, 1)`: #44 scores 0.62, #75 scores 0.54,
   and everything from ~#143 down to unranked sits at the 0.45 floor. With ambition ≈ 0.49,
   quality is only half of `match_score`.

Adding colleges doesn't fix it. 28 strong-CS publics were added on 2026-10-15, and nearly all
of them land as safeties for strong students: the target band needs schools admitting roughly
10–35%, and those were already in the catalog.

The fix is a **minimum program quality that scales with the student**, a list that may come up
**short** rather than padded, and a **price exception**: a much cheaper college just below the
bar can still take an empty slot, labeled.

## Measured basis (2026-10-15 catalog, 159 colleges, CS run)

| Profile | ambition | Targets with CS rank ≤ 25 / 40 / 50 / 75 / 100 | Safeties ≤ 50 / 75 |
|---|---|---|---|
| Developer (3.98, 1540, 17/32 AP) | 0.485 | 4 / 6 / 8 / 12 / 13 | 14 / 45 |
| Frisco (3.85, 1450, 9/15 AP) | 0.485 | 3 / 5 / 6 / 9 / 9 | 14 / 44 |
| Mid (3.6, 1300) | 0.416 | 1 / 4 / 4 / 10 / 11 | 10 / 34 |
| Low (3.3, 1150) | 0.363 | 1 / 3 / 4 / 11 / 13 | 8 / 29 |

`ambition` (§10b) comes from the student alone, so the bar scales with it.

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | When does the bar apply? | Major runs whose quality basis is `program` or `program-unranked` (the major's ranking list is collected). Not institutional-basis runs (no major, or no list). |
| D2 | How strict? | Log-linear in ambition through **#50 at ambition 0.485** and **#110 at 0.363**: `maxRank(a) = exp(ln 50 − 6.46·(a − 0.485))`. About #33 at the 0.55 maximum, #78 at 0.416, #315 at the 0.20 minimum. |
| D3 | Where does it act? | **Selection only** (`buildList`). Odds, band, match and final scores are unchanged. A college over the bar stays in `ranked` with a flag `below major-quality bar (#<rank> > #<maxRank>)`. All three bands. |
| D4 | Too few colleges clear the bar | **Show fewer**, with no padding. `RankResult.shortBands` lists the short bands, and the UI says e.g. "Only 3 targets clear the bar for CS at your level." |
| D5 | The bar empties the whole list | Guard: if every band is empty, return the unbarred list with a flag. Never silently empty. |
| D6 | `program-unranked` colleges | Rank = list size + 1 (#588 for CS), past the bar at every ambition (the loosest is #315). A college with no CS ranking is never surfaced for a CS run. Intended. |
| D7 | **Price exception** | After a band takes its above-bar colleges, its remaining empty slots may go to below-bar colleges that are **(a)** within **2× the bar** (≤ #100 for a strong student, so never Wesleyan at #173), **(b)** have a known net price **≤ half the student's budget**, using the residency-correct price from the out-of-state cost spec, and **(c)** rank best by `final_score` among such colleges. They're flagged `below major-quality bar, but much cheaper ($<price> vs budget $<budget>)` and returned in `RankResult.priceExceptions` so the UI can label them. They never displace an above-bar college. With no budget given, there's no exception. |

No change to `programQuality`'s floor.

## Expected effect (acceptance checks)

| Profile | Before | After |
|---|---|---|
| Developer (bar #50) | targets UCSD, Mudd, Michigan, Florida (#44), UC Davis | unchanged: all ≤ #50 and 8 qualify |
| Frisco TX (bar #50) | targets include Clemson (#75) | Clemson out; 6 qualify, so the band stays full. Clemson can return only through D7 if its price for a TX student is ≤ half the budget |
| Mid (bar ≈ #78) | Wisconsin, Rochester, W&M, UCSC, Case | unchanged (all ≤ #57) |
| Low (bar ≈ #110) | includes U San Diego (#110) | stays (at the bar) |
| Any no-major run | — | unchanged |

Re-run `scripts/score-demo.ts` and the four profiles above, before and after.

## Interfaces

- `lib/scoring/quality.ts`: `majorQualityBar(ambition): number` (max rank).
- `lib/scoring/score.ts`:
  - `CollegeScore` gains `qualityRank` and `qualityBasis` (already computed).
  - `buildList(kept, …, bar?)` with `bar = { maxRank, budget }`, which applies D3, D4 and D7.
  - `RankResult` gains `qualityBar?: number`, `shortBands: Band[]` and
    `priceExceptions: string[]` (college IDs).
- `app/dashboard/DashboardClient.tsx`: a short-band note, plus a "below your CS bar, much
  cheaper" tag on price-exception cards.

## Tests

- `majorQualityBar`: returns the anchors (50 at 0.485, 110 at 0.363), decreases
  monotonically, and gives > 300 at 0.20.
- `buildList`:
  - Skips over-bar colleges and leaves a band short rather than padding it.
  - D7 fills an empty slot only with a college ≤ 2× the bar and ≤ half the budget.
  - D7 never displaces an above-bar college.
  - D7 is off when no budget is given.
- `rankColleges`:
  - No major or institutional basis → no bar.
  - D5 fallback.
  - `shortBands` and `priceExceptions` are reported.
- Existing tests are unchanged when no major is named.

## Out of scope

The confidence label (deferred 2026-10-15). Changing `programQuality` or the odds model.
Merit-aid modelling for the price exception: it uses net price as published.
