---
name: scrape-colleges
description: Research real college data for Uniseek's catalog straight from the web (no API keys) — College Navigator for the basics, each college's Common Data Set (CDS) for admissions weights/test scores/class size/housing/merit aid, the admissions site for ED/EA/RD deadlines, plus athletics, majors and the US News rank — then build a reviewable batch file and import it into Postgres. Use this whenever the user wants to add, scrape, collect, research, refresh or backfill colleges/universities for the Uniseek database or seed, replace placeholder college values with real ones, grow the catalog toward 100–300 schools, or gather admission deadlines or CDS data — even if they only say something like "add the big Texas schools" or "get me 20 more colleges".
---

# Scrape colleges into the Uniseek catalog

Uniseek scores students against the `College` table (`prisma/schema.prisma`). The 30 seeded colleges
have researched admissions numbers but **placeholder** preference fields; new colleges have nothing.
This skill has you research real values on the web, with a source recorded for every one, so the
scoring engine runs on real data. Everything is gathered with your own tools (WebSearch, WebFetch,
Read, the bundled PDF helper). There are no API keys and no paid services.

The guiding principle: **a null is honest, a guess is a bug.** The scoring engine treats null as
"unknown" and handles it; a plausible-looking number from memory silently corrupts every match. Every
value you write must come from a page you actually read this session. If you can't find it, leave it
out and say so in `notes`.

## The pipeline

```
1. pick      decide the exact list of colleges + their IPEDS unit IDs; confirm with the user
2. research  per college → data/colleges/work/<batch>/<ipedsUnitId>.json
3. build     npm run colleges:build -- <batch> --description "<the request>"   → data/colleges/<batch>.json
4. review    summarize for the user; they read the git diff
5. import    npm run colleges:import -- <batch> --dry-run, then for real (only when the user says so)
```

Steps 3 and 5 are local scripts that validate against the zod schema in `scripts/colleges/batch.ts`
(the source of truth for field names, units and ranges). Don't hand-write the batch file or your own
import code. Write per-college files and let `build` assemble them.

## 1. Pick the colleges

Turn the request into a concrete list. For filter-style requests ("biggest publics in Georgia",
"selective privates in Massachusetts", "20 more colleges"), WebSearch to build candidates, then
confirm each one's numbers on College Navigator before it makes the cut. Ranking by enrollment or admit rate
from memory is exactly the kind of guess to avoid.

- Uniseek recommends 4-year, bachelor's-granting, non-profit colleges (main campuses), so skip
  for-profits, community colleges and branch campuses unless the user asks for them.
- Find each college's **IPEDS unit ID**: it's the `id=` in its College Navigator URL
  (`https://nces.ed.gov/collegenavigator/?id=227757`). Search College Navigator by name if needed:
  `https://nces.ed.gov/collegenavigator/?q=<name>`.
- **Skip colleges already in the catalog** unless the user wants a refresh: check
  `grep -o "ipedsUnitId: [0-9]*" prisma/seed.ts` and the `ipedsUnitId`s in `data/colleges/*.json`.
- Batch name: short kebab-case describing the set (`georgia-large-publics`).

Show the user the list (name, unit ID, the stat that qualified it) and get a yes before step 2.
Research is the expensive part, so catch a wrong list here.

## 2. Research each college

**Read `references/field-guide.md` first.** It says where every field comes from and gives the exact
conversions (percent → fraction, C7 → 0–3, I3 → fraction, H2A ÷ H2, deadline cycle and year,
athletics tier, locale → setting, majors list). Unit mistakes fail the build. Semantic mistakes (e.g.
all undergrads instead of first-years for merit aid) pass the build and corrupt the data, so the guide
matters.

Per college, in this order:

1. **College Navigator** (`https://nces.ed.gov/collegenavigator/?id=<unitid>`), via WebFetch with a
   prompt asking for the exact figures listed in the field guide. It covers location, website,
   setting, religious affiliation, enrollment, net price by income, retention, athletics division and
   the programs list. Pages are long, so a targeted prompt beats "summarize this page".
2. **CDS.** WebSearch `"<college name>" common data set 2025-2026` (fall back to 2024-25). Prefer the
   school's institutional-research site. Then run the bundled helper. It prints only the needed
   sections, each tagged with its PDF page, and renders those pages to PNG:
   ```bash
   python .claude/skills/scrape-colleges/scripts/cds_extract.py "<pdf-url>"
   ```
   The helper also handles **.xlsx** CDSs (some schools publish only the spreadsheet). It prints
   each section as `CELL=value` rows, and you read values straight from the cells. Confirm from each
   table's header row which column means what (e.g. C = Very Important … F = Not Considered) before
   mapping an X. Many workbooks also carry a hidden answer key in far-right columns (AA onward,
   item codes like `C.701`). It is a flat list that is **not** aligned with the visible row beside it,
   so use it only as a cross-check, matched by item code. HTML-only CDS: read it with WebFetch.
3. **PDF: read the values from the page images.** Open the PNGs the helper printed with the Read tool.
   The text dump is for *finding* sections. `pdftotext` scrambles table columns (the X marks in
   C7, C8A, E1, C21/C22, and the numbers in C9, H2/H2A and I3 drift into neighbouring columns), and
   some PDFs use fonts that come out as gibberish. Never assign C7 ratings from the text dump: a
   wrong C7 vector changes every student's academic score at that school. (Don't point Read at the
   PDF itself, because PDF page rendering isn't available on every machine. Use the PNGs. If a
   section spills onto a page that wasn't rendered, re-run with `--render N`.)
   - Fillable-form CDSs (common) render with their checkmarks drawn. If a grid still looks empty,
     read the form-field values with pypdf (`PdfReader(path).get_fields()`) as a cross-check.
   - Don't trust the year in a CDS page header or footer. Several schools reuse last year's template
     footer ("2024-2025") on a 2025-26 CDS. Go by the content (e.g. "Fall 2025" in C1/C9).
   - WebFetch's summary of College Navigator can be wrong on details (majors lists, ACT bands).
     For majors and test scores, prefer the CDS or the raw page HTML (`curl` + grep) over the summary.
4. **Deadlines for the current cycle** from the admissions website's first-year deadlines page.
   The CDS dates are a cross-check only (they belong to the CDS's own cycle).
5. **Coordinates + conference** from the college's Wikipedia infobox (College Navigator has no
   lat/long). Use the coordinates of the main campus.
6. **US News rank** from the college's usnews.com profile (current edition). The field guide covers
   which list, ties, ranges and provenance.
   Also set `usNewsRankList` (`"NATIONAL_UNIVERSITIES"` or `"NATIONAL_LIBERAL_ARTS"`)
   to the list the rank comes from. Scoring converts Liberal Arts ranks to the
   national scale, so this matters.
7. **Admission unit**: how the college admits first-years (`UNIVERSITY`, `SCHOOL` or `MAJOR`; the
   field guide's [Admission unit](references/field-guide.md#admission-unit) section has the wording
   to look for). Record it for every new college. It isn't a batch field, so put it in `notes`
   with its URL (`"admissionUnit SCHOOL: first-years apply to a college, https://…"`). It reaches the
   database through the CS admit-rate entry (see "After importing new colleges: CS admit rates").
8. **Write the college file** (shape below).

**When a site blocks automated requests** (403/405, Cloudflare, or a page that only renders with
JavaScript, which is common on usnews.com and some admissions sites), work down this list:
1. For a CDS, the archived copy on collegedata.fyi (it links the original PDF) or `web.archive.org`.
   For other pages, the archive or a different official page with the same facts.
2. **Claude in Chrome**, which the user has approved for this. Before the first browser call, load the
   `anthropic-skills:chrome-browser` skill and follow it (one ToolSearch for the tools, a **new tab**,
   read with `get_page_text`). Use it only to *read* public pages: never sign in, submit forms or
   change settings, and close your tab when done. Note `"via Chrome"` in that field's source `note`.
   Several subagents may share the one browser, so keep to your own tab.
3. If nothing works, leave those fields out, mark the college `"partial"`, and name the blocked site
   in `notes` so the user can fill it by hand.

```json
{
  "ipedsUnitId": 227757,
  "name": "Rice University",
  "website": "https://www.rice.edu",
  "fields": {
    "city": "Houston", "state": "TX", "latitude": 29.7174, "longitude": -95.4018,
    "admitRate": 0.0801, "admitRateProvenance": "VERIFIED",
    "satP25": 1510, "satP75": 1560, "c7Rigor": 3,
    "deadlinesCycle": "2026-27", "edDeadline": "2026-11-01"
  },
  "majorsOffered": ["11.0701", "26.0101", "27.0101"],
  "sources": {
    "city": { "source": "college-navigator", "url": "https://nces.ed.gov/collegenavigator/?id=227757" },
    "admitRate": { "source": "cds", "url": "https://…/CDS_2025-26.pdf", "year": "2025-26", "note": "C1: 2,948 / 36,791" },
    "edDeadline": { "source": "admissions-site", "url": "https://admission.rice.edu/…" }
  },
  "notes": ["C7 'Class rank' row ambiguous in text; read from page 10 image"],
  "status": "done"
}
```

- `fields` holds only what you found. Every key in `fields` needs its own `sources` entry, because
  sources are what make the data reviewable.
- `status`: `"done"` when you covered every step; `"partial"` when something was unavailable (no CDS
  published, admissions site blocked). Explain the gap in `notes`.

### Batches bigger than ~4 colleges: fan out

Each college takes 10–20 tool calls, so for larger batches dispatch subagents in parallel, about 3–4
colleges each, all in one message. Give each this prompt (fill in the blanks):

> You are researching colleges for the Uniseek catalog. Read
> `.claude/skills/scrape-colleges/SKILL.md` (section "2. Research each college") and
> `.claude/skills/scrape-colleges/references/field-guide.md`, then for each college below write a
> college file to `data/colleges/work/<batch>/<ipedsUnitId>.json`. Colleges: <name (unit ID), …>.
> Today is <date>. Every value must come from a page you read, never from memory. Don't run build or
> import, and don't write report files. Just write the college files, then reply with, per college,
> what you filled, what you couldn't find, and anything ambiguous.

## 3. Build

```bash
npm run colleges:build -- <batch> --description "<the user's request, briefly>"
```

It validates every file and runs cross-field checks: P25 ≤ P75, all-six-or-none C7, coordinates
present, ED before RD, and deadlines needing a cycle. Fix what it lists by editing the college file and
rebuilding. Re-running is safe, and colleges already in the batch file are kept.

## 4. Review with the user

Summarize before importing. Keep it short and scannable:
- how many colleges are done / partial
- notable gaps (e.g. "no CDS published: X"; "C7 unreadable: Y, so archetype fallback applies")
- anything surprising or contradicting the existing seed (the seed's preference values are
  placeholders, so differences there are expected)
- suggest `git diff data/colleges/<batch>.json` (or opening the file) to eyeball it

## 5. Import

Only when the user asks. It writes to their database.

```bash
npm run colleges:import -- <batch> --dry-run
npm run colleges:import -- <batch>
```

- Needs Postgres up (`npm run db:up`) with migrations applied (`npm run db:migrate`, which adds the
  deadline columns). The dry run works with the DB down.
- Hand-curated admissions fields (`admitRate`, `usNewsRank`, residency splits + provenance) are only
  filled where the DB has null. The import lists any it kept. Pass `--overwrite-protected` only if
  the user explicitly wants the researched value to replace the seeded one.
- Each entry in `majorsOffered` becomes a `CollegeProgram` row. Existing per-major research rows
  aren't touched.

## After importing new colleges: program rankings

Per-major quality comes from collected ranking lists, not from this research pass.
After importing new colleges, add them to the ranking files and run
`npm run rankings:import` (see `references/program-rankings.md`). Until then, a
new college counts as unranked for every collected major (lowest quality), so
don't skip this step. A `⚠ ranked but no … program row` warning from
rankings:import usually means `majorsOffered` is missing a major the college really
offers, which also hides the college from every student choosing that major. Fix
the college's `majorsOffered` (re-check its majors list) rather than ignoring the
warning.

## After importing new colleges: CS admit rates

When a student names a major, scoring uses the college's admit rate for that major.
CS rates and each college's admission unit live in `data/major-rates/cs-<cycle>.json`
and are applied with `npm run major-rates:import` (see `references/major-admit-rates.md`
for the source ladder, the file format and the import steps). Add an entry for every
new college. Without one, a student choosing CS gets the college's overall rate with a
low-confidence flag, which badly overstates the odds at capped programs. The only
exception is a college that admits to the university as a whole: there the overall
rate is the CS rate, but it still needs the entry to record that.

## Out of scope (leave null)

`archetype`, which is hand-researched under the procedures doc's §16/§18 rules. Don't
go hunting for it. Per-major admit rates are not part of the college file either: CS
rates have their own research pass and data file (`references/major-admit-rates.md`).
If you happen to see a per-major rate in an official source, put it in `notes` for
that pass. Program ranks are collected separately; see `references/program-rankings.md`.

(`usNewsRank` *is* in scope; see the field guide. The scorer skips any college without both
`admitRate` and `usNewsRank` (`lib/scoring/mapCollege.ts`), so a college missing either one never
reaches a student's list. Treat those two as must-haves and say clearly in the review when one is missing.)
