# Major admit rates (CS) and admission units

When a student names a major, scoring uses the college's admit rate **for that
major** instead of the overall rate (§6a, `effectiveAdmitRate` in
`lib/scoring/score.ts`). For capped programs the difference is large: UW is 42%
overall but its Allen School direct admit runs ~15%. A college with no researched
CS rate falls back to its overall rate with a low-confidence flag, **unless** it
admits to the university as a whole, in which case the overall rate *is* the CS
rate. So every catalog college needs two things: a CS entry in the data file and
an `admissionUnit`.

Every value still follows the main rule: **a null is honest, a guess is a bug.**
An estimate is allowed here, but only as class E with its basis written out.

## Admission unit (`College.admissionUnit`)

How the college admits first-years. Recorded for every college, CS or not.

| Value | Meaning | Example |
|---|---|---|
| `UNIVERSITY` | Admits to the university as a whole; majors are declared later | Caltech, UNC, Michigan State |
| `SCHOOL` | Admits into a school/college within it (Engineering, Arts & Sciences, …) | Virginia Tech (General Engineering), Penn State, USC |
| `MAJOR` | Admits directly to the major | UW Allen School direct-to-major, UIUC, the UC campuses |
| `null` | Unknown | |

The field guide's [Admission unit](field-guide.md#admission-unit) section lists the
wording that signals each value. `UNIVERSITY` matters beyond CS: the scorer uses the
overall rate as a fact (label `U`, no "unresearched" flag) for **any** major there.

## The source ladder

Work down the ladder and record the rung you stopped on as `sourceClass`:

| class | enum | meaning | stored `admitRate` | Example from `cs-2026-27.json` |
|---|---|---|---|---|
| U | `UNIVERSITY` | No CS-specific selection at first-year entry, so the CS rate **is** the overall rate | `null` | Michigan (CS cap removed as of Spring 2026; CS open to any CoE or LSA student who meets declaration requirements); Florida (freshmen apply to UF, declare CS at Preview) |
| D | `DERIVED` | Arithmetic on the school's own published counts | the rate | Georgia Tech College of Computing enrollment roundup: 1,547 admits / 13,711 applications = 0.1128; UW Allen School direct-to-major stats: 773 / 5,249 = 0.1473; UC campuses from the UC Information Center dashboard (below) |
| P | `PUBLISHED` | The school publishes the per-major rate itself | the rate | UIUC admit-rate page, CS 7.4% (Fall 2025); Purdue class profile, CS 63.4% (Fall 2026) |
| C | `CONSENSUS` | ≥3 independent secondary sources agree | the rate | Carnegie Mellon SCS ~5% (CMU publishes no college-level rates) |
| E | `ESTIMATE` | Named peers or a stated structural argument; `basis` must say which | the rate | Maryland 0.15 (argument, below); USC ~0.07 (peers: UT Austin, UW Allen School) |
| F | `FITTED` | Not produced by research runs | — | |

`U` stores `null` so a later refresh of the overall rate can't leave a stale copy
behind. The scorer reads the overall rate at run time.

**Purdue is the reminder that a published rate can be above the overall rate**
(63.4% CS vs 53.3% overall that year). Record what the school publishes. Don't
"correct" it toward your expectation.

**UC campuses.** The UC Information Center's "Freshman admission by discipline"
dashboard
(`https://www.universityofcalifornia.edu/about-us/information-center/freshman-admission-discipline`)
gives applicants and admits per campus per broad discipline. Pick Computer Science.
Read it in a browser (Chrome, read-only): its CSV export has no numbers. Label these
figures `DERIVED` (you divide admits by applicants), and say in `basis` that the
broad discipline is all of CIP 11, so it can include other computing majors. When a
campus publishes its own by-major profile (UCLA's First-Year Profile), prefer that
as P and keep the dashboard as a cross-check.

**Maryland, a worked E.** UMD publishes no CS applicant or admit counts. Basis: CS
is a Limited Enrollment Program with ~600 first-year seats; at an assumed 30-40%
yield that's ~1,500-2,000 admits; ~10,000 applicants list CS (one reported figure,
grown by the campus's application growth), so ~15% (plausible range 10-20%). Every
assumption is in the `basis`, so a reviewer can redo the arithmetic.

## Lessons learned (from the first full run)

- **The rate describes first-year admission.** A cap applied *after* enrollment
  doesn't change who gets in as a first-year: UNC's internal CS application after
  COMP 210, Michigan State's secondary College of Engineering admission, Penn
  State's entrance-to-major. Those are class U with `directAdmit: false`, and the
  real filter goes in `basis`.
- **Admitting by college is not the same as being more selective.** Check the
  college's own data before assuming a discount. Virginia Tech's College of
  Engineering ran about 1.03-1.09× the overall rate (University DataCommons); Purdue
  CS was above overall. Without data, `SCHOOL` alone is not a reason to estimate a
  lower rate.
- **An estimate must not replace a sourced or U value** unless the estimate is
  better-sourced. Penn State stayed U: the only lower figure was an unverifiable
  aggregator claim.
- **Ignore unsourced SEO/aggregator figures.** Secondary "CS admit %" numbers are
  often share-of-class or enrolled seats mistaken for admits (Maryland's forum "600
  admitted out of 9,000" mixed up 600 enrolled seats with admits). A secondary
  source counts toward C only when it is independent and says where its number came
  from.
- **Web search has a per-session budget (~200 searches).** Several helpers ran out
  mid-batch. For a full-catalog refresh, reuse the URLs in the current file's `url`
  fields and fetch official pages and data portals directly; search only for
  colleges whose page moved.

## Researching one college

1. **How does it admit first-years?** The admissions site's "choosing a major" or
   "apply to a college" page, plus the CS department's undergraduate admissions page.
   (A college researched by the main pass has its admission unit in the college file's `notes`.)
   Set `admissionUnit` and `directAdmit` (true when a first-year can be admitted
   straight into CS or its school/major code).
2. **No CS-specific selection at entry** (university admit, or a cap only after
   enrollment) → class U, `admitRate: null`. Stop here.
3. **Otherwise climb down the ladder:** the school's own counts (CS department news,
   enrollment roundups, direct-admit stats pages) → the UC dashboard for UC campuses →
   CDS / institutional-research factbooks and data portals (some break admissions out
   by college) → a published per-major rate on the admissions site or class profile →
   ≥3 independent secondary sources (College Transitions' direct-admit table is a good
   starting point) → a labeled estimate.
4. **Write the entry.** `basis` gives the counts or the argument, and the alternatives
   you rejected and why. `url` is the page the number came from (required for D and P).
   `year` is the admission year the rate describes (`"Fall 2025"`), not the cycle you
   researched in. Note doubts in `basis` (e.g. UCSB's dashboard CS rate looks high
   against older reports).
5. **Colleges that seem not to offer CS:** check the majors list before writing
   them off. Pepperdine and Santa Clara both grant CS bachelor's degrees but were
   missing CS program rows. The fix is their `majorsOffered`, not this file.

## Data file: `data/major-rates/<major>-<cycle>.json`

Schema: `scripts/major-rates/schema.ts` (`MajorRateFile`, `MajorRateEntry`), the
source of truth for field names. One file per major and cycle, e.g.
`cs-2026-27.json` (`cip "11.0701"`, `cycle "2026-27"`, `collectedAt` = run date),
entries sorted by name, one per catalog college:

```json
{ "ipedsUnitId": 236948, "name": "University of Washington-Seattle Campus",
  "admissionUnit": "MAJOR", "sourceClass": "DERIVED", "admitRate": 0.1473,
  "directAdmit": true,
  "basis": "Allen School Direct-to-Major published stats, 2026 cycle: … 773 admits / 5,249 applicants",
  "url": "https://www.cs.washington.edu/academics/ugrad/admissions/direct/", "year": "Fall 2026" }
```

The schema enforces: U ⇒ `admitRate` null; other classes ⇒ a rate in (0, 1];
`basis` on every entry; `url` for D and P; no duplicate `ipedsUnitId`. It can't
check that an E basis names its peers or argument, so check that yourself.

## Refreshing or adding colleges

1. **New colleges imported?** Research each one as above and add its entry to the
   current file. Without an entry it falls back to the overall rate (flagged), unless
   its `admissionUnit` is `UNIVERSITY`.
2. **New cycle?** Copy the file to the new cycle's name and re-check every non-U
   entry from its `url`; re-check U entries for newly added caps.
3. Validate, then dry-run the import (the dry run works with the DB down):
   ```bash
   npm run major-rates:import -- data/major-rates/cs-2026-27.json --dry-run
   ```
4. Review the output before importing:
   - **"replacing N already-researched value(s)"**: each line shows old → new. Every
     replacement should be newer or better-sourced. An E replacing a P/D/U is wrong;
     fix the entry.
   - **"⚠ no 11.0701 program row"**: the import never creates program rows. If the
     college really offers CS, fix its `majorsOffered` and re-import the college.
   - **"⚠ catalog colleges offering 11.0701 with no entry"**: research them.
5. Only when the user asks (it writes to their database):
   ```bash
   npm run major-rates:import -- data/major-rates/cs-2026-27.json
   ```
   It sets `admitRate`, `admitRateSourceClass` and `directAdmit` on each college's
   existing CS `CollegeProgram`, and `College.admissionUnit`. The seed's CS upsert is
   create-only, so these survive `npm run db:seed` and deploys.
