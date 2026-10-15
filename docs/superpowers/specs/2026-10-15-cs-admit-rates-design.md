# CS admit rates + admission unit — design

Date: 2026-10-15 · Status: approved in conversation

## Problem

§6a: when a student names a major, the **major's** admit rate replaces the college's
overall rate in the tier lookup and `college_bar`. Only 12 of 131 colleges have a
researched CS rate; the other 119 silently fall back to the overall rate. For
capped programs that badly overstates odds — a real CS profile got UW (42% overall)
and Maryland (45%) as safeties and Berkeley (11.5% overall) as a match, though their
CS admits run far lower. §6a forbids defaulting to the overall rate.

## Decisions (made with the user)

| # | Question | Decision |
|---|---|---|
| D1 | Scope | CS rates for all 131 colleges **plus** each college's admission unit (university / school-within / major) |
| D2 | No published or derivable rate | Record a labeled estimate (class E) with its stated basis |
| D3 | Residency, other majors' rates | Out of scope (separate work); other majors benefit only via the university-admit rule |

## Source classes (§6a, `MajorRateSourceClass`)

Research works down this ladder and records the rung:

| class | enum | meaning | stored `admitRate` |
|---|---|---|---|
| U | UNIVERSITY | Admits to the university (or a broad college) — CS rate **is** the overall rate | `null` (scorer uses the overall rate) |
| D | DERIVED | Arithmetic from the school's own published counts | the rate |
| P | PUBLISHED | Published per-major rate | the rate |
| C | CONSENSUS | ≥3 independent secondary sources agree | the rate |
| E | ESTIMATE | From named peers or a stated structural argument; `basis` must say which | the rate |
| F | FITTED | Not produced by this run | — |

`U` stores `null` so a later refresh of the overall rate can't leave a stale copy.
(The 7 seeded U rows hold the overall value; they score identically.)

## Admission unit (new `College.admissionUnit`)

`enum AdmissionUnit { UNIVERSITY, SCHOOL, MAJOR }`
- **UNIVERSITY** — admits to the university as a whole; majors declared later.
- **SCHOOL** — admits into a school/college within it (e.g. Engineering, Arts & Sciences).
- **MAJOR** — admits directly to the major (e.g. UW's Allen School direct admit).
Recorded per college; `null` = unknown.

## Scoring rule (`effectiveAdmitRate`, lib/scoring/score.ts)

Major named and the college offers it (has the program row):
1. Program `admitRate` set → use it; label = its source class (`P`, `D`, …).
2. Else program class is `UNIVERSITY` **or** `College.admissionUnit = UNIVERSITY` →
   overall rate, label `U`, **no** "unresearched" flag (it's a fact, §6a).
3. Else → overall rate, label `fallback`, keep the existing low-confidence flag.

No major → overall rate, no label. Every major run pushes
`effective admit rate <rate> (<label>)` onto `flags`.

## Data file

`data/major-rates/<major>-<cycle>.json`, e.g. `cs-2026-27.json` (committed):
```json
{ "cip": "11.0701", "cycle": "2026-27", "collectedAt": "2026-10-15",
  "entries": [ { "ipedsUnitId": 236948, "name": "University of Washington-Seattle Campus",
    "admissionUnit": "MAJOR", "sourceClass": "PUBLISHED", "admitRate": 0.05,
    "directAdmit": true, "basis": "Allen School: N admits / M applicants, Fall 2025",
    "url": "https://…", "year": "Fall 2025" } ] }
```
Validation (zod): `sourceClass` ∈ U/D/P/C/E; `U` ⇒ `admitRate` null; non-U ⇒
`admitRate` in (0, 1]; every entry has `basis`; D/P need `url`; E's basis must
name peers or the argument; one entry per catalog college.

## `npm run major-rates:import`

- Validates the file; `--dry-run` prints the plan.
- Sets `admitRate`, `admitRateSourceClass`, `directAdmit` on each college's existing
  CS `CollegeProgram`; sets `College.admissionUnit`.
- Never creates program rows (college not offering CS → reported).
- Reports every change to an already-researched value (e.g. the 12 seeded rates).

## Seed fix

`prisma/seed.ts` re-runs on every production start and still rewrites the CS row's
`admitRate`, `admitRateSourceClass` and `directAdmit`. Make the CS upsert
create-only (`update: {}`) so researched values survive deploys.

## Research run

Waves of helpers, ~4 colleges each, like the 100-college run. Source priority:
the college's own published counts → UC Information Center (UC campuses) → CDS /
institutional factbooks → College Transitions' direct-admit table → ≥3 consensus
sources → labeled estimate. Per college: admission unit, CS rate + class, direct
admit, basis, URL, year. Chrome read-only fallback. Reviews spot-check the
high-impact colleges (UW, Maryland, Berkeley, UCLA, UNC, UT Austin, the other UCs).

## Out of scope

Residency (§15). Individually researched rates for engineering, nursing, business.
The fitted rule (class F).
