# Field guide: where each value comes from and how to convert it

All percentages are **fractions on 0..1** (59% → `0.59`). Dates are `YYYY-MM-DD`. Field names
are the `College` columns in `prisma/schema.prisma`. When a source is blank, ambiguous or says
"not reported", leave the field out and add a note. Never fill from memory.

Contents: [Basics](#basics-college-navigator) · [Majors](#majors-offered) · [Admit rate](#admit-rate-cds-c1) · [Admission unit](#admission-unit) ·
[Test scores & policy](#test-scores--policy-cds-c8c9) · [C7 weights](#admission-weights-cds-c7) ·
[Campus life](#campus-life-cds-e1-f1-i3) · [Merit aid](#merit-aid-cds-h2--h2a) ·
[Deadlines](#application-deadlines) · [Athletics](#athletics) · [US News rank](#us-news-rank)

## Basics (College Navigator)

`https://nces.ed.gov/collegenavigator/?id=<unitid>` is federal IPEDS data, consistent across colleges,
so prefer it over the college's own marketing pages for these fields. Source: `"college-navigator"`.

| Field | College Navigator item | Rule |
|---|---|---|
| `city`, `state` | Address | `state` = 2-letter code |
| `setting` | "Campus setting" | `City: *` → `URBAN`; `Suburb: *` and `Town: Fringe` → `SUBURBAN`; `Town: Distant/Remote` and `Rural: *` → `RURAL` |
| `religiousAffiliation` | "Religious affiliation" | Denomination text as shown (e.g. `"Roman Catholic"`); "Not applicable" → `null` (secular). Leave nulls out of `fields`. |
| `enrollmentUndergrad` | Undergraduate enrollment | Integer |
| `firstYearRetentionRate` | Retention: full-time, first-to-second year | 97% → `0.97` |
| `netPriceAvg` | Net price: average, most recent year | Integer dollars |
| `netPriceLt30k` … `netPriceGt110k` | Net price by family income, most recent year: $0–30,000 / 30,001–48,000 / 48,001–75,000 / 75,001–110,000 / 110,001+ | Integers. Publics report in-state students. |
| `actP25`, `actP75` | ACT Composite 25th/75th | Only if the CDS C9 has no ACT composite (the CDS is usually a year newer) |
| `latitude`, `longitude` | **Not on College Navigator.** Use the Wikipedia infobox coordinates (source `"web"`), decimal degrees, west = negative. | |

## Majors offered

`majorsOffered` lists which of Uniseek's controlled majors (`prisma/seed.ts` `MAJORS`) the college
awards a **bachelor's** in. Check College Navigator's "Programs/Majors" section (bachelor's column) or
the college's official majors list. Matches by meaning are fine; e.g. "Computer Science" or
"Computer and Information Sciences, General" → `11.0701`.

| CIP | Major | CIP | Major |
|---|---|---|---|
| `11.0701` | Computer Science | `51.3801` | Registered Nursing (BSN) |
| `26.0101` | Biology | `23.0101` | English |
| `52.0201` | Business Administration | `27.0101` | Mathematics |
| `14.1901` | Mechanical Engineering | `40.0501` | Chemistry |
| `14.1001` | Electrical Engineering | `09.0101` | Communication / Media Studies |
| `14.0901` | Computer Engineering | `52.0801` | Finance |
| `42.0101` | Psychology | `45.0601` | Economics |
| `45.1001` | Political Science | | |

An incomplete `majorsOffered` hides the college from every student who picks the missing
major, so check the college's full undergraduate majors list (CDS section J or the official
majors page), not just College Navigator's summary.

Only list majors you confirmed. A minor, concentration or track inside another degree doesn't count
(e.g. Finance as a concentration within a business BS → leave `52.0801` out and note it), and neither
does a graduate-only, certificate-only or transfer-only program (e.g. an accelerated BSN that only
admits students with 60 transfer credits).

## Admit rate (CDS C1)

| Field | Rule |
|---|---|
| `admitRate` | C1 "Total first-time, first-year students who were admitted" ÷ "…who applied". E.g. 2,948 / 36,791 = `0.0801`. Put both counts in the source `note`. The text dump sometimes splits a row (a stray small number next to the total), so check that the total ≈ the sum of the sex rows. No CDS → College Navigator's "percent admitted" (source `"college-navigator"`). |
| `admitRateProvenance` | `"VERIFIED"` whenever `admitRate` came from one of the above this session. |
| `inStateAdmitRate`, `outOfStateAdmitRate` | Only if C1 has the residency breakdown table (in-state / out-of-state / international applied & admitted). In-state = in-state admitted ÷ in-state applied; out-of-state likewise (exclude international). Otherwise leave out; never estimate. These matter most for publics: the scorer uses the student's pool (§15). Checks: the residency rows should sum to C1's totals. The table is often blank even in a current CDS. An "out-of-state" column that equals total minus in-state, with the international column empty, has international lumped in, so don't use it (Maryland: keep in-state only). Purdue's CDS since 2024-25 combines West Lafayette with the other campuses. Put the same CDS's overall C1 rate in the source `note`, so a reviewer can check the split and `admitRate` are from the same cycle. UC campuses: when C1 lacks the table, use the UC Information Center's admissions-by-residency figures for the same fall as `admitRate` (UCLA and Berkeley use Fall 2025). |

## Admission unit

`admissionUnit` says how the college admits first-years. It isn't a batch field: record it in
`notes` with its URL, and it is written through the CS admit-rate file
(`references/major-admit-rates.md`). The CDS has no item for it. C1 only splits applicants by sex
and residency, and the C7/C8 answers are university-wide. A CDS that breaks C1 out by college is
itself a sign of `SCHOOL`. Mostly it comes from the admissions site ("how to apply", "choosing a
major") and the CS department's undergraduate admissions page.

| Value | Wording that signals it |
|---|---|
| `UNIVERSITY` | "You apply to the university, not to a major"; "declare your major by the end of sophomore year"; undeclared / exploratory as the default; a major that is "competitive" or "capped" only after enrollment (internal application, entrance-to-major after N credits, secondary admission) |
| `SCHOOL` | "Apply to one of our N colleges/schools"; the application asks for a college (College of Engineering, Arts & Sciences); a "general engineering" or "first-year engineering" program that every engineering student starts in |
| `MAJOR` | "Direct admission to the major"; "you are admitted to your first-choice major" (or an alternate major); limited-enrollment or capped majors filled at first-year admission; per-major admit rates on the admissions site |

Decide from first-year entry only. Use `UNIVERSITY` only when **no** program selects at entry: the
scorer then treats the overall rate as the fact for every major. If most students are admitted to
the university but some programs (often CS, nursing, engineering) select at entry, record the
narrower unit (UW admits most first-years to the university, but the Allen School picks CS at
entry, so UW is `MAJOR`). If the wording is ambiguous or you can't find it, leave it out and say
so: `null` means unknown.

## Test scores & policy (CDS C8–C9)

| Field | Source | Rule |
|---|---|---|
| `satP25`, `satP75` | C9 "SAT Composite" 25th / 75th | If there is no composite row, use EBRW P25 + Math P25 (and likewise P75) from C9 or College Navigator, with source `"derived"` and a note saying it's an approximation (summing section percentiles overstates the spread). |
| `actP25`, `actP75` | C9 "ACT Composite" | |
| `testBlind` | C8 "Does your institution make use of SAT or ACT scores…?" | `No` → `true`. `Yes` → `false`. (Newer templates also have a C8A "Not considered even if submitted" box, which also means `true`.) Test-*optional* is **not** blind: `false`. |
| `superscores` | Admissions site testing-policy page (not in CDS) | `true` only if it explicitly superscores the SAT. Otherwise leave out. |

## Admission weights (CDS C7)

Map rows → fields, columns → numbers:

| C7 row | Field |
|---|---|
| Rigor of secondary school record | `c7Rigor` |
| Academic GPA | `c7Gpa` |
| Standardized test scores | `c7Test` |
| Class rank | `c7Rank` |
| Extracurricular activities | `c7Ec` |
| Volunteer work | `c7Service` |

Very Important **3** · Important **2** · Considered **1** · Not Considered **0**. A row with no mark at
all is a reporting gap, not "Not Considered": leave it out and note it.

The scorer only uses a C7 vector if **all six** are present (`lib/scoring/weights.ts`); otherwise
it falls back to an archetype. So try hard to get all six. For a PDF, read the grid from the **page
image** the helper rendered (a PNG), because text extraction misplaces the X marks. For an xlsx, read the
cells and check the header row's column order. Each row should have exactly one mark. If the image is still ambiguous, leave all six out and say why, since a half-right vector is worse
than the archetype fallback.

## Campus life (CDS E1, F1, I3)

| Field | Source | Rule |
|---|---|---|
| `housingOnCampusPct` | F1 "Percent who live in college-owned, -operated, or -affiliated housing" | Use the **Undergraduates** column, not first-years. 59% → `0.59`. |
| `greekLife` | F1 "% of men who join fraternities" / "% of women who join sororities" | Either > 0% → `true`. Both 0% → `false`. Blank → leave out. |
| `classSizeUnder20Pct` | I3 "Undergraduate Class Size", **CLASS SECTIONS** row (ignore SUB-SECTIONS) | `(2-9 + 10-19) / Total`. E.g. (281 + 416) / 1132 = `0.6157`. The layout dump often splits this table across lines; if the numbers don't add up to Total, read the page image. |
| `coOp` | Older CDS templates: E1 "Cooperative education programs". **The 2025-26 template dropped this line**, so otherwise use the college's own co-op/career pages. | `true` only for a formal co-op program (alternating paid full-time work terms, run by the college) open to students across the university or a large college within it; note the scope (e.g. "engineering only"). Internship offices don't count. How hard to look: one WebSearch for `"<college>" co-op program` plus the career-center or engineering page it leads to is enough. No formal co-op on those official pages → `false`, with the page you checked as the source. |
| `studyAbroadRate` | **Not in the CDS.** E1 only says whether study abroad exists. | Fill only from a published participation rate (school's study-abroad office or Open Doors), with the URL. Otherwise leave out and note "E1: study abroad offered". |

## Merit aid (CDS H2 / H2A)

`meritAidPct` = share of **first-time, full-time first-years** who got institutional non-need aid
(the app labels it "% freshmen with merit aid"):

```
meritAidPct = H2A row N (first-time full-time first-year column)
            ÷ H2  row A (first-time full-time first-year column)
```

Use the first-year column in **both** rows (not Full-time Undergrad). These tables are column-heavy and
the layout dump scrambles them, so read the page image.

- Row N is `0`: `meritAidPct` = `0`. Many elite schools give no merit aid, and that's real data.
- Row N is "N/A", blank, or the section is visibly broken (spreadsheet errors, wrong year): leave it
  out and note why. That's a reporting gap, not zero.
- This counts **institutional** non-need aid only. State programs (e.g. Georgia's HOPE/Zell) are
  excluded by the CDS definition. Keep that definition for consistency across colleges, and note it
  when a state program is significant.

## Application deadlines

Record dates for the **current admissions cycle**. Name the cycle by the fall the student applies in:
on or after Aug 1 of year Y, the cycle is `"Y-(Y+1)"` (e.g. Oct 2026 → `"2026-27"`, for fall 2027
entry); before Aug 1, it's `"(Y-1)-Y"`.

Years within a cycle `"Y-(Y+1)"`: Aug–Dec deadlines fall in Y, Jan–Jul deadlines in Y+1.
E.g. cycle 2026-27: ED Nov 1 → `2026-11-01`; RD Jan 5 → `2027-01-05`.

| Field | What it is |
|---|---|
| `edDeadline` | Early Decision (binding), first or only round. CDS C21 "First or only early decision plan closing date". |
| `ed2Deadline` | Early Decision II. CDS C21 "Other early decision plan closing date". |
| `eaDeadline` | Non-restrictive Early Action. CDS C22 closing date when "restrictive?" = No. |
| `reaDeadline` | Restrictive / Single-Choice Early Action. CDS C22 closing date when "restrictive?" = Yes. |
| `priorityDeadline` | A *separate* priority or scholarship deadline, common at publics (e.g. "apply by Nov 1 for scholarship consideration"). Leave out if the only "priority date" is actually the RD deadline. Some CDSs fill C14 "Priority Date" with the RD date. |
| `rdDeadline` | Regular Decision / final first-year deadline. |
| `rollingAdmission` | `true` if decisions are released on a rolling basis (CDS C16 "rolling basis" or site says so), else `false`. |
| `deadlinesSourceUrl` | The page you read the dates from. |
| `deadlinesCycle` | As above. |

**Source priority:** the admissions website's first-year deadlines page for the current cycle.
CDS C21/C22 are a cross-check and belong to the CDS's own cycle: a "2025-26" CDS reports policy
for students applying for fall 2026, i.e. cycle `"2025-26"`. If the admissions site hasn't posted
the current cycle yet, record the latest dates you *can* source, set `deadlinesCycle` to **their**
cycle, and note it. Never shift dates forward a year on the assumption they'll repeat.

Plans the college doesn't offer: leave the field out (null). Don't put RD's date in `eaDeadline`.

**Restricted plans** (open only to some applicants, e.g. Wake Forest's EA for first-generation
students only, or an ED round only for recruited athletes): leave the field out and record the plan,
its date and who's eligible in `notes`. The app shows these dates to every student, so a restricted
plan stored as a general deadline misleads everyone it doesn't apply to.

**Pages without a year** ("Nov. 1", "Jan. 4"): you may assign the current cycle's years if the page
is clearly live for the current cycle (it mentions the class entering fall Y+1, the application
opened this August, or the dates match the current CDS). Say so in `notes`. If you can't tell which
cycle a page describes, leave the dates out.

## Athletics

From the athletics site or Wikipedia infobox: NCAA division, football subdivision, primary conference.
Follow the seed's string formats:

- `ncaaDivision`: `"NCAA D1 FBS"`, `"NCAA D1 FCS"`, `"NCAA D1"` (no football), `"NCAA D2"`, `"NCAA D3"`, `"NAIA"`
- `conference`: the primary/all-sports conference (e.g. `"Big Ten"`, `"Ivy League"`, `"UAA"`). For
  football-only affiliations that differ, use the all-sports one.

`athleticsTier` (§4.3), derived from those two:

| Tier | Rule |
|---|---|
| `D1_FBS_POWER` | FBS football in the ACC, Big Ten, Big 12 or SEC (current alignment), or Notre Dame |
| `D1_FBS_OTHER` | Any other FBS program (American, C-USA, MAC, Mountain West, Sun Belt, Pac-12, independents) |
| `D1_FCS` | D1 with FCS football (Ivy, Patriot, CAA, Big Sky, MVFC, …) |
| `D1_NO_FOOTBALL` | D1 without a football program (e.g. Marquette, Gonzaga, Creighton) |
| `D2` / `D3` | NCAA Division II / III |
| `NAIA_OR_NONE` | NAIA, NJCAA or no intercollegiate athletics |

Use current conference membership (realignment happens every year), and note it if a move is
announced but not yet effective.

## US News rank

The scorer **requires** `usNewsRank` (with `admitRate`). A college without one is never scored, so
this is a must-have, not a nice-to-have.

| Field | Rule |
|---|---|
| `usNewsRank` | The college's rank in the **current edition** of US News Best Colleges (the 2027 edition came out in Sept 2026; check for a newer one). Use the college's own usnews.com profile page. usnews.com usually blocks scripted fetches, so expect to need Claude in Chrome (see SKILL.md "When a site blocks…"). Ties ("#20 (tie)") → `20`. |
| `usNewsRankProvenance` | `"VERIFIED"`: read from usnews.com this session. `"APPROX"`: from a reputable secondary source that quotes the current edition (a news article listing the ranks, the college's own press release), because those can lag or misquote. Never compute a rank (e.g. last year's rank minus "climbed 31 spots"); if all you have is arithmetic, leave it out. |

**Getting it from usnews.com** (what worked in practice):
- Profile URLs have unpredictable slugs (`rice-3604`, `tulane-university-of-louisiana-2029`), so find
  the page with WebSearch restricted to `usnews.com`. Use search snippets only to find the URL;
  read the rank on the page itself.
- WebFetch on usnews.com usually hangs until it times out, so go straight to Chrome.
- In Chrome, `get_page_text` tends to grab the reviews section and miss the rank header. Read the
  header from a screenshot instead (zoom if needed), or use `find` for "#" + "in National…".
- A sign-in panel pops up on profile pages. Ignore it; never sign in.

**Say which list it's from.** US News ranks colleges on separate lists that aren't comparable:
National Universities, National Liberal Arts Colleges, and the Regional lists. Williams at #1 on
National Liberal Arts is not "better than" Harvard at #3 on National Universities. Put the list and
edition in the source `note`, e.g. `"2027 National Liberal Arts Colleges #1"`, so the app can tell
them apart later. Use the list on the college's own US News profile.

Record the list in `usNewsRankList` as well as in the source note:
`"NATIONAL_UNIVERSITIES"` or `"NATIONAL_LIBERAL_ARTS"`. Regional lists aren't
supported; leave `usNewsRank` out for regionally ranked colleges and note it.

**Ranges and unranked.** Some colleges are shown with a rank range (e.g. "#300-391") or as
"Unranked". Leave `usNewsRank` out, record what the page shows in `notes`, and call it out in the
review: that college won't be scored until someone assigns a rank by hand.

The import treats `usNewsRank` as protected: a seeded value is kept unless the user asks for
`--overwrite-protected`. So a newer edition's rank won't replace a seeded one silently; mention
the difference in the review.

