# Out-of-state cost — design

Date: 2026-10-15 · Status: approved in conversation (do this before the major-quality bar's price exception)

## Problem

The budget filter and every cost figure in the app use College Scorecard's **net price by
family income** (`College.netPriceLt30k … netPriceGt110k`, `netPriceAvg`). For public
universities, Scorecard reports that figure **for in-state students only** (the scrape field
guide says so). A nonresident at a public pays a large tuition premium, so for every
out-of-state student, every public university looks far cheaper than it is:

- The **budget filter** (`netPriceFilter`) lets through publics a student can't afford.
  Florida, Michigan, the UCs and UNC all pass a TX student's $55k budget on in-state prices.
- The **explorer** labels the number "Net price for you"
  (`app/dashboard/ExplorerView.tsx`). Compare and Stats rank and total it.
- The **major-quality bar's price exception** (D7 in `2026-10-15-major-quality-bar-design.md`)
  would rest on the same wrong numbers.

This is the cost-side twin of residency (§15): the admit rate is now residency-aware, but the
price isn't.

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | What's the nonresident price? | `netPrice + max(0, tuitionOutOfState − tuitionInState)`: the published (in-state) net price for the student's income band, plus the nonresident tuition premium. No new constants. |
| D2 | Who counts as a nonresident? | Same rule as admit rates: `homeState ≠ college.state` (`residencyOf` in `score.ts`). It applies to **every** college, including UCs: the UC skip is about admit-rate pools, while the tuition premium is real. Privates charge one tuition, so the premium is 0 and nothing changes. No public/private field is needed. |
| D3 | Missing tuition at a college with a residency gap | Keep the published net price and flag `out-of-state cost unknown — showing in-state net price`. Never estimate a premium. |
| D4 | No home state | Use the published net price (today's behaviour). Where tuition data shows a premium, flag `price shown is in-state; out-of-state costs $<premium> more`. |
| D5 | Known approximation | The premium is added in full. That **overstates** cost at publics that give nonresidents merit aid (some flagships discount the premium heavily), and **understates** it where in-state students got state grants that a nonresident wouldn't. Flag every adjusted price as `out-of-state estimate` and label it in the UI ("est. for out-of-state"). Better than today's figure, which is wrong by the whole premium. |

## Data

- **New `College` fields:** `tuitionInState Int?`, `tuitionOutOfState Int?`, plus a migration.
  These are tuition and required fees for full-time first-year undergraduates, most recent
  year, in whole dollars.
- **Source:** College Navigator's "Tuition, fees, and estimated student expenses" table
  (in-state and out-of-state columns; privates show one figure, so store it in both). Add a
  `references/field-guide.md` row and a `scripts/colleges/batch.ts` field; the import treats
  them like any other non-protected field.
- **Backfill:** all 159 catalog colleges in one `colleges:import` batch (`tuition-backfill`),
  one College Navigator fetch per college with no search needed, using the ID URL. Covering
  privates too means null means "unknown", not "private".
- **The seed** already keeps nulls from erasing imported values (residency Task 3), so the
  backfill survives deploys.

## Code

- `lib/scoring/filters.ts`: `selectNetPrice` gains the residency step. It becomes
  `selectNetPrice({ incomeBand, bands, average, residency, tuitionInState, tuitionOutOfState })`
  and returns `{ price, basis: "published" | "out-of-state estimate" | "in-state (unknown premium)", premium }`.
- `lib/scoring/score.ts`: `scoreCollege` passes residency in. `CollegeScore` gains
  `netPriceBasis`, and the flags carry D3–D5.
- `app/api/explore/route.ts` computes its own band price today. Switch it to the shared
  helper so the explorer and the list agree.
- **UI:** an "est. for out-of-state" tag wherever `netPrice` shows (explorer, Compare, Stats,
  cards), and the D4 note when there's no home state.
- `lib/collegeInsight.ts`: pass both tuitions and the basis, so the AI briefing doesn't repeat
  the in-state figure as "your" price.

## Expected effect (acceptance checks)

Before and after for the Frisco TX CS profile ($55k budget, $75–110k income):
- Publics with a large premium (Florida, Michigan, the UCs, UNC, Georgia Tech) move up by
  their premium. Any whose adjusted price exceeds $55k leave the list via the budget filter.
  Expected and correct.
- Texas publics (Texas A&M, UT Austin, UT Dallas, Houston, Texas Tech) are unchanged: the
  student is in-state.
- Privates are unchanged.

Report each public's before and after price. A college leaving the list is a finding, not
something to tune away.

## Tests

- `selectNetPrice`:
  - In-state → published price.
  - Out-of-state → published price + premium.
  - Private (equal tuition) → unchanged.
  - Missing tuition → published price with the D3 basis.
  - No residency → published price, with the D4 premium reported.
- `scoreCollege`: the budget filter uses the adjusted price, so an out-of-state student over
  budget is removed and the same student in-state is kept.
- The explore route and the list return the same price for the same student and college.

## Out of scope

Merit-aid modelling (D5 approximation). Room and board differences. WUE/regional exchange
discounts. International students (no home state → D4).
