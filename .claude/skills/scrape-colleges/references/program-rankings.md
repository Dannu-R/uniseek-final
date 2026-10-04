# Program rankings (per-major quality)

When a student names a major, scoring uses the college's rank on that major's
published list (lib/scoring/quality.ts). Which list each major uses, and how long
it is, lives in `lib/scoring/rankingLists.ts` → `RANKING_LISTS.programs`. A major
registered there means its list is collected; a college missing from it counts as
unranked (rank = list size + 1, the quality floor). Unregistered majors fall back
to the institutional rank. Finance (52.0801) uses the short finance list and, when a
college is not on it, falls back to that college's Business (52.0201) rank.

## Sources

| Majors | Source | Where ranks are readable |
|---|---|---|
| CS, Business, Economics, Nursing, Finance | US News 2027 | each college's `https://www.usnews.com/best-colleges/<slug>/overall-rankings?format=json`, fetched from inside a usnews.com tab (list pages paywall ranks below ~#10). Slugs come from the ranking list's JSON search endpoint. |
| Biology, Political Science, English, Math (slug `best-colleges-for-math`), Chemistry, Communications, Psychology | Niche | the per-major list pages (`niche.com/colleges/search/best-colleges-for-<major>/?page=N`) |
| Mechanical, Electrical, Computer Engineering | Niche | all three use Niche's single combined `best-colleges-for-engineering` list (Niche has no per-specialty engineering lists) |

usnews.com and niche.com block scripted fetches. Use Claude in Chrome (load the
`anthropic-skills:chrome-browser` skill first), your own tab, read-only, never
sign in, and close the tab after.

## Niche: depth and reading

Collect only the top 200 per list (pages 1-8, 25 per page). Catalog colleges below
200 are left out, which makes them unranked. Quality floors at 0.45 from about rank
146, so deeper ranks change nothing. `size` stays the full list size ("1,852
results"), since that is what the floor uses.

Read each page's `document.body.innerText`. A rank line looks like
`#<n> Best Colleges for <Major> in America`, followed by the college name and a
`City, ST` line. The page also has a "Top-Ranked Colleges" block and badge rows
("#N Colleges with the Best Academics") that a loose regex mis-matches, and page 1
uses a slightly different layout. So require the `City, ST` line, and check you got
25 consecutive ranks on every page before accepting it.

## File format: `data/rankings/<source>-<edition>-<listKey>.json`

Schema: `scripts/rankings/schema.ts` (`RankingFile`). One file per list. The
engineering files add the CIP to the name,
`niche-<edition>-best-colleges-for-engineering-<cip>.json`: identical entries, one
file per CIP. Entries are `{ ipedsUnitId, name, rank, tie, band }`. For a range
like "#541-587", `rank` is the first number and `band` is the text. `tie` is true
when the source marked the rank tied. `size` is the list's "N results" and must
match `RANKING_LISTS`.

## Matching rows to catalog colleges

Match Niche and US News rows to catalog colleges by name + state. Save all rows you
read, not just the matches, so missed aliases can be audited later (keep that audit
file in a scratch/workspace location, not in `data/rankings/`, which
`rankings:import` reads wholesale). Watch for
lookalikes: Rutgers campuses, UC campuses, Washington University in St. Louis vs
University of Washington, Miami University vs University of Miami.

## Refreshing or adding colleges

1. New colleges imported? Add their entries to every existing ranking file (same
   collection method), or re-collect the lists.
2. New edition? Re-collect every file, update `edition`/`size` in `RANKING_LISTS`.
3. `npm run rankings:import -- --dry-run`, review (`⚠ ranked but no program row`
   means the college's offered majors and the ranking disagree; check the majors,
   don't force a row), then `npm run rankings:import`.

## Deploying

The ranks live in the database, not the code. After running migrations on a new or
production database, run `npm run rankings:import` (the ranking files are in
`data/rankings/`). Until then `/api/score` falls back to institutional ranks for
majors whose lists have no imported ranks, and logs a warning naming them. An import
that would clear over half of a CIP's ranked rows is refused unless `--force` is passed.
