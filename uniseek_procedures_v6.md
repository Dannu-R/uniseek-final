# Uniseek — Scoring Procedures

Reference spec as of 2026-08-03 (**sixth pass**). Supersedes `uniseek_procedures_v5.md`.

Covers every settled factor: **curriculum rigor**, **unweighted GPA**, **grade
trend**, **test scores**, **class rank**, the **extracurricular block**, and the
**recommendation layer** (admission odds, program quality, match score).

> **Changed in this revision (2026-08-03, sixth pass).** One decision that
> changes the recommendation layer, one collection standard that changes how the
> major layer gets its numbers, and the first researched per-major dataset.
>
> | # | change | where |
> |---|---|---|
> | 1 | **DECIDED: `program_quality` is major-specific.** When a student names a major, quality reads the PROGRAM's published rank. Institutional rank is for general admissions only. | §10b |
> | 2 | **DECIDED: the fitted CS rule is not an acceptable substitute for research.** Every college gets looked up individually; where nothing is published, produce a labelled estimate. Never apply one curve across a list. | §6a |
> | 3 | **NEW: the source-class system** (U / D / P / C / E / F) travels with every per-major figure. | §6a |
> | 4 | **NEW §18: the researched CS dataset** — per-college CS admit rates and CS program ranks, with provenance and a measured sensitivity check. | §18 |
> | 5 | **MEASURED: `major_rate ≈ 0.307·rate^0.735` fails above ~15% admit** and is structurally incapable of a ratio above 1. Demoted to last resort. | §6a |
> | 6 | **RETRACTED: the "admit rate measures competition, not standard" objection.** Odds owe ordering; the model gets it right. Do not re-open. | §13e |
> | 7 | §17's listed ambitions do not reproduce from §10's own formula. Flagged, unresolved. | §17 |
>
> **Everything in §1–§5, §7–§9 and §11–§16 is unchanged from the fifth pass.**
>
> **Shipping status.** This version is known to be rough — 18 of 30 CS admit
> rates are unresearched and 19 of 30 CS ranks are estimates. It ships anyway so
> that work can move to the rest of Uniseek. The parked items are listed in §14.

---

## 0. Shape of the whole thing

```
                    ┌─ rigor ──────────► × gpa multiplier ─► tier piecewise ─┐
                    ├─ GPA (trend-adj) ──────────────────► tier piecewise ─┤
student inputs ─────┼─ test scores ──────────────────────► college C9 curve├─► weighted sum
                    ├─ class rank ───────────────────────► universal curve │      │
                    │                                                      │      │  academic_strength
                    ├─ activities ─────► tier sum × field prep ────────────┤      │   (a FIT score, 0..1)
                    └─ volunteer hrs ──► service curve ────────────────────┘      │
                                                                                  ├─► admission_odds
                                              program_quality(rank) ──────────────┤   = σ(k·(strength − bar(rate)))
                                                (continuous)                      └──► match_score
                                                                                      = (1−amb(student))·odds + amb(student)·quality
```

`academic_strength` is **how well the student fits the college's academic bar**, on
0..1. It is not the recommendation and not a probability. It feeds an
**admission-odds** logistic (§10a) whose reference point is absolute, and the
recommendation blends those odds with a **continuous** program-quality axis (§10b)
using a weight that now **depends on the student** (§10).

### Student inputs required

| input | used by |
|---|---|
| unweighted GPA (cumulative) | GPA, **rigor multiplier**, **ambition ramp** |
| year GPAs for grades 10, 11, 12 | grade trend |
| advanced courses taken | rigor |
| advanced courses offered by the school | rigor (and the **absent** rule) |
| SAT/ACT: best superscore and best single-sitting score | test scores |
| class rank and class size (or "school doesn't rank") | class rank |
| ≤10 activities, free text ≤130 words each | EC tier sum |
| hours/week and years per activity | EC tier assignment |
| hours/year of volunteer service | community service |
| intended major (optional) | tier offset, field prep |
| **home state — NEW, §15** | **residency-adjusted admit rate** |

### College inputs required

| input | source | used by |
|---|---|---|
| admit rate → tier | CDS C1/C2 | rigor, GPA, **admission-odds bar** |
| SAT/ACT 25th/75th percentiles | CDS C9 | test scores (**P50 is a midpoint — CDS does not publish it**) |
| C7 rating per factor | CDS C7 | all weights |
| test-blind flag | CDS C8A (5th option) | test scores |
| superscore policy | **not published in CDS** | test scores |
| institutional rank | US News (or pooled sources) | program_quality |
| per-major admit rate, where published | school admissions pages | tier offset (§6) |
| **in-state / out-of-state admit rate, where published** | **school profile pages** | **§15** |

---

## 1. The tier system

**Six** tiers keyed on published admit rate. Applies to rigor and GPA only.

| tier | admit rate | floors | example schools |
|---|---|---|---|
| 1 | ≥ 65% | 0.724 / 0.591 / 0.435 / 0.225 | ASU, Michigan State, Iowa |
| 2 | 43–65% | 0.784 / 0.660 / 0.517 / 0.341 | Purdue, Penn State, Ohio State |
| 3 | 28–43% | 0.841 / 0.724 / 0.591 / 0.435 | UIUC, Georgia, Rochester |
| 4 | 18–28% | 0.896 / 0.784 / 0.660 / 0.517 | UT Austin, Florida, Virginia |
| 5 | 12–18% | 0.949 / 0.841 / 0.724 / 0.591 | Michigan, UNC, Emory |
| 6 | < 12% | **0.955 / 0.875 / 0.775 / 0.660** | Harvard, MIT, CMU |

### The floor table is a RUNG LADDER

Tiers 1–5 are **four consecutive rungs of one shared ladder**, stepped by exactly
one rung per tier:

```
rungs:  0.225  0.341  0.435  0.517  0.591  0.660  0.724  0.784  0.841  0.896  0.949
          0      1      2      3      4      5      6      7      8      9     10

tier 1 = rungs 0, 2, 4, 6        tier 4 = rungs 3, 5, 7, 9
tier 2 = rungs 1, 3, 5, 7        tier 5 = rungs 4, 6, 8, 10
tier 3 = rungs 2, 4, 6, 8        tier 6 = C-prime (deliberately off-ladder)
```

The competing interpolated table accepted on 2026-07-31 remains **superseded**. Use
the rung table and nothing else.

### Tier 6 is the C-prime set

Slot widths: `.660 / .115 / .100 / .080 / .045`. C-prime exists because tier 6's
old top floor of 0.990 collided exactly with `ceiling_headroom = 0.99`.

**Standing rule for any future floor change: check strict dominance against both
neighbouring tiers before adopting.** C-prime was verified across 101 sampled
volumes; tier 6 never exceeds tier 5.

The tier moves only the four *interior* floors; **0 and 1 are shared by all six
tiers**, which is why the piecewise alone can never separate a student whose raw
input pins at either end (§12).

```python
def piecewise(value, floors):
    edges = [0.0] + sorted(floors) + [1.0]
    for i in range(5):
        if value < edges[i+1] or i == 4:
            frac = (value - edges[i]) / (edges[i+1] - edges[i])
            return 0.2 * i + clip(frac, 0, 1) * 0.2
```

---

## 2. Curriculum rigor

Volume blends the school-relative ratio with an absolute course count, then is
**scaled by a GPA multiplier**.

### 2a. Volume

```python
ABS_RIGOR_REF = 10.0    # absolute count that reads as a strong load
ABS_WEIGHT    = 0.40    # how much the absolute count offsets the pure ratio
SMALL_CATALOG = 6       # below this many offered, rigor is low-confidence

def rigor_volume(taken, offered):
    if offered == 0:
        return None                        # ABSENT — drop the factor, renormalise
    eff_ceiling = min(offered, 14)
    ratio    = clip(taken / eff_ceiling, 0, 1) ** 0.6
    abs_comp = clip(taken / ABS_RIGOR_REF, 0, 1) ** 0.6
    vol = ratio ** (1 - ABS_WEIGHT) * abs_comp ** ABS_WEIGHT   # geometric blend
    if offered > 14:
        vol *= 0.99
    return vol
```

`offered == 0` is **absent**, not a perfect ratio: the factor is dropped, the
remaining weights renormalise (§9), and the result is flagged low-confidence.
`offered < 6` is present but low-confidence.

**Known step at `offered == taken`, measured this pass.** 13-of-13 returns 1.000,
13-of-14 returns 0.9737, 13-of-15 returns 0.9639 — one unused offering costs 0.026.
Above 14 offered the catalog stops mattering entirely, so 14-of-15 and 14-of-18 are
byte-identical at 0.990. **Judged acceptable and not fixed:** the step only reaches
1.000 when `taken ≥ 10`, where the absolute component is already saturated (5-of-5
returns 0.847, not 1.0).

### 2b. The GPA multiplier — 8 TIERS, ADOPTED THIS PASS

Taking a class is not the same as doing well in it. The multiplier scales the
volume before the piecewise, so it reads as "your effective rigor is 86% of what
you took" rather than as a haircut on the finished sub-score.

```python
def rigor_gpa_multiplier(adjusted_gpa):
    if adjusted_gpa >= 3.7000: return 1.0000
    if adjusted_gpa >= 3.6429: return 0.9571
    if adjusted_gpa >= 3.5857: return 0.9143
    if adjusted_gpa >= 3.5286: return 0.8714
    if adjusted_gpa >= 3.4714: return 0.8286
    if adjusted_gpa >= 3.4143: return 0.7857
    if adjusted_gpa >= 3.3571: return 0.7429
    return 0.7000

effective_volume = rigor_volume(taken, offered) * rigor_gpa_multiplier(adjusted_gpa)
rigor_score      = piecewise(effective_volume, tier_floors)
```

**Construction.** Both endpoints stay where they were set by hand — 1.00 at GPA
3.70, 0.70 at GPA 3.30. The eight levels are evenly spaced across that range: step
`0.30 / 7 = 0.0429`, band width `0.40 / 7 = 0.0571`. Each band takes the value at
its **lower** edge, so the staircase sits under the straight line between the two
anchors and never overshoots it.

**Why 8 and not 3.** The 3-tier version had a cliff at GPA 3.70 worth up to +0.169
of strength per 0.01 of GPA (v4 quoted +0.216 from an earlier sweep; the ratio
agrees, the absolute does not, and the discrepancy is unexplained). The 8-tier
version cuts that to **+0.0706**, a 2.4× reduction, at identical band agreement —
same 59/64, same miss list.

**Continuous was considered and rejected**, because tiers rather than a curve is a
standing design decision. A continuous ramp would drive the cliff to zero and
remains available if that decision is revisited; it is a two-line change.

Uses the **trend-adjusted** GPA (§4), so a senior slump costs twice: once directly
and once through this multiplier.

For reference, the GPA at which each tier's floors sit (`gpa = 2 + 2·floor`):

| tier | floor GPAs |
|---|---|
| 1 | 2.45 / 2.87 / 3.18 / 3.45 |
| 2 | 2.68 / 3.03 / 3.32 / 3.57 |
| 3 | 2.87 / 3.18 / 3.45 / 3.68 |
| 4 | 3.03 / 3.32 / 3.57 / 3.79 |
| 5 | 3.18 / 3.45 / 3.68 / 3.90 |
| 6 | 3.32 / 3.55 / 3.75 / 3.91 |

**Aligning the multiplier cuts with these rungs was tested and is a no-op.** The
lever is step height, not alignment.

### 2c. Parameters

| parameter | value | basis |
|---|---|---|
| `abs_rigor_ref` | 10 | chosen |
| `abs_weight` | 0.40 | chosen — mixing ratio, 60% school-relative / 40% absolute |
| `small_catalog` | 6 | chosen |
| `schedule_ceiling` | 14 | chosen |
| `curve_exponent` | 0.6 | chosen — front-loads, ~3× early-to-late weighting |
| `ceiling_headroom` | 0.99 | display choice |
| **multiplier** | **8 levels, 1.00 → 0.70 in 0.0429 steps across GPA 3.30–3.70** | **chosen** |

On the exponents: **below 1** front-loads (`curve_exponent` 0.6, the EC base 0.4);
**above 1** back-loads (test scores below P25, exponent 1.5); exactly 1 is no curve.

**Scope.** AP courses only; honors/IB/dual-enrolment deferred. The formula never
references APs — only the variable names do.

---

## 3. Unweighted GPA

```python
def gpa_x(unweighted_gpa):
    return clip((unweighted_gpa - 2.00) / 2.00, 0, 1)
gpa_score = piecewise(gpa_x(adjusted_gpa), tier_floors)
```

3.00 → 0.50, 3.50 → 0.75, 4.00 → 1.00 on the raw axis; the tier piecewise then
places it.

**The double count is accepted and known.** GPA enters twice — directly here, and
as the multiplier on rigor (§2b). The effective GPA weight therefore exceeds
whatever §9 assigns. It matches how a reader actually treats a transcript, where
rigor is discounted by performance in it, but it means the §9 rigor/GPA split no
longer describes the true balance.

**Measured consequence, this pass:** rigor scores below GPA for every profile
tested, and the gap widens downward — +0.044 for a maxed student, +0.121 for a
3.40. A weak student is docked once through `gpa_x` and again through the
multiplier.

---

## 4. Grade trend

An adjustment to the GPA input, applied before tier scoring and before the rigor
multiplier.

```python
def trend_penalty_fires(g10, g11, g12):
    if not (g12 < g10 and g12 < g11): return False
    return (min(g10, g11) - g12) > 0.07 * g12

adjusted_gpa = unweighted_gpa - 0.075 if trend_penalty_fires(...) else unweighted_gpa
```

Ninth grade unused. Can only fire below a 3.738 senior GPA.

---

## 5. Test scores

Scored against the college's own C9 percentiles; max of the SAT and ACT scores;
zero-weight (drop + renormalise) when the student submits no score or the college
is test-blind.

```python
SAT_FLOOR, SAT_MAX, SAT_NATIONAL = 400, 1600, 1500

def test_score(value, p25, p50, p75):
    if value <= p25:
        return 0.60 * (clip((value - SAT_FLOOR) / (p25 - SAT_FLOOR), 0, 1) ** 1.5)
    points = [(p25, 0.60), (p50, 0.78), (p75, 0.90)]
    if p75 < SAT_NATIONAL:
        points.append((SAT_NATIONAL, 0.94))
    points.append((SAT_MAX, 1.00))
    return interpolate(value, points)
```

**P50 is not published.** CDS C9 gives 25th and 75th only. The midpoint is used and
must be labelled as an interpolation wherever a run is reported.

---

## 6. Major layer

Fires only when the student names a major. Two mechanics, one suspended.

### 6a. Tier offset — ACTIVE

The major's admit rate replaces the college's overall rate in **both** the tier
lookup (which sets the GPA and rigor floors) and `college_bar` (§10a). The
college × major pair acts as its own mini-college for everything downstream.

**Standing rule: deriving the offset is the model's job whether or not the data
exists.** Never default to 0 because no per-major rate is published. Estimate from
a fitted rule or published peers, apply it, and make the source class visible.

**Exception — offset is genuinely 0 where a college admits to the university
rather than to a major.** That is a factual, collectable flag, not a data gap.

**NEW EXCEPTION, added this pass — suppress the offset for audition- or
portfolio-gated majors.** Music performance, studio art, theatre, dance and
architecture select on a submission the model cannot see. Admit rate does not
describe the binding constraint, and applying the fitted rule to them produces
confident nonsense. This is the same family as the nursing pattern already
documented in §6b: programs that select on something other than the university's
own criteria.

#### The collection standard — NEW, and it overrides the fitted rules below

**A fitted curve applied across a whole college list is not acceptable output.**
Every college is researched individually. Where a per-major rate is published, use
it. Where it is not, work down this ladder and record which rung you landed on:

| class | meaning | example |
|---|---|---|
| **U** | The college admits to the university or to a broad college, not to the major. The offset is genuinely 0 and the major rate **is** the overall rate. This is a *fact*, not an estimate. | Harvard, MIT, Yale, Duke, Florida, Michigan, Penn State |
| **D** | Derived by arithmetic from the school's own published applicant and admit counts. | Georgia Tech: 1,547 admits ÷ 13,711 CS+CM applicants = **11.28%** |
| **P** | Published per-major admit rate. | UIUC CS 7.2%, Purdue CS 35.9% |
| **C** | Consensus across ≥3 independent secondary sources, no primary count located. | CMU SCS ≈5.2%, UT Austin CS ≈8.5% |
| **E** | Estimate from published peers or a stated structural argument. Must carry its basis. | see §18 |
| **F** | Fitted from a family rule. **Last resort only.** | — |

The class travels with the value into every downstream output. A list containing
any **F** value is provisional.

The **U** class is the highest-value cheap win: whether a college admits by major
is a published, collectable flag, and it resolves the rate exactly. The College
Transitions "Changing Your Major to Computer Science" table (updated Oct 2025)
carries a Direct Admit column covering most top CS programs.

#### Derived ratios in hand — DEMOTED TO CLASS F

Two independent fits exist, and **they run in opposite directions**:

| major family | rule | basis |
|---|---|---|
| **CS / competitive engineering** | `major_rate ≈ 0.307 · university_rate ** 0.735` | R² = 0.670 on 7 CS pairs; ratios ranged 0.20–0.78 |
| **general science (Biology and similar)** | `major_rate ≈ university_rate × 1.097` | UIUC LAS 41.5/36.6 = 1.134; Purdue Science 46.0/43.4 = 1.060 |

The CS exponent < 1 means competitive-major rates **compress** toward a 5–20% band.
The biology factor > 1 means a general-science college is **easier** than its
university. Neither generalises beyond its family — pick the family first.

**⚠ THE CS RULE IS BROKEN ABOVE ~15% ADMIT — measured this pass** against every
CS/university pair obtainable, including four newly sourced from the UC
Information Center (Fall 2025):

| pair | university | actual CS | predicted | error |
|---|---|---|---|---|
| UC Berkeley | 11.0% | 6.0% | 6.1% | +0.1 |
| CMU *(est)* | 11.1% | 5.0% | 6.1% | +1.1 |
| UCLA | 9.0% | 7.0% | 5.2% | −1.8 |
| UC Davis | 44.0% | 19.0% | 16.8% | −2.2 |
| UIUC | 36.6% | 7.2% | 14.7% | +7.5 |
| Purdue | 49.8% | 35.9% | 18.4% | −17.5 |
| UC Santa Barbara | 38.0% | 34.0% | 15.1% | −18.9 |
| **UC Santa Cruz** | **72.0%** | **79.0%** | **24.1%** | **−54.9** |

It is accurate below ~15% and falls apart above it. **UC Santa Cruz is fatal: its
CS ratio is 1.10 — CS is *easier* than the university.** No form with a
coefficient below 1 and an exponent below 1 can produce a ratio above 1, so the
rule is structurally incapable of representing open-access CS programs.

Two further diagnostics, both damning:

- The two largest errors are the two schools with **published** data (UIUC +7.5,
  Purdue −17.5) and they err in **opposite directions**. That is the signature of
  a missing variable, not of bad coefficients.
- Four schools sit between 36% and 50% overall. Their actual CS rates span **5×**
  (7.2% → 35.9%); the rule spans **1.25×**. UIUC and UCSB are 1.4 points apart on
  overall rate and 4.7× apart on CS. No one-input function of university rate can
  fit both.

Applied blindly across 30 colleges the rule collapses every open-access school
into a 19–28% band, making an 88%-admit university's CS look nearly as hard as
Purdue's — with the two published values bracketing the entire fitted range from
outside it.

**Known weakness of the 1.097 rule:** it comes from Purdue and UIUC, which have
modest spread between their colleges. At a school whose overall rate is dragged
down by one hyper-selective college — CMU, where SCS distorts the university rate —
it under-corrects badly. CMU biology comes out at 12.14%, which is almost certainly
too selective.

Known sources publishing below the university level: the **UC Information Center**
(admit rate by discipline, all nine campuses), **UIUC** (by major), **Purdue** (by
college plus three majors).

### 6b. Test-score shift — SUSPENDED

Measured across Purdue, Minnesota and Rutgers, a competitive division **raises the
floor and barely moves the ceiling**:

| | P75 shift (× university IQR) | P25 shift (× university IQR) |
|---|---|---|
| Purdue Engineering | 0.15 | 0.62 |
| Purdue Science | 0.12 | 0.46 |
| UMN Science & Engineering | 0.14 | 0.21 |
| Rutgers Engineering | ~0.18 | ~0.25 |

The P75 shift is small and **stable at ~0.13–0.18**; the P25 shift is large and
**variable**. The previous "half the college's own IQR" mechanic is roughly 3× too
large at the top and misses the shape entirely.

**Admit rate does not predict the test band.** Purdue Veterinary Medicine is the
second-hardest college (30.2%) with the *lowest* test band (1000–1140); Pharmacy is
the easiest (73.9%) and beats three harder colleges. So the tier offset cannot
carry the test shift.

**Until a per-college band is looked up, leave test scores at the college-wide
band.**

### 6c. Field prep — ACTIVE, and now measured as the model's most dangerous dial

A two-sided multiplier on the EC block, driven by **absolute** major-relevant tier
points (no denominator, so breadth is neutral):

```
0 pts → 0.80 | 1 → 0.90 | 4 → 1.00 | 16 → 1.10 | 48+ → 1.20
ec_score = clamp(base × multiplier, 0, 1)
```

**Measured this pass: the multiplier can reorder students against their own EC
quality.** In the music run, a profile with EC base 0.924 and no major-relevant
activities fell to 0.739 (×0.80), while a profile with base 0.805 and one relevant
tier-3 rose to 0.888 (×1.10). The weaker EC profile finished ahead purely on the
invented range. The effect vanished under a mainstream major where both students
had some relevant activity.

**The 0.80–1.20 range still has nothing behind it and is still the largest invented
number that visibly changes an answer.** Revisit before launch.

Still open: what counts as "major-relevant."

---

## 7. Class rank

One universal curve; drop + renormalise when the school doesn't rank.

```python
RANK_ANCHORS = [(0.00,1.00),(0.01,0.95),(0.05,0.87),(0.10,0.78),
                (0.25,0.60),(0.50,0.35),(1.00,0.00)]
```

Only 0.78 and 0.60 are anchored (they reuse the test P50/P25 anchors).

**Open TODO — auto-admission.** Rank barely matters anywhere except where it
triggers a guaranteed admit, and that pathway has no treatment. It interacts with
§6a and now with §15: auto-admit is almost always a residency-conditional rule.

---

## 8. Extracurriculars

```
tier values        1 / 4 / 16 / 48        (tier 4 = best, tier 1 = most common)
sum                across all activities; duration folded into tier assignment
base               0.15 + 0.85 · min(sum / 48, 1) ** 0.4
field prep         × 0.80–1.20 (§6c)
ec_score           clamp(base × multiplier, 0, 1)

community_service  separate factor, own C7 weight
                   0 hrs → 0.00 | any → 0.45 | 29 → 0.73 | 35 → 0.84 | 100 → 1.00
```

Reference points on the base: 0 → 0.15; three tier-1s → 0.43; two tier-2s + two
tier-1s → 0.60; two tier-3s → 0.87; ten tier-2s → 0.94; one tier-4 or three
tier-3s → 1.00.

Convex spacing (ratio 4) rather than linear, because the tiers are defined by
**rarity** and rarity is multiplicative. One elite activity saturates the score, so
the sum does its real work in the middle of the distribution.

`leadership`, `impact`, and `sustained_commitment` are **dead as separate factors** —
no CDS C7 row exists for any of them. Duration folds into tier assignment instead.
`community_service` survives only because it has its own published row.

**Note for general-layer runs:** field prep fires only when a major is named, so
`ec_score == base` in a general-admissions run. Expect EC scores to differ between
a general run and a major run for the same student.

---

## 9. Weights

From the CDS C7 rows: Very Important 3 / Important 2 / Considered 1 / Not
Considered 0. Each factor's weight is its value over the sum of the values of the
factors **still in play** — dropped factors are removed *before* normalising.

### Archetype weight profiles (fixture only)

| profile | rigor | gpa | test | rank | ec | service | stands for |
|---|---|---|---|---|---|---|---|
| `holistic` | 3 | 3 | 2 | 0 | 3 | 2 | selective privates that don't rank |
| `rigor_heavy` | 3 | 2 | 2 | 2 | 1 | 1 | rigor-first STEM |
| `gpa_heavy` | 2 | 3 | 2 | 1 | 1 | 1 | GPA-first |
| `rank_state` | 2 | 3 | 2 | 3 | 2 | 1 | large publics with rank/auto-admit |
| `balanced` | 2 | 2 | 2 | 1 | 2 | 1 | default |

**These are assigned, not sourced. Flag them as such in any run.**

**Weight is not the lever people expect.** Sweeping the rigor/GPA split from
0.50/0.50 to 0.70/0.30 changes band agreement by 0 points; only pushing below 0.50
degrades it. A saturated input cannot be fixed by reweighting.

**But the archetypes DO produce visible ordering artifacts — new this pass.** See
§12, "Archetype inversions."

---

## 10. Recommendation layer — `ambition` is now a function of the student

```python
def match_score(odds, quality, ambition):
    return (1 - ambition) * odds + ambition * quality
```

Additive, not a power product, so it is not scale-invariant and the student's
absolute level enters the ranking.

### 10-a. Why the constant had to go

At a fixed `ambition = 0.44` the ranking was **backwards at both ends**:

| student | ranked list at ambition 0.44 |
|---|---|
| maxed academic profile | UIUC · ASU · UT Austin · **Harvard (4th)** · Michigan · CMU |
| weakest profile | ASU · **Harvard (2nd)** · UIUC · UT Austin · Michigan · CMU |

The strongest student was pushed toward safeties; the weakest was pushed toward
Harvard.

**Cause, and it is not the multiplier: the odds term goes flat at the bottom.**
For a weak student the five selective schools in that set spanned 1.7–11.9% odds —
a 10-point range — so quality alone ordered them and Harvard's `q = 1.0` won by
default. For a strong student the same five spanned 52.5–88.4%, wide enough to
overwhelm quality.

**Two fixes were tested and rejected:**

- **Standardising each term by its spread across the student's own college set.**
  Still puts Harvard 2nd for the two weakest profiles. Rescaling changes the odds
  vector's size, not its shape — the reaches stay bunched near zero.
- **Weighting quality by odds** (`match = odds·((1−a) + a·q)`). Fixes the weak end
  completely — Harvard drops to last — but leaves the strong end unfixed, with ASU
  still 1st and Harvard 6th.

### 10-b. The ramp

```python
A_MAX, A_MIN = 0.55, 0.20

def reachable_rate(student):
    """The admit rate at which this student is a 50/50.
    Evaluated at a FIXED tier-3 reference with weights rigor 2 / gpa 2 / ec 2 / service 1."""
    f = FLOORS[3]
    ref = (2*piecewise(effective_volume, f) + 2*piecewise(gpa_x, f)
           + 2*ec_score + 1*service_score) / 7
    return inverse_college_bar(ref)

def ambition(student):
    return A_MAX - (A_MAX - A_MIN) * min(reachable_rate(student) / 0.80, 1)
```

Equivalent form: `0.55 − 0.4375 · min(reachable_rate, 0.80)`. **Do not write it as
`0.55 − 0.4375 · min(rate/0.80, 1)`** — that mixes the two forms and bottoms out at
0.1125 instead of 0.20.

**Why the level measure is absolute and not set-relative.** `reachable_rate` reads
as "the admit rate at which this student is a coin flip." It is expressed in
published units and does not depend on which colleges are in the candidate list, so
adding a college never silently changes anyone's ambition. It introduces no new
parameter — it reuses `college_bar` inverted.

**Why a FIXED tier-3 reference and not the self-consistent fixed point.** Letting
the rate set the tier, which sets the floors, which set the strength, which sets the
rate, creates a feedback loop that is **not monotone** — 7 non-monotonicities across
400 increasing profiles, worst 0.029 of ambition. Evaluating at a fixed tier 3 gives
**0 violations** across the same sweep and is simpler.

**Shape selection.** Four shapes were tested against the six fixture profiles:

| shape | verdict |
|---|---|
| linear in ln(rate) | rejected — collapses 0.55 → 0.31 between the top two profiles |
| linear in strength | rejected — weak end unfixed, Harvard still 2nd for the bottom two |
| smoothstep in strength | same outcomes as the winner, but ~2× the mid-range sensitivity |
| **linear in reachable rate** | **adopted** — monotone, evenly spaced, linear in a published unit |

Worst ambition jump per 0.01 of GPA: **0.037**. It rides on top of the existing
floor steps rather than adding a new cliff.

### 10-c. What the ramp fixed and what it did not

On the fixture set, Harvard moves from 4th to **1st** for the strongest profile and
from 2nd to 4th for a weak one. The `match_score` floor for the weakest student
falls from `0.44 × quality` to `0.20 × quality`.

**⚠ THE FLOOR DEFECT IS REDUCED, NOT REMOVED, AND IS STILL THE HIGHEST-PRIORITY
FIX.** `match_score` retains a hard floor of `ambition × quality`. Two findings
bound how bad it is:

- On a **selectively skewed** 30-college list, the weakest profile still surfaced
  MIT (1.9% odds) and Harvard (1.8%) at positions 3 and 4.
- On a **tier-balanced** 30-college list, both disappeared from the top 5 entirely —
  with real tier-1 schools present, their blended scores beat `0.20 × 1.00`.

So part of the defect is an artifact of a prestige-skewed candidate list rather
than of the model. It still shows in the middle of a full ranking: for a strong
student, MIT at 28.8% odds outranks a 79.0%-odds safety.

Two candidate fixes remain unadopted: weight the quality term by odds, or apply a
display floor inside the reach band before quality sorting runs.

---

## 10a. Admission odds — `college_bar` REWRITTEN

```python
ODDS_K = 5.0

def college_bar(admit_rate):
    L = -math.log(admit_rate)
    return -0.1683 + 0.6750*L - 0.0600*L**2 + D*L**3     # D: see below, NOT YET SET

def admission_odds(strength, admit_rate):
    return sigmoid(ODDS_K * (strength - college_bar(admit_rate)))
```

### Why the old form was structurally wrong

The v4 form was `clip(1 - 0.917 · rate**0.875, 0.10, 0.97)`.

**`1 - A·rate**B` can never exceed 1.0, for any A > 0 and any B.** But the two ends
require bars outside [0, 1]:

| | v4 bar | required bar |
|---|---|---|
| Harvard 3.65%, to put a maxed academic profile near 10–20% | 0.949 | **1.25 – 1.41** |
| ASU 88.4%, to put a weak profile near the published 88% | 0.177 | **−0.086** |

So the clip at 0.10/0.97 was never the problem — the functional form caps the bar
inside [0, 1] and both ends fall outside it. `ODDS_K` cannot rescue this either,
because the two ends want opposite moves from one steepness dial.

**Measured symptom.** Published rates span 3.65–88.4% (24×); model odds on a fixed
six-profile set spanned only ~24–90% (4×). The ratio of mean model odds to
published admit rate ran **6.66× at Harvard down to 1.02× at ASU** — a clean
monotone gradient, which is the signature of a model defect rather than a pool
artifact.

### The new form

Linear in **log** admit rate, unbounded in both directions, no clip. This is also
consistent with the equal-ratio-width principle already used for the tier ladder:
selectivity is multiplicative, so the bar should be linear in log rate.

Fitting progression, each step measured by the ratio-spread metric below:

| form | ratio spread |
|---|---|
| v4 power form | 6.54× |
| 2-point log-linear `−0.1376 + 0.4182·L` | 3.10× |
| **3-parameter quadratic `−0.1683 + 0.6750·L − 0.0600·L²`** | **1.98×** |

**How the coefficients were derived, and why this is better than hand-picking.**
Only **one** anchor is imposed: ASU at bar −0.086, which traces to the §13a pool
calibration. The remaining coefficients come from an *objective* rather than a
target — minimise the spread of (mean model odds ÷ published admit rate) across the
30-college set. That is legitimate because the profile pool is identical at every
college, so any selectivity-dependent drift in that ratio is model error, while a
flat offset is just the fixture pool being stronger than a real applicant pool.

The earlier hand-set "Harvard should read 20%" target was **removed** by this
method. The optimiser landed on 10% on its own.

### ⚠ THE CUBIC TERM `D` IS NOT YET SET

At `D = 0` the quadratic above is complete and self-consistent. Three points on it
have been confirmed by hand-judgement (§13d). But the 20–60% band reads too
generous, and correcting it requires a cubic term.

**The trade-off is internal to the middle.** The curve is pinned at Harvard and
Michigan, so it can only bow: lowering the 20–60% band *raises* the 11–16% band.

| D | UT Austin | UIUC | Purdue | CMU | Georgia Tech | ratio spread |
|---|---|---|---|---|---|---|
| 0.00 | 86.0% | 93.4% | 97.2% | 42.6% | 50.2% | 1.98× |
| 0.10 | 77.5% | 86.3% | 93.8% | 53.8% | 57.7% | 2.05× |
| 0.15 | 72.1% | 80.7% | 90.8% | 59.4% | 61.4% | 2.31× |
| 0.18 | 68.4% | 76.6% | 88.5% | 62.6% | 63.6% | 2.47× |

(Odds shown for the maxed academic profile.)

**Hard bounds.** Across *every* monotone cubic through the three confirmed anchors,
UT Austin cannot go below **68.4%**, Purdue below **88.5%**, or Ohio State below
**94.8%**. Going lower requires moving one of the three anchors — most likely ASU,
which pins the open end.

**Two pieces of evidence point in opposite directions:**

- The **Purdue-median calibration** (§13c) favours `D ≈ 0.10–0.15`.
- The **Georgia Tech reach judgement** (§13d) favours `D = 0.00`, because Georgia
  Tech at 12.74% sits in the band that a cubic term raises.

**§15 resolves the conflict without touching `D`.** Georgia Tech's out-of-state
rate is 8.93%, and using it reproduces the reach judgement exactly. Recommendation:
**implement §15 first, then re-run this table before setting `D`.**

### Guard

The quadratic turns over at `L = 5.625`, i.e. an admit rate of **0.36%**. Below that
the bar starts falling again, which is wrong. No real college is there, but the
function is only valid above ~0.4% and must be clamped.

### Steepness

`ODDS_K = 5.0`. At strength exactly = bar, odds are 50% for any K.

| strength − bar | −0.20 | −0.10 | 0 | +0.10 | +0.20 |
|---|---|---|---|---|---|
| K = 9 (old) | 14% | 29% | 50% | 71% | 86% |
| **K = 5 (current)** | **27%** | **38%** | **50%** | **62%** | **73%** |

`ODDS_K` is **not** the lever for band accuracy. Swept 4 → 11, agreement moves only
83% → 89%, and the "reads too high" error count sits at 6 for *every* value of K.

### Bands

```python
def label_of(odds):
    if odds >= 0.70: return "safety"
    if odds >= 0.30: return "target"
    return "reach"
```

**No `far` band — nothing is excluded by odds.** The cuts are symmetric around the
50/50 point: at K = 5, target spans `bar ± 0.094`.

---

## 10b. Program quality — THE RANK INPUT IS NOW MAJOR-SPECIFIC

```python
def program_quality(rank):
    return clip(1.157 - 0.1425 * math.log(rank), 0.45, 1.0)

rank = program_rank(college, major) if major_named else institutional_rank(college)
```

**Decision, this pass: when the student names a major, quality reads the
PROGRAM's published rank. Institutional rank is for general admissions only.**
Same log map, same coefficients, zero new parameters — only a different published
column.

Logarithmic in rank: rank 3 ≈ 1.0, 6 ≈ 0.90, 20 ≈ 0.73, 45 ≈ 0.61, 100 ≈ 0.50.

### Why this is not cosmetic

Institutional rank is largely a selectivity proxy, so quality and odds were
near-collinear and almost every college sat inside the convex hull, structurally
unable to be anyone's top pick. A program rank is **not** a selectivity proxy.
Measured on the 30-college CS run:

| quality input | corr(quality, ln CS admit rate) |
|---|---|
| institutional rank | **−0.792** |
| CS program rank | **−0.473** |

Concretely: Georgia Tech is institutional #32 and CS #5 (q 0.663 → 0.928);
Purdue is #46 and CS #16 (0.611 → 0.762); Maryland is #42 and CS #16
(0.624 → 0.762).

### What it fixed

On the institutional axis, all six fixture profiles surfaced the **identical**
three reaches — MIT, Harvard, Yale — including the 3.05-GPA profile at 0.2–0.3%
odds. This is worse than it looks: MIT, Harvard, Yale and Duke are exactly the
colleges whose major offset is genuinely 0 (§6a class **U**), so they kept both
full institutional quality *and* an unmodified admit rate. The four
highest-quality schools were the four the major layer could not touch.

On the CS axis the reaches become CMU, MIT, and UIUC or Georgia Tech for every
profile. Harvard, Yale, Duke, Emory, Boston College, Villanova and Temple drop
off all six lists.

### What it did not fix

Ties. A continuous map removes ties introduced by *bucketing*, not ties present in
the rank source, and CS ranks tie heavily too — Maryland and Purdue both at #16,
Indiana and Michigan State both at #54. Breaking rank ties still needs a second
published figure and is not yet designed.

Worked tie example on the institutional axis, from §16: **Auburn, Temple, Iowa,
Missouri and Tennessee all sit at #102**, so all five carry `q = 0.498` and are
separable only by admit rate.

---

## 10c. Surfacing

```python
def build_list(rows, n_reach=3, n_target=5, n_safety=4):
    reaches  = by_quality(band == "reach")[:n_reach]
    targets  = by_quality(band == "target")[:n_target]
    safeties = by_odds(band == "safety")[:n_safety]
    return sorted(reaches + targets + safeties,
                  key=lambda r: (band_order[r.label], -r.quality))
```

Reaches and targets by quality so a decorrelated reach still appears; safeties by
odds so the high-admit schools are never cut.

**PROMOTED FROM FORMATTING STEP TO LOad-BEARING MECHANIC — new this pass.** Once
`ambition` is at or below 0.5, `match_score` is close to monotone in odds, because
quality only spans 0.45–1.00 and that is not enough to reorder across a 60-point
odds gap. So "top 10 by match" collapses into "top 10 by admit rate" for everyone
except the strongest students.

Measured on the tier-balanced 30-college set, top-10 band composition:

| profile | reach / target / safety | odds span | verdict |
|---|---|---|---|
| maxed academic | 0 / 3 / 7 | 53–98% | passable |
| second-strongest | 0 / 3 / 7 | 48–98% | passable |
| **strong** | **0 / 0 / 10** | **78–97%** | **broken — no target, no reach** |
| **good** | **0 / 0 / 10** | **78–96%** | **broken** |
| average | 0 / 5 / 5 | 35–83% | good |
| **weakest** | **4 / 6 / 0** | **20–68%** | **no safety at all** |

Four of six lists are unusable as raw rankings. **The quota in `build_list` is doing
the entire job of making the output a college list**; the ranking only picks which
school inside each band. This must be documented as a requirement, not an option.

Open consequence: for the two middle profiles the reach band is empty in the top 10,
so the quota has to reach down to positions 18–30 to fill three reach slots — which
is exactly where the most prestigious schools sit. Whether that produces a good list
or re-imports the prestige problem is untested.

---

## 11. Numbers with nothing behind them

Every value below is a choice, not a measurement. The ★ marks are from the fifth pass
and are left as they were — **this pass added no new invented numbers.** Both changes
(major-specific quality, the collection standard) swap a data source rather than adding
a parameter.

**Tiers** — admit-rate cutoffs 65/43/28/18/12%; the 3/2/1/0 C7 spacing;
`reference_catalog` 12; the assumed 3.93 tier-5 typical GPA.

**Rigor** — `schedule_ceiling` 14, `curve_exponent` 0.6, `ceiling_headroom` 0.99,
`abs_rigor_ref` 10, `abs_weight` 0.40, `small_catalog` 6, ★ **the 8-tier multiplier
endpoints 1.00 / 0.70 and their 3.70 / 3.30 cuts** (the eight levels between them
are derived, not chosen).

**GPA** — the 2.00 floor anchor.

**Grade trend** — the 7% trigger, the 0.075 penalty, excluding 9th grade.

**Test scores** — anchors 0.60/0.78/0.90, the below-P25 exponent 1.5, the 0.94
national value, the P50 midpoint interpolation.

**Class rank** — 1.00, 0.95, 0.87, 0.35 (only 0.78 and 0.60 are anchored).

**Extracurriculars** — tier values 1/4/16/48, cap 48, base exponent 0.4, floor 0.15,
**field-prep range 0.80–1.20**, the 100-hour service anchor. The EC and service
weight columns in §9.

**Admission odds** — ★ **`college_bar`'s three coefficients.** One anchor (ASU) is
empirical; the rest come from an optimisation objective, which is better than a
hand-picked target but is still not a measurement. ★ **the cubic term `D`, unset.**
`ODDS_K` = 5; band cuts 0.70 / 0.30.

**Ambition** — ★ **the endpoints 0.55 and 0.20**, ★ **the 0.80 clamp point**, ★ **the
tier-3 reference weight vector 2/2/2/1**. The linear shape between the endpoints was
selected by test, not chosen.

**Program quality** — the log map `1.157 − 0.1425·ln(rank)`. The rank source itself
is a choice.

**Match score** — list sizes 3 / 5 / 4.

**Major layer** — any estimated per-major admit rate, which must carry its source
class in the output. ★ **the biology factor 1.097** (two data points).

**Residency (§15)** — nothing invented yet; the mechanic uses only published rates.
This is the cheapest accuracy gain available precisely because it needs no new
constants.

---

## 12. Known limitations

**The `match_score` floor (§10c).** Highest priority. Reduced by the ambition ramp
and by a tier-balanced candidate list, but not removed.

**The ranking cannot produce a balanced list on its own (§10c).** Four of six
fixture profiles get an all-safety or all-reach top 10. The band quota is
load-bearing.

**The flat top.** `piecewise` has fixed points at 0 and 1, so raw 0 and raw 1 are
tier-invariant. Measured on the fixture set: a 4.00/14-of-18 and a 3.98/16-of-33
differ by exactly **4.9 points of odds at Harvard, MIT, Yale and Duke**, and 3.4 at
CMU. Adding the other factors separates them somewhat; it does not fix the ceiling.

**Archetype inversions — NEW this pass.** Because the weight vector differs by
school, two colleges with nearly identical admit rates can invert. On the
Purdue-median candidate, four inversions appeared in a 30-college run:

| more selective | odds | vs | less selective | odds |
|---|---|---|---|---|
| Maryland 45.00% `gpa_heavy` | 87.2% | > | Purdue 49.80% `rigor_heavy` | 87.0% |
| Boston College 12.60% `holistic` | 10.0% | > | Georgia Tech 12.74% `rigor_heavy` | 8.0% |
| UT Austin 26.60% `rank_state` | 49.2% | > | Villanova 27.40% `holistic` | 47.6% |
| Tennessee 38.32% `rank_state` | 76.2% | > | Rochester 40.10% `holistic` | 75.8% |

Every one has a `rigor_heavy` or `rank_state` school on the losing side, and the
candidate is GPA-strong and rigor-weak. **Judged a fixture artifact, not a model
defect** — the archetypes are assigned, not sourced. Re-check once real C7 vectors
exist. Across the full six-profile grid the inversion rate is 15 of 2,610 pairs
(0.6%), all near-ties.

**Strength is not comparable across colleges.** Because the weight vector changes
which factors are in the average, a college that ignores a factor the student is
weak in makes them look *stronger* there. Consequence: **"more selective ⇒ lower
odds" is not an invariant of this model.** Judged correct behaviour; any future test
asserting monotonicity across colleges will fail, and the test would be wrong.

**Non-submission is free.** A student who submits no test has the factor dropped and
the rest renormalised — no penalty.

**Rigor's double count.** See §3.

**Residency is unmodelled.** See §15. Currently the largest single unmodelled
effect: 3× at Georgia Tech on published figures.

**The confidence label still does nothing.** Flagged results do not widen the
predicted range or demote an uncertain target to "unclear." Roughly a third of a
selective college's C7 weight sits in rows the model deliberately does not score.

**Population and censoring.** C9/C10/C11 all describe *enrolled* students, not
applicants. This now has a concrete consequence in §13c: any candidate built from a
published profile is an **enrolled** median, not an average applicant, and should
read well above the school's admit rate.

**Scope.** AP only, no honors/IB/dual enrolment.

**Data acquisition is the real bottleneck, not the arithmetic.**

---

## 13. How the model is validated

### 13a. Odds calibration — one anchor, one tier

Score a college's own applicant pool and compare the model's average odds to its
published admit rate. Done once: an ASU pool built from ASU's published CDS enrolled
GPA distribution crossed with College Board AP participation (n = 200k) gives
**87.0% model odds vs 88.4% published at K = 9**, and **78.2% at K = 5**.

This validates rigor + GPA + floors + `college_bar` **as a combination**, not any
one of them.

### 13b. Band agreement — the working metric

Hand-label every (student, college) pair reach/target/safety, then score the model
against the labels. **Current: 92% (59 of 64), with 0 "reads too high" errors.**

Three rules learned the hard way:

1. **Label at the same layer the run uses.** Labelling academics-only output as a
   full-file reader would manufactures a fake "model reads too high" bias.
2. **Check whether the run is general or major-layer before labelling.**
3. **Score a boundary-weighted set, or the number is meaningless.** In a 64-pair
   grid, ~24 pairs sit more than 10 points from a band cut and are free.

**92% against one grader's judgement is not 92% accuracy.** Gaps of 3–6 points on a
30/70 cut sit inside the labelling error.

### 13c. The Purdue-median candidate — NEW, a second calibration handle

Build a candidate from a college's own published freshman profile and check where
the model puts them at that college.

**Candidate:** GPA 3.85 (midpoint of Purdue's published 3.70–4.00 band). AP count
(5 of 18), ECs (one tier-2 + two tier-1) and 29 service hours are **constructed** —
Purdue publishes none of those.

Model reads: rigor volume 0.579 → gpa_x 0.925 → ec 0.520 → service 0.730 →
reference strength 0.621 → 50/50 at a **36.4% admit rate**, ambition 0.391.

**The critical distinction: the published band describes ENROLLED students.** They
sit around the 75th percentile of applicants, not the 97th. An *average applicant*
should read close to the published 49.8%.

| candidate | D=0.00 | D=0.10 | D=0.15 | D=0.18 |
|---|---|---|---|---|
| enrolled median (published 3.85) | **87.0%** | 74.4% | 65.7% | 59.9% |
| one notch weaker (3.70, 4 AP) | 81.2% | 65.2% | 55.3% | 49.1% |
| two notches weaker (3.55, 3 AP) | 71.6% | 52.3% | 42.0% | 36.1% |
| three notches weaker (3.40, 2 AP) | 53.3% | 33.2% | 24.6% | 20.3% |

87% for the enrolled median is too high; 59.9% is arguably too low. At D ≈ 0.15 the
"one notch weaker" and "two notches weaker" rows straddle 49.8% where an average
applicant plausibly sits. **This test is independent of the fixture profile pool.**

Caveats: Purdue's published GPA band may be recalculated rather than true unweighted
(the standing GPA-bar ambiguity), and the run used Purdue at 49.8% while Purdue's
own profile page reported 43.4% — different years.

### 13d. Hand-confirmed `college_bar` points — NEW

Three bars have been confirmed by direct judgement and should be held fixed in any
future refit:

| college | admit rate | bar | reads as |
|---|---|---|---|
| Harvard | 3.65% | **1.409** | maxed academic profile → 10.0% |
| Michigan | 16.40% | **0.856** | maxed academic profile → 64.4% |
| ASU | 88.40% | **−0.086** | weakest profile → 88.8% (published 88.4%) |

**Plus one band label:** Georgia Tech is a **reach** for a 3.98 GPA / 16-of-33-AP
profile. At the overall 12.74% rate the model reads 46.7% (target); at the published
out-of-state rate of 8.93% it reads **29.5% (reach)**. This is the clearest evidence
for §15.

### 13e. What the remaining misses are

Mostly the top two profiles at tier-5 schools (64–70% odds, just under the safety
cut). Four of five are the flat top: students who have maxed every factor the model
can see. **They are not a parameter problem and should not be chased.**

### 13f. A challenge to the odds layer, raised and withdrawn — NEW

The objection: **admit rate measures competition, not standard.** Purdue CS admits
35.9% and Georgia Tech CS 11.28%, but their published admitted-student bands are
nearly identical — Purdue CS SAT 1420–1540 against Georgia Tech's 1430–1540. Purdue
is easier to get into without having a lower standard, because its applicant pool
self-selects. `college_bar` is a function of admit rate alone, so it cannot express
"moderate admit rate, high bar."

**The objection was withdrawn.** What an odds layer owes is *ordering*: if Purdue
CS is easier to get into than Georgia Tech CS, it must read that way, and it does
(93% vs 44% for the maxed profile). The tier placement follows mechanically — 35.9%
falls in tier 3's 28–43% band.

An attempt to show the *level* was too generous also failed. Purdue CS's bar is
0.4602, i.e. a coin-flip student around 3.42 GPA with 5 advanced courses, which
looks low against a published admitted-GPA P25 of 3.80 — but that band describes
**admits, not applicants**. At a 36% admit rate the median admit sits near the 82nd
percentile of applicants, so the 50/50 point *should* land well below the admitted
P25. Distinguishing "calibrated" from "generous" needs the applicant distribution,
which nobody publishes. **No defect demonstrated. Do not re-open this.**

The residual distinction worth keeping straight: *easier to get into* ≠ *lower
standard*. The standard difference belongs to `program_quality`, not to odds.

---

## 14. Open items, in priority order

**This version ships with these open.** They are parked deliberately so work can
move to the rest of Uniseek, not overlooked.

| # | item | state |
|---|---|---|
| 1 | **Maryland's CS admit rate** | **decides whether Purdue's top-pick status is real** — see §18. Then UC San Diego, Ohio State, ASU |
| 2 | **The other 14 unresearched CS rates** | §18; any list containing a class-F value is provisional |
| 3 | **Residency (§15)** | biggest unmodelled effect, needs no invented constants, and resolves the `D` conflict |
| 4 | **Set the cubic term `D`** | blocked on #3; re-run §10a's table after residency lands |
| 5 | **`ambition`: §17 vs §10 disagree** | §17's listed values do not reproduce from the formula; odds are unaffected |
| 6 | **Field prep on/off for major runs** | §6c; currently suppressed in fixture runs because activities carry no major-relevance labels |
| 7 | **`match_score` floor + display floor** | reduced but not removed |
| 8 | **Document the band quota as load-bearing** | §10c; the ranking alone cannot produce a usable list |
| 9 | **Collect real C7 vectors** | the archetypes produce visible ordering artifacts (§12) |
| 10 | **Stale overall rates** | UT Austin 26.60% → 22.2% (Fall 2025); Purdue 49.80% → 43.4%. Both are tier-boundary-relevant |
| 11 | Second applicant-pool calibration | the only way to lock `college_bar`'s coefficients |
| 12 | Field-prep range 0.80–1.20 | able to reorder students against their own EC quality |
| 13 | Rank ties | now present on both axes: Maryland/Purdue at CS #16, Indiana/Michigan State at CS #54 |
| 14 | The 19 estimated CS ranks | **measured as low-impact** (§18), so genuinely low priority |
| 15 | Test band by college (§6b) | suspended until lookup data exists |
| 16 | Confidence label → range | v2 |
| 17 | Auto-admission | v2; now also a residency-conditional rule |
| 18 | IB / dual enrolment / honors | v2 |
| 19 | `field_prep_academic` | **recommend killing outright** — no C7 row anywhere |

---

## 15. Residency — NEW, RECOMMENDED, NOT YET ADOPTED

Public universities admit in-state and out-of-state applicants at very different
rates, and many publish both alongside the overall figure. The model currently uses
only the overall rate, which is a blend of two populations the applicant belongs to
exactly one of.

### Mechanic

Add one field to the student form — home state. For any college that publishes the
split, substitute the matching rate wherever the overall rate is used: the tier
lookup (§1), `college_bar` (§10a), and `reachable_rate` (§10b).

**No new constants.** This uses only published numbers, which makes it the cheapest
accuracy gain available.

### Measured effect — Georgia Tech

Published: overall 12.74%, in-state 29.3%, out-of-state 8.93%.

| profile | in-state 29.3% | overall 12.74% | out-of-state 8.93% |
|---|---|---|---|
| maxed academic | 88.6% S | 50.2% T | 32.6% T |
| 3.98 / 16-of-33 | 87.6% S | 46.7% T | **29.5% R** |
| 3.85 / 11-of-18 | 82.1% S | 26.4% R | 13.2% R |
| 3.70 / 9-of-18 | 70.8% S | 14.0% R | 5.8% R |

**Residency alone moves a public by roughly 3×**, matching the 3–5× figure already
noted in §12 — and the out-of-state column reproduces the hand-confirmed reach
label in §13d exactly, with no tuning.

### Known sources publishing the split

Georgia Tech (29.3 / 8.93), UVA (23 overall / 12.5 OOS), Tennessee (62.76 / 31.17),
Florida State (41 / 21), UNC, Michigan, UT Austin.

### Open questions

- What to do for a college that publishes no split. Options: fall back to overall
  (safe, current behaviour), or estimate from peers (risks the same over-confidence
  the CS fit produced for the wrong major family). **Recommend falling back to
  overall and flagging low-confidence.**
- Interaction with auto-admission (§7), which is almost always residency-conditional.
- Private universities: no split exists and none should be invented.

---

## 16. The 30-college dataset — NEW

Assembled 2026-08-03, five colleges per tier. **Provenance is per-field and must
travel with the data.** V = verified from a primary or reputable compiled source
this session; M = carried from earlier sessions, not re-verified; A = approximate.

| tier | college | admit rate | src | US News 2026 | src | archetype |
|---|---|---|---|---|---|---|
| 6 | Harvard | 3.65% *(class of 2028 — no 2029 release)* | V | 3 | V | holistic |
| 6 | MIT | 4.52% | V | 2 | V | holistic |
| 6 | Yale | 4.59% | V | 4 | V | holistic |
| 6 | Duke | 4.80% | V | 7 | V | holistic |
| 6 | CMU | 11.07% | M | 20 | V | rigor_heavy |
| 5 | Boston College | 12.60% | V | 36 | V | holistic |
| 5 | Georgia Tech | 12.74% | V | 32 | V | rigor_heavy |
| 5 | Emory | 14.95% | V | 24 | V | holistic |
| 5 | UNC | 15.30% | M | 26 | V | gpa_heavy |
| 5 | Michigan | 16.40% | M | 20 | V | gpa_heavy |
| 4 | Florida | 19.77% | V | 30 | V | rank_state |
| 4 | Virginia | 23.00% | V | 26 | V | gpa_heavy |
| 4 | UC San Diego | 24.00% | A | 29 | V | gpa_heavy |
| 4 | UT Austin | 26.60% | M | 30 | V | rank_state |
| 4 | Villanova | 27.40% | V | 51 | A | holistic |
| 3 | UC Irvine | 28.94% | M | 32 | V | gpa_heavy |
| 3 | Georgia | 33.00% | V | 46 | V | rank_state |
| 3 | UIUC | 36.60% | M | 36 | V | rigor_heavy |
| 3 | Tennessee | 38.32% | V | 102 | V | rank_state |
| 3 | Rochester | 40.10% | M | 46 | V | holistic |
| 2 | Maryland | 45.00% | A | 42 | V | gpa_heavy |
| 2 | Purdue | 49.80% | M | 46 | V | rigor_heavy |
| 2 | Temple | 52.20% | A | 102 | V | rank_state |
| 2 | Penn State | 55.33% | V | 59 | V | rank_state |
| 2 | Ohio State | 60.60% | M | 41 | V | rank_state |
| 1 | Indiana | 78.21% | V | 73 | A | rank_state |
| 1 | Auburn | 80.50% | A | 102 | V | rank_state |
| 1 | Iowa | 80.70% | A | 102 | V | rank_state |
| 1 | Michigan State | 84.80% | M | 63 | A | rank_state |
| 1 | Arizona State | 88.40% | M | 117 | M | rank_state |

Totals: admit rates 14 V / 11 M / 5 A. Ranks 26 V / 3 A / 1 M. **Archetypes: 30
assigned, 0 sourced.**

**Rank ties present:** Auburn, Temple, Iowa and Tennessee all sit at #102 (Missouri
also ties there but is not in the set); Michigan and CMU both at #20; Florida and
UT Austin both at #30; Georgia, Purdue and Rochester all at #46; Virginia and UNC
both at #26. Useful as a ready-made test case for §10b.

**Note on tier balance.** An earlier version of this set was drawn as "the 30
most-discussed universities" and came out T6 ×14, T5 ×7, T4 ×3, T3 ×4, T2 ×2, T1 ×0.
That skew alone changed the model's output materially — the `match_score` floor
defect appeared in the top 5 on the skewed set and vanished on the balanced one.
**Any future evaluation must state its tier distribution**, because it is not a
neutral choice.

---

## 17. Fixture profiles

Six invented students used throughout, plus the constructed Purdue-median candidate.

| name | uw GPA | AP taken / offered | EC tiers | service hrs |
|---|---|---|---|---|
| elite | 4.00 | 14 / 18 | 4, 2, 1, 1 | 60 |
| danush | 3.98 | 16 / 33 | 3, 3, 2, 1, 1 | 45 |
| strong | 3.85 | 11 / 18 | 3, 2, 2, 1 | 40 |
| good | 3.70 | 9 / 18 | 2, 2, 1, 1 | 25 |
| average | 3.40 | 5 / 18 | 1, 1, 1 | 0 |
| below | 3.05 | 2 / 18 | 1 | 0 |
| *purdue_median* | *3.85* | *5 / 18* | *2, 1, 1* | *29* |

Resulting ambitions on the general layer: elite 0.550 | danush 0.535 | strong 0.500
| good 0.439 | average 0.250 | below 0.200 | purdue_median 0.391.

**⚠ THESE VALUES DO NOT REPRODUCE FROM §10's OWN FORMULA — flagged this pass,
unresolved.** Running `0.55 − 0.4375·min(reachable_rate, 0.80)` at the fixed
tier-3 reference on these profiles gives **0.496 / 0.492 / 0.479 / 0.455 / 0.356 /
0.310**. The listed elite value of 0.550 is exactly `A_MAX`, which requires
`reachable_rate = 0` — an unattainable admit rate. Either the table is stale or
the reference used to produce it differs from the one §10b specifies.
`admission_odds` does not use `ambition`, so odds and band labels are unaffected;
only `match_score` ordering would move. Runs in §18 use the **formula** values.

**These profiles are not an applicant pool.** They skew far stronger than any real
one, which is why every ratio in §10a exceeds 1 and why a uniform offset in that
metric is expected and harmless. Only the *gradient* is diagnostic.


---

## 18. The researched CS dataset — NEW

The first per-major dataset built to the §6a collection standard. It is
**incomplete and shipping anyway**: 12 of 30 admit rates are researched, 18 remain
class **F**. Read every table below with its source column.

### 18a. CS admit rates

| class | college | overall | CS | basis |
|---|---|---|---|---|
| U | Harvard | 3.65% | 3.65% | no direct admit to CS |
| U | MIT | 4.52% | 4.52% | admits to the institute |
| U | Yale | 4.59% | 4.59% | no direct admit to CS |
| U | Duke | 4.80% | 4.80% | no direct admit to CS |
| U | Michigan | 16.40% | 16.40% | CS in both CoE and LSA; no direct admit to the major |
| U | Florida | 19.77% | 19.77% | no direct admit to CS |
| U | Penn State | 55.33% | 55.33% | entrance-to-major happens after enrolment |
| **D** | **Georgia Tech** | 12.74% | **11.28%** | 1,547 admits ÷ 13,711 CS+CM applicants, GT LITE Aug 2025 |
| **P** | **UIUC** | 36.60% | **7.20%** | published by major |
| **P** | **Purdue** | 49.80% | **35.90%** | published; Purdue lists CS among its three most competitive majors |
| C | CMU | 11.07% | ≈5.20% | SCS "under 5%" / 5.2% / 5–7% across three sources |
| C | UT Austin | 26.60% | ≈8.50% | 8–9% across sources, no primary count located |
| F | Boston College, Emory, UNC, Virginia, UC San Diego, Villanova, UC Irvine, Georgia, Tennessee, Rochester, Maryland, Temple, Ohio State, Indiana, Auburn, Iowa, Michigan State, ASU | — | fitted | **unresearched** |

**Research moved 10 of the 12 in the same direction: the fit was too harsh.**
Penn State +35.5 pp, Purdue +17.5, Florida +10.4, Michigan +8.3, Georgia Tech +4.5,
Duke +1.5, Yale +1.4, MIT +1.4, Harvard +1.0; the other way UIUC −7.5, UT Austin −3.1,
CMU −0.9.

Georgia Tech is the sharpest correction. The fit said 6.75%, the consulting
estimate carried in earlier passes said ~8%, and the school's own counts say
**11.28%** — Georgia Tech CS is barely harder than Georgia Tech overall. **Retire
the 8% figure.**

**Known blocker.** The UC Information Center publishes CS admit rate for all nine
campuses, but only inside a dashboard that does not extract. A secondary
reproduction gave Berkeley 6%, UCLA 7%, Davis 19%, Santa Barbara 34%, Santa Cruz
79% — but not UC San Diego or UC Irvine, the two campuses in this set.

### 18b. CS program ranks

US News 2026 Best Undergraduate Computer Science Programs. Peer assessment only:
CS faculty rate programs 1–5, and a program must be ABET-accredited or award 20+
CS bachelor's degrees to be listed. 601 programs ranked. **usnews.com blocks
automated fetching**, so verified ranks come one school at a time from each
school's own release.

**V** verified · **O** read off the published list order · **E** estimate with basis

| college | inst. | CS | src | basis |
|---|---|---|---|---|
| MIT | 2 | **1** | V | #1 overall |
| CMU | 20 | **2** | V | tied with Stanford and UC Berkeley |
| Georgia Tech | 32 | **5** | V | stated by GT and by secondary sources |
| UIUC | 36 | **8** | O | list order, after Princeton and Cornell |
| UT Austin | 30 | **10** | O | list order; "top 10–12" in secondary sources |
| Michigan | 20 | **11** | E | consistently top 10–12; one source states #7 |
| UC San Diego | 29 | **12** | V | 2026 rankings coverage, explicit |
| Maryland | 42 | **16** | V | UMD release, up three from #19 |
| Purdue | 46 | **16** | V | Purdue release (2025 edition; 2026 not re-confirmed) |
| Harvard | 3 | **16** | E | historically mid-teens in this peer survey |
| Yale | 4 | **20** | E | Ivy-class CS below Princeton and Cornell |
| Duke | 7 | **20** | E | peer to Yale in CS reputation |
| UNC | 26 | **30** | E | strong public, below UVA-class |
| Virginia | 26 | **33** | E | tied #29 in 2022 with UMass; UMass has since moved 29 → 35 |
| UC Irvine | 32 | **35** | E | mid-tier UC, above the #54 Riverside group |
| Ohio State | 41 | **40** | E | large public, outside PSU-class top-25 lists |
| Penn State | 59 | **40** | E | PSU's own release lists 14 top-25 programs; CS is not among them |
| Florida | 30 | **45** | E | flagship public below Maryland-class |
| Arizona State | 117 | **45** | E | large ABET program, appears on the ranked list |
| Rochester | 46 | **48** | E | small private with a research CS department |
| Indiana | 73 | **54** | V | named in the #54 tie group |
| Michigan State | 63 | **54** | V | named in the #54 tie group |
| Emory | 24 | **60** | E | small CS department at a non-STEM-forward private |
| Georgia | 46 | **62** | E | flagship public, below Florida |
| Tennessee | 102 | **75** | E | flagship public, weaker CS reputation |
| Auburn | 102 | **78** | E | ABET program, limited peer visibility |
| Iowa | 102 | **80** | E | ABET program, limited peer visibility |
| Temple | 102 | **88** | E | urban public, limited peer visibility |
| Boston College | 36 | **92** | E | small CS department |
| Villanova | 51 | **95** | E | small, teaching-focused CS department |

The #54 tie group also holds William & Mary, Tufts, Arizona, UC Riverside, Stony
Brook, RIT and Rutgers.

### 18c. Sensitivity of the estimates — measured

All 19 estimated ranks were perturbed by ±10 places, 200 draws:

| profile | top pick changed | avg list slots differing (of 12) |
|---|---|---|
| elite | 0% | 0.12 |
| danush | 0% | 0.53 |
| strong | 0% | 0.09 |
| good | 5% | 0.23 |
| average | 0% | 0.23 |
| below | 0% | 0.23 |

**The estimates barely matter.** The log map compresses hard past rank 30 — #40
versus #50 is 0.022 of quality — so a ±10 error moves less than one list slot in
twelve. The ranks that *would* matter are the top-15 ones, and those are the
verified ones. This is why open item #14 is genuinely low priority.

### 18d. Result of the CS run

Top picks: **Purdue** for the top three profiles, **Penn State** for the bottom
three. Two winners, monotone in student level.

Only **five of thirty** colleges are Pareto-undominated for the maxed profile, and
those five are the only ones that can ever be a top pick:

| college | CS rate | quality |
|---|---|---|
| CMU | 5.20% | 1.000 |
| Georgia Tech | 11.28% | 0.928 |
| Michigan | 16.40% | 0.815 |
| Purdue | 35.90% | 0.762 |
| Penn State | 55.33% | 0.631 |

A 5%-to-55% spread across quality 1.00 to 0.63 is the outcome the axis swap was
for. On the institutional axis the same investigation repeatedly produced a
three-school monopoly of the least selective decent school plus the most
prestigious one.

**⚠ PURDUE'S POSITION IS PARTLY AN ARTIFACT OF THE MISSING DATA.** Give the 18
class-F colleges their full overall rate — the most generous CS rate they could
possibly have — and the undominated set becomes CMU, Georgia Tech, Michigan, UC
San Diego, Maryland, Ohio State and ASU. **Purdue drops out entirely**, killed by
Maryland: identical CS rank (#16) and a 45% overall rate against Purdue's 35.9%.

Maryland does admit directly to CS and rates internal transfer as very difficult,
so its true rate is well below 45% — but the fitted 17.07% it currently carries is
almost certainly too harsh. **One number decides whether the headline result of
this whole pass is real.** That is open item #1.
