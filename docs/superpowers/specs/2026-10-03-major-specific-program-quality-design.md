# Major-specific program quality — design

Date: 2026-10-03 · Status: approved in conversation, pending spec review

## Problem

`program_quality` is meant to be major-specific (procedures doc §10b, decision #1):
when a student names a major, quality reads the PROGRAM's published rank. The code
honors that (`lib/scoring/quality.ts` `qualityRank`), but only 12 seeded colleges
have a `CollegeProgram.programRank`. Every other college silently falls back to its
institutional US News rank. Two distortions follow, seen on a real CS test run:

1. **Liberal arts colleges score as elite programs.** US News ranks them on a
   separate list, so Swarthmore (#3 National Liberal Arts) gets quality 1.00 for
   CS, above Cornell (0.78) and Berkeley (0.73).
2. **The fallback is invisible.** "No program rank" can mean *the college is not on
   the published list* or *we never collected that list*, and the code can't tell
   them apart.

## Decisions (made with the user)

| # | Question | Decision |
|---|---|---|
| D1 | Major has a collected program list; college offers the major but isn't on it | Rank = list size + 1 ("just past the end") → quality floor |
| D2 | Ranking source per major | US News where it publishes a full undergraduate list; Niche for the rest |
| D3 | Engineering (ME/EE/CompE) | Niche per-major lists (US News splits doctorate / non-doctorate lists, which aren't comparable) |
| D4 | No major named | Institutional US News rank; Liberal Arts ranks converted to a national-equivalent by percentile |
| D5 | Where list metadata lives | Approach A: a typed config in code (`lib/scoring/rankingLists.ts`), not a DB table |

Source per controlled major (D2/D3):

| CIP | Major | Source | List |
|---|---|---|---|
| 11.0701 | Computer Science | US News | computer-science-overall |
| 52.0201 | Business Administration | US News | business-overall |
| 45.0601 | Economics | US News | economics-overall |
| 51.3801 | Nursing | US News | nursing-overall |
| 52.0801 | Finance | US News | business-finance (top-N specialty), falling back to the college's Business rank |
| 26.0101 | Biology | Niche | Best Colleges for Biology |
| 45.1001 | Political Science | Niche | Best Colleges for Political Science |
| 23.0101 | English | Niche | Best Colleges for English |
| 27.0101 | Mathematics | Niche | Best Colleges for Mathematics |
| 40.0501 | Chemistry | Niche | Best Colleges for Chemistry |
| 09.0101 | Communication | Niche | Best Colleges for Communications |
| 42.0101 | Psychology | Niche | Best Colleges for Psychology (US News lists only ~top 10 with ranks) |
| 14.1901 | Mechanical Engineering | Niche | Best Colleges for Mechanical Engineering |
| 14.1001 | Electrical Engineering | Niche | Best Colleges for Electrical Engineering |
| 14.0901 | Computer Engineering | Niche | Best Colleges for Computer Engineering |

Niche list names/URLs are confirmed during the collection spike (Rollout step 2);
a major whose Niche list doesn't exist simply stays uncollected and uses rule R2.

Known trade-off, accepted: Niche blends academics, selectivity, outcomes and
reviews, so its lists track selectivity more than US News peer ranks do (the
collinearity §10b warns about). Mixing sources is sound because a run names one
major, so every college in a run is ranked on the same list.

## Quality-rank rules

`programQuality(rank)` is unchanged (same log curve, clip 0.45–1.0, zero new
parameters). Only the rank fed into it changes:

- **R1 — major named, its list collected:** the college's program rank on that
  list; if absent, `listSize + 1`. Finance has its own chain (R1-finance below).
- **R2 — major named, its list not yet collected:** the college's program rank if it
  has one anyway (individually researched, §18b — e.g. the seeded CS ranks);
  otherwise the institutional rank, normalized as in R3. (Today's behavior; a
  safety net while lists are filled in.)
- **R3 — no major named:** institutional rank, normalized by list:
  National Universities → unchanged; National Liberal Arts →
  `max(1, round(lacRank / lacListSize × nationalListSize))`.

**R1-finance (exact):** if the college has a finance specialty rank → use it.
Else if the Business list is collected → the college's Business rank, or
`businessListSize + 1` if absent. Else → R2. Rationale: the finance specialty
list is only ~46 schools; for everyone else, business-school standing is the
closest published signal.

Ranges at the bottom of a list (e.g. "#541–587") store the band's first number.
Because the quality curve already floors at 0.45 near rank ~146, ranges and
"past the end" land on the same floor; no extra rule is needed.

## Components

### `lib/scoring/rankingLists.ts` (new)
Typed config, pure data:
- `RANKING_LISTS.institutional`: `{ NATIONAL_UNIVERSITIES: { size, edition }, NATIONAL_LIBERAL_ARTS: { size, edition } }`. Sizes are the "N results" counts read from the US News list pages at collection time (National Universities: 428 in the 2027 edition).
- `RANKING_LISTS.programs`: keyed by CIP → `{ source: "USNEWS" | "NICHE", listKey, edition, size, url, fallbackCip? }` (`fallbackCip: "52.0201"` on Finance). **A major present in this map means its list has been collected**; absent means R2.

### `lib/scoring/quality.ts` (changed)
`qualityRank` becomes a function of a small input object instead of three
positional args:
```ts
qualityRank({
  majorCip,                 // student's major or null
  institutionalRank,        // College.usNewsRank
  institutionalList,        // "NATIONAL_UNIVERSITIES" | "NATIONAL_LIBERAL_ARTS" | null
  programRank,              // rank for majorCip, or null
  fallbackProgramRank,      // rank for the list's fallbackCip (Finance → Business), or null
}): { rank: number; basis: "program" | "program-unranked" | "fallback-program" | "institutional" | "institutional-lac-converted" }
```
It reads `rankingLists.ts`. The returned `basis` is surfaced as a flag on
`CollegeScore` so a result can explain itself. `programQuality` is untouched.
`institutionalList: null` (unknown) is treated as National Universities.

### `lib/scoring/types.ts`, `mapCollege.ts`, `score.ts` (changed)
- `CollegeInput` gains `usNewsRankList` and `fallbackProgramRank`.
- `mapCollege` finds the fallback program row (Finance → Business) by
  `RANKING_LISTS.programs[majorCip].fallbackCip`.
- `score.ts` calls the new `qualityRank` and records `basis` in `flags`.

### Schema (`prisma/schema.prisma`) + migration
- New enum `UsNewsRankList { NATIONAL_UNIVERSITIES NATIONAL_LIBERAL_ARTS }`.
- `College.usNewsRankList UsNewsRankList?`.
- No change to `CollegeProgram`; `programRank` + `programRankSourceClass` are reused.
  Ranks read off a published list are stored as `LIST_ORDER` (§18b "O").

### Ranking files (`data/rankings/<source>-<edition>-<listKey>.json`, committed)
```json
{ "source": "USNEWS", "edition": "2027", "cip": "11.0701", "listKey": "computer-science-overall",
  "url": "...", "size": 587, "collectedAt": "2026-10-04",
  "entries": [ { "ipedsUnitId": 227757, "name": "Rice University", "rank": 21, "tie": true, "band": null } ] }
```
Validated by a zod schema in `scripts/rankings/schema.ts`. Entries list only
colleges in the catalog; absence means unranked.

### `npm run rankings:import` (new, `scripts/rankings/import.ts`)
- Validates each file and checks `size`/`edition` against `rankingLists.ts`
  (mismatch → error).
- For each entry: upserts `programRank` + `programRankSourceClass = LIST_ORDER`
  on the existing `CollegeProgram (collegeId, cipCode)` row. It **does not create**
  program rows; a ranked college with no row for that major is reported for review
  (offered-majors data and the ranking disagree).
- Clears `programRank` on catalog colleges absent from a collected list (so stale
  2026 estimates don't survive), reporting each clear.
- `--dry-run` like `colleges:import`.

### `usNewsRankList` backfill
- `scripts/colleges/batch.ts`: add `usNewsRankList` to `CollegeFields`; `colleges:import` writes it.
- One-off backfill for the 131 existing colleges: derive from each batch file's
  `usNewsRank` source note ("National Liberal Arts Colleges" vs "National
  Universities"); the 30 seeded colleges are National Universities.

## Data collection (Rollout steps 2–3)

- **US News:** one free page per college (`/best-colleges/<slug>/overall-rankings`)
  shows all its program ranks (CS, Business, Economics, Nursing, Finance), since
  list pages paywall ranks below ~#10. 131 pages via Claude in Chrome, read-only.
- **Niche:** per-major list pages, paged until every catalog college is found or the
  list ends. Niche blocks bots heavily, so a spike on one major comes first; if it
  fails, Niche majors stay uncollected (R2) and we revisit.
- Licensing note (accepted for the prototype): US News and Niche data are
  proprietary; check terms / licensing before a paid launch.

## Testing

Vitest unit tests for `qualityRank` covering: R1 ranked; R1 unranked
(`size + 1`); R2 uncollected major; R1-finance each branch; R3 national
unchanged; R3 LAC conversion (incl. `max(1, …)`); `institutionalList: null`.
Update `score.test.ts` for the new signature and the `basis` flag. Before/after
check: re-run the Frisco CS test profile (`uniseek-test-profile.txt`) and confirm
LACs no longer take CS reaches on quality alone.

## Rollout order

1. Code + schema + migration + tests + `usNewsRankList` backfill. With no lists in
   `RANKING_LISTS.programs` yet, the only behavior change is the LAC conversion (R3/R2).
2. Niche spike on one major.
3. Collect ranking files (US News per-college pages; Niche lists).
4. Add each collected list to `RANKING_LISTS.programs`; `rankings:import --dry-run`, then import.
5. Verify with the test profile.
6. Update the `scrape-colleges` skill: new `references/program-rankings.md`
   (collection + file format + `rankings:import`), SKILL.md research step records
   `usNewsRankList` and a "Refresh program rankings" section, field guide replaces
   "program ranks out of scope" with a pointer to the new reference.

## Out of scope

Residency-specific admit rates (§15) and per-major admit rates for capped programs
(§6a). Both affect odds, not quality, and get their own designs.

## Niche spike result

Run on: 2026-10-03

**Decision: GO for 7 majors; the 3 engineering majors are not available on Niche.**
Task 8 collects Niche lists for biology, political science, English, mathematics, chemistry,
communications and psychology. Mechanical, electrical and computer engineering stay out of
`RANKING_LISTS.programs` (rule R2 applies) unless another source is chosen; Niche only offers one combined
engineering list.

**Amended 2026-10-04 (controller ruling, pending user sign-off):** the three engineering CIPs (14.1901, 14.1001, 14.0901) use Niche's combined `best-colleges-for-engineering` list (one comparable list across doctorate/non-doctorate schools; better than R2's institutional fallback). Cost: the three majors share ranks, and the combined list ranks some schools that don't offer the specialty (reported as 'no program row' on import).

| Major | URL (under `https://www.niche.com/colleges/search/`) | Total count | Notes |
|---|---|---|---|
| biology | `best-colleges-for-biology/` | 1,852 | probed pages 1 and 2 |
| political science | `best-colleges-for-political-science/` | 1,335 | |
| English | `best-colleges-for-english/` | 1,669 | |
| mathematics | `best-colleges-for-math/` | 1,650 | `...-for-mathematics/` is a 404; the slug is `math` |
| chemistry | `best-colleges-for-chemistry/` | 1,376 | |
| communications | `best-colleges-for-communications/` | 1,833 | page title is "Communications & Journalism" |
| psychology | `best-colleges-for-psychology/` | 1,851 | |
| mechanical engineering | not found | n/a | `...-for-mechanical-engineering/` 404 |
| electrical engineering | not found | n/a | `...-for-electrical-engineering/` 404 |
| computer engineering | not found | n/a | `...-for-computer-engineering/` 404 |

Related: `best-colleges-for-engineering/` exists (combined list, 1,279 colleges), as does an
engineering-technicians list. No variant slugs were tried beyond one per major (page-load budget).

- **Bot wall:** none. No CAPTCHA or "verify you are human" text on any of the 14 page loads, in a normal
  Chrome session, no sign-in. A sign-up modal was not an obstacle to reading text.
- **Paging:** `?page=N`, 25 colleges per page (page 2 showed "26 - 50 of 1,852"). Total is in
  `.map__pagination__viewing` as "1 - 25 of 1,852" (text of the pagination element).
- **Reading ranks:** `document.body.innerText` carries, per card, a line `#<rank> Best Colleges for
  <Major> in America`, then the college name, then `City, ST` (followed by "4 Year" with no separator).
  Regex `^#(\d+) Best Colleges for [^\n]+ in America\n([^\n]+)\n([^\n]*?, [A-Z]{2})(4 Year|2 Year|Online)?$`
  (flags `gm`) returned exactly 25 rows on pages for political science, psychology, communications, math, English
  and biology page 2. Ranks run consecutively across pages.
- **Gotcha:** the page also holds a "Top-Ranked Colleges" block and per-college "#N Colleges with the Best
  Academics/Professors" lines with a different layout. On biology page 1 and chemistry page 1 a looser
  regex picked these up, so the collector must require the `, ST` city line (as above) and check that it
  gets 25 rows with consecutive ranks.
- **Time per page:** about 1 to 2 s to load (browser load event 0.9 to 2.1 s). Pacing was a few seconds
  between loads.
- **Not tested:** 10+ consecutive pages without a challenge. The probe was capped at about 15 page loads
  (14 used), so only page 1 (and page 2 for biology) was sampled. Mitigation for Task 8: only the top
  ~100 to 300 are needed (4 to 12 pages per major), pace requests by a few seconds, and stop and record on
  any challenge.
