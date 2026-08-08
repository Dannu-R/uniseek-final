# Uniseek — Student Preference Procedures

**Beta version.** Covers the student half of the recommendation: what the student is asked, how their answers become numbers, and how those numbers change the final score.

The admissions half (`academic_strength`, `program_quality`, `ambition`, `match_score`) is specified separately. This document consumes `match_score` as an input and produces the final ranking.

---

## 1. Overview

The student half runs in two stages.

| Stage | What it does | Effect |
|---|---|---|
| Hard filters | Remove colleges the student has ruled out | school is gone from the list |
| Soft factors | Score how well each surviving college matches | multiplies the match score |

```
final_score = match_score × (0.5 + 0.5 × preference_fit)
```

A college with perfect preference fit keeps its full match score. A college with the worst possible fit is halved. Nothing in between changes the ordering of two colleges more than 2× apart in match score.

---

## 2. Hard filters

Five filters. **All are AND** — a college must pass every one that the student set.

### 2.1 The filters

| Filter | Student input | College field | Passes if |
|---|---|---|---|
| `major_offered` | (already collected) | Scorecard CIP codes | college confers a degree in that CIP |
| `net_price` | max annual budget (required)<br>family income band (optional) | Scorecard net price by income band | net price ≤ budget |
| `distance` | home ZIP + max distance | IPEDS latitude/longitude | great-circle miles ≤ max |
| `in_state` | on / off | IPEDS state | college is in the home state |
| `religious_affiliation` | require / exclude / no preference | IPEDS affiliation | matches the choice |

### 2.2 Notes on individual filters

**`major_offered`** runs automatically before the student sees any questions. It is not something they are asked.

**`net_price`** takes two separate inputs:

- **Budget** is required. This is the ceiling — the most the family will pay per year.
- **Income band** is optional. It selects which Scorecard column to read, because published net price varies by income bracket and the spread within one college can exceed $50,000.

| Income given? | Compared against |
|---|---|
| yes | net price for that bracket |
| no | college-wide average net price |

Known limitation: Scorecard net price covers students who received federal aid, and the top bracket is $110,000+. For high-income families the figure reads optimistically, so the filter will keep a few colleges that would actually cost more.

**`in_state`** applies to **all** colleges in the home state, not only publics. Residency changes tuition only at publics, but cost is already handled by `net_price`, so the only job left for this filter is geography — and geography applies to private colleges equally.

**`in_state` and `distance` stack.** If the student sets both, a college must satisfy both. An out-of-state college that is *nearer* than an in-state one is still removed. Every in-state college must still clear the distance limit.

### 2.3 Missing data

**If a college has no published value for a filter, the college stays in the list and its confidence is lowered.** Never drop a college for a data gap.

| Filter | Coverage | Gap risk |
|---|---|---|
| `net_price` | good; gaps at small and new colleges | real |
| `major_offered` | CIP codes; gaps on new programs | real |
| `distance` | universal | none |
| `in_state` | universal | none |
| `religious_affiliation` | good; "none" and "unreported" can look alike | mild |

The consequence is that a student with a $20,000 budget may see colleges that cost far more, marked low-confidence. **The confidence flag must be visible in the interface**, or the result reads as a straight recommendation.

### 2.4 Zero results

If the filters remove every college, **report the empty list and name the filter responsible. Never relax a filter automatically** — silently loosening a constraint returns colleges the student said they did not want.

Diagnosis:

1. Run each filter alone against the full set.
2. Count survivors for each.
3. The filter with the fewest survivors is the culprit.
4. Report it, with the threshold that would restore results.

Example output: *"No colleges matched. Your budget alone rules out 94% of your in-state options. Raising it to $22,000 would return 6 colleges."*

---

## 3. Soft factors

Eleven factors. Each has:

- a **weight** from 0 to 4, set by the student — how much they care
- a **direction**, where applicable — what value they are looking for

Weight 0 removes the factor entirely.

### 3.1 The factor list

| Factor | Type | Direction |
|---|---|---|
| `school_size` | directional | large ↔ small |
| `class_size` | directional | small ↔ large |
| `greek_life` | directional | want ↔ avoid |
| `housing` | directional | residential ↔ commuter |
| `athletics` | directional | big-time ↔ not |
| `party_scene` | directional | want ↔ avoid |
| `setting` | categorical | pick urban / suburban / rural |
| `academic_support` | magnitude only | — |
| `merit_aid` | magnitude only | — |
| `study_abroad` | magnitude only | — |
| `co_op` | magnitude only | — |

The four magnitude-only factors have no meaningful inverse — nobody asks for worse academic support or less merit aid — so they are weight-only questions.

### 3.2 How direction becomes a target

**Direction names the value the student is aiming for, not a flip.** The five-point answer maps to a target on the same 0–1 scale as the college value:

| Student answer | `target` |
|---|---|
| strongly prefer the low end | 0.00 |
| prefer the low end | 0.25 |
| no strong feeling | 0.50 |
| prefer the high end | 0.75 |
| strongly prefer the high end | 1.00 |

This lets "I want a medium-sized college" work — it is simply target 0.50. A design that flipped the college's value could not express that.

### 3.3 Scoring a single factor

```
factor_score = 1 − |college_value − target|
```

Both terms are on 0–1, so `factor_score` is on 0–1. The relationship is **linear**: a college half the scale away from the target scores 0.5.

| Factor type | Rule |
|---|---|
| directional | formula above, `target` from the five-point answer |
| magnitude only | `target` = 1.00, so `factor_score` = `college_value` |
| categorical (`setting`) | 1 if the college matches any selected option, else 0 |

`setting` is multi-select — urban, suburban, and rural are choices rather than points on a line, and a student may legitimately want two of the three.

### 3.4 Combining factors

```
preference_fit = Σ(weight × factor_score) / Σ(weight)
```

Self-normalizing: the 0–4 weights divide out, so a student who cares about three things gets a clean average over those three.

**If every weight is 0**, `preference_fit` is undefined. Set it to 1.00 so the score falls back to pure `match_score`.

### 3.5 Applying to the final score

```
final_score = match_score × (0.5 + 0.5 × preference_fit)
```

| `preference_fit` | multiplier |
|---|---|
| 1.00 | ×1.000 |
| 0.75 | ×0.875 |
| 0.50 | ×0.750 |
| 0.00 | ×0.500 |

Preference **multiplies** rather than adds. Adding would put preference on equal footing with admission odds, letting a college the student has a 3% chance at win on atmosphere alone. Multiplying means preference can only reorder colleges that already survived the odds-and-quality trade.

Practical effect: **preference can only flip two colleges whose match scores are within 2× of each other.** Loud enough to reorder a shortlist, not loud enough to resurrect a bad match.

---

## 4. College-side values

Every factor needs a `college_value` on 0–1. **Absolute anchors, not percentiles** — 0.5 should mean a real quantity, not "median college in the current dataset."

### 4.1 Self-anchoring

Already bounded proportions. The published percentage *is* the value, so there is no endpoint to choose and nothing to invent.

| Factor | Source | Value |
|---|---|---|
| `class_size` | CDS I-3 | % of classes under 20 |
| `housing` | CDS F1 | % of students living on campus |
| `merit_aid` | CDS H2A | % of non-need freshmen receiving merit awards |
| `academic_support` | IPEDS | first-year retention rate |

### 4.2 `school_size`

Carnegie size classification — a real published standard, not chosen endpoints. **Interpolate within each band** so a 6,000-student college does not score identically to a 9,500-student one.

| Carnegie band | Enrollment | `college_value` |
|---|---|---|
| very small | under 1,000 | 0.00 |
| small | 1,000–2,999 | 0.25 |
| medium | 3,000–9,999 | 0.50 |
| large | 10,000–19,999 | 0.75 |
| very large | 20,000+ | 1.00 |

### 4.3 `athletics`

NCAA division and conference. The **ordering is published fact**; the **even spacing is an approximation** accepted for beta.

| Tier | `college_value` |
|---|---|
| D1 FBS, power conference | 1.00 |
| D1 FBS, other | 0.83 |
| D1 FCS | 0.67 |
| D1, no football | 0.50 |
| D2 | 0.33 |
| D3 | 0.17 |
| NAIA or no athletics | 0.00 |

Read conference membership from live data — it has shifted substantially in recent years and must not be hardcoded.

Upgrade path: NCAA publishes average home football attendance, which would let the spacing come from data instead of assumption. Attendance does not exist for non-football colleges, so those tiers would still need ordinal placement.

### 4.4 Binary factors

| Factor | `college_value` |
|---|---|
| `greek_life` | 1 if the college has Greek life, else 0 |
| `co_op` | 1 if the college has a co-op program, else 0 |

`greek_life` is binary because published participation percentages have no defensible ceiling to anchor against.

Known limitation: most four-year colleges have Greek life, so "want Greek life" scores near 1 almost everywhere and separates very little. The factor does real work only in the **avoid** direction, where it correctly isolates colleges with none.

`co_op` does not have this problem — genuine co-op programs are rare enough that yes/no separates well.

### 4.5 `study_abroad`

| Data available | `college_value` | Confidence |
|---|---|---|
| CDS participation rate published | the rate | normal |
| not published | 1 if a program exists, else 0 | lowered |

Rate is preferred because participation genuinely ranges from a few percent to over half. The binary fallback is near-universally 1, which flattens `preference_fit` — a factor that scores 1 everywhere pulls every college's fit toward 1 equally and compresses the gaps that matter.

### 4.6 `setting`

IPEDS locale code, collapsed to three categories: **urban / suburban / rural**. No normalization — the student's multi-select is matched directly.

### 4.7 `party_scene` — constructed

No published source exists. Built from three fields already being collected:

```
party_scene = (greek_life + housing + athletics) / 3
```

**The three inputs are real. The equal weighting is a guess** — there is no study establishing that Greek life matters as much as residential density. This is the same status as the athletics tier spacing: accepted for beta, flagged as constructed rather than measured.

**Test before trusting it.** Run the index across the first real dataset and check whether the top of the list looks like colleges you would call party schools. The failure mode to watch for is that all three inputs correlate with "large residential state university," so the index may simply be re-measuring that.

---

## 5. Known limitations

| Item | Issue |
|---|---|
| `party_scene` weighting | equal weights are assumed, not derived |
| `athletics` spacing | ordering is real, spacing is assumed |
| `academic_support` | retention correlates with selectivity — measures who was admitted as much as how they were supported |
| `greek_life` | near-universal, so it only discriminates in the avoid direction |
| `study_abroad` fallback | binary fallback is near-universally 1 |
| `net_price` at high income | Scorecard's top bracket is $110,000+ and covers federal-aid recipients only |
| Confidence score | referenced throughout but not yet built |

---

## 6. Factors considered and dropped

Kept here so the reasoning is not relitigated.

| Factor | Reason |
|---|---|
| `program_strength` | duplicated `program_quality`, already inside `match_score` — would double-count |
| `vibe` | no defensible source of any kind |
| `diversity` | giving it a direction means asking students to prefer a less diverse campus |
| `safety` | Clery crime rates are unbounded with no published bands to anchor against |
| `political_climate` | only real source (FIRE survey) covers ~250 colleges and measures speech climate, not lean |
| `career_services` | no direct measure; earnings data is an outcome, not a service |
| `weekend_culture` | no source |
| `clubs` | organization counts are not in IPEDS or CDS; website figures are unstandardized and inflated |

---

## 7. Full pipeline

```
1. Run major_offered against all colleges
2. Apply the four remaining hard filters (AND)
     → missing data: keep, lower confidence
     → zero survivors: report the blocking filter, stop
3. For each surviving college:
     a. compute college_value for each of the 11 soft factors
     b. factor_score = 1 − |college_value − target|
     c. preference_fit = Σ(weight × factor_score) / Σ(weight)
     d. final_score = match_score × (0.5 + 0.5 × preference_fit)
4. Rank by final_score
```
