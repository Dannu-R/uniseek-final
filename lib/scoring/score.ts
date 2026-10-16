// Orchestration — thread one student through the whole pipeline, then rank a
// catalog and surface a balanced list.
//
//   academic_strength (§1–§9) → match_score (§10) → hard filters (§2 prefs)
//   → preference_fit (§3 prefs) → final_score → band → build_list (§10c quota)

import { floorsForAdmitRate } from "./tiers";
import { adjustedGpa, gpaX, gpaScore } from "./gpa";
import { rigorScore } from "./rigor";
import { testScore } from "./test";
import { rankScore } from "./rank";
import { ecScore, serviceScore, tierValueSum, type EcTier } from "./ec";
import { weightVector, academicStrength, type Factor } from "./weights";
import { admissionOdds, labelOf, type Band } from "./odds";
import { programQuality, qualityRank, majorQualityBar, type QualityBasis } from "./quality";
import { ambition, matchScore } from "./match";
import {
  majorOfferedFilter, netPriceFilter, distanceFilter, stateFilter,
  religiousFilter, applyHardFilters,
} from "./filters";
import { residencyFor, studentNetPrice, type NetPriceBasis } from "./price";
import { preferenceFit, finalScore } from "./preferences";
import type { StudentInput, CollegeInput, MajorRateClass } from "./types";
import type { RankingLists } from "./rankingLists";

export interface CollegeScore {
  collegeId: string;
  name: string;
  kept: boolean; // survived the hard filters
  band: Band;
  odds: number;
  quality: number;
  qualityRank: number; // the rank behind quality (§10b)
  qualityBasis: QualityBasis;
  ambition: number; // §10b — depends on the student only
  strength: number;
  matchScore: number;
  preferenceFit: number;
  finalScore: number;
  overallAdmitRate: number; // the college's overall published admit rate
  effectiveAdmitRate: number; // after the major offset (§6a) and residency (§15)
  netPrice: number | null; // the net price the budget filter used; null = unknown
  netPriceBasis: NetPriceBasis;
  usedFactors: Factor[];
  flags: string[]; // low-confidence / missing-data notes, plus the quality-rank basis ("quality rank N (basis)")
  filterNotes: string[]; // hard-filter missing-data notes (§2.3)
  removedBy: string[]; // filters this college FAILED (empty when kept)
}

// §6a label for each source class, shown in the result flags.
const CLASS_LABEL: Record<MajorRateClass, string> = {
  UNIVERSITY: "U", DERIVED: "D", PUBLISHED: "P", CONSENSUS: "C", ESTIMATE: "E", FITTED: "F",
};

type Residency = "in-state" | "out-of-state";

// UC campuses admit nonresidents at higher rates from a stronger, self-selected pool
// (nonresidents must "compare favorably" with admitted Californians), so their split
// reflects who applies, not an easier bar. Residency isn't applied there.
const isUC = (college: CollegeInput) => college.name.startsWith("University of California");

// §15: which admission pool the student competes in. Null when either state is unknown.
function residencyOf(student: StudentInput, college: CollegeInput): Residency | null {
  return isUC(college) ? null : residencyFor(student.homeState, college.state);
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

// The §6a base rate. A researched major rate wins; a college that admits to the
// university uses its overall rate for every major (a fact, class U); otherwise fall
// back to the overall rate, flagged low-confidence. `major` says the base is a major rate.
function baseAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; label?: string; flag?: string; major: boolean } {
  if (student.majorCip && college.majorProgram) {
    const p = college.majorProgram;
    if (p.admitRate != null) return { rate: p.admitRate, label: p.admitRateSourceClass ? CLASS_LABEL[p.admitRateSourceClass] : "?", major: true };
    if (p.admitRateSourceClass === "UNIVERSITY" || college.admissionUnit === "UNIVERSITY") {
      return { rate: college.admitRate, label: "U", major: false };
    }
    return { rate: college.admitRate, label: "fallback", flag: "major admit rate unresearched — using overall rate", major: false };
  }
  return { rate: college.admitRate, major: false };
}

// The effective admit rate for tier + odds: the §6a base, then residency (§15).
// A published by-residency major rate wins; else the college's split replaces the
// overall rate, or scales a major rate by split ÷ overall (spec D5); else keep the
// base, flagged. Published numbers only — no estimated splits.
function effectiveAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; label?: string; flags: string[] } {
  const base = baseAdmitRate(student, college);
  const flags = base.flag ? [base.flag] : [];
  const res = residencyOf(student, college);
  if (!res) return { rate: base.rate, label: base.label, flags };

  const cls = base.label ?? "overall";
  const inState = res === "in-state";
  const p = college.majorProgram;
  const majorSplit = base.major ? (inState ? p?.inStateAdmitRate : p?.outOfStateAdmitRate) : null;
  if (majorSplit != null) return { rate: majorSplit, label: `${cls}, ${res}`, flags };

  const split = inState ? college.inStateAdmitRate : college.outOfStateAdmitRate;
  if (split == null) {
    flags.push("residency split unknown — rate not residency-adjusted");
    return { rate: base.rate, label: `${cls}, residency n/a`, flags };
  }
  if (!base.major) return { rate: split, label: `${cls}, ${res}`, flags };
  return { rate: Math.min(1, round4((base.rate * split) / college.admitRate)), label: `${cls}, ${res} via ratio`, flags };
}

export function scoreCollege(student: StudentInput, college: CollegeInput, lists?: RankingLists): CollegeScore {
  const flags: string[] = [];
  const majorNamed = !!student.majorCip;

  const { rate, label, flags: rateFlags } = effectiveAdmitRate(student, college);
  flags.push(...rateFlags);
  if (label) flags.push(`effective admit rate ${rate} (${label})`);
  const floors = floorsForAdmitRate(rate);

  const adjGpa = adjustedGpa(student.gpaUnweighted, student.gpaGrade10, student.gpaGrade11, student.gpaGrade12);

  // Academic factors (each may drop to null → renormalise in §9).
  const rigor = rigorScore(student.apCoursesTaken, student.apCoursesOffered, adjGpa, floors);
  if (rigor.absent) flags.push("rigor dropped — no advanced courses offered");
  else if (rigor.lowConfidence) flags.push("rigor low-confidence — small or unknown catalog");

  const gpa = gpaScore(adjGpa, floors);

  const test = testScore(
    student.satSuperscore, student.actSuperscore, student.notSubmittingScores,
    college.satP25, college.satP75, college.testBlind,
  );

  const rank = rankScore(student.classRank, student.classSize, student.schoolDoesNotRank);

  const tiers = student.activities.map((a) => a.tier) as EcTier[];
  // §6c field prep: only when a major is named AND activities carry relevance labels
  // (currently unlabelled → suppressed, matching the doc's fixture behaviour).
  const relevant = student.activities.filter((a) => a.majorRelevant).map((a) => a.tier) as EcTier[];
  const majorRelevantPoints = majorNamed && relevant.length ? tierValueSum(relevant) : null;
  const ecValue = ecScore(tiers, majorRelevantPoints);
  const ecBaseValue = ecScore(tiers); // no field prep — used by the ambition reference

  const service = serviceScore(student.volunteerHoursPerYear);

  const weights = weightVector(college.c7, college.archetype);
  const { strength, usedFactors } = academicStrength(
    { rigor: rigor.score, gpa, test: test.score, rank: rank.score, ec: ecValue, service },
    weights,
  );

  // Recommendation layer (§10).
  const odds = admissionOdds(strength, rate);
  const band = labelOf(odds);
  const q = qualityRank({
    majorCip: student.majorCip,
    institutionalRank: college.usNewsRank,
    institutionalList: college.usNewsRankList,
    programRank: college.majorProgram?.programRank,
    fallbackProgramRank: college.fallbackProgramRank,
  }, lists);
  flags.push(`quality rank ${q.rank} (${q.basis})`);
  const quality = programQuality(q.rank);
  const amb = ambition(rigor.effectiveVolume, gpaX(adjGpa), ecBaseValue, service);
  const match = matchScore(odds, quality, amb);

  // Hard filters (§2 prefs).
  const np = studentNetPrice({
    incomeBand: student.incomeBand, bands: college.netPriceBands, average: college.netPriceAvg,
    residency: residencyFor(student.homeState, college.state), // cost has no UC exception
    tuitionInState: college.tuitionInState, tuitionOutOfState: college.tuitionOutOfState,
  });
  const netPrice = np.price;
  if (np.basis === "out-of-state estimate") flags.push(`net price ${np.price} (out-of-state estimate: published + ${np.premium} nonresident premium)`);
  if (np.basis === "in-state (premium unknown)") flags.push("out-of-state cost unknown — showing in-state net price");
  if (!student.homeState && np.premium) flags.push(`price shown is in-state; out-of-state costs $${np.premium} more`);
  const filters = {
    major: majorOfferedFilter(student.majorCip ?? null, college.offeredCips),
    price: netPriceFilter(student.budgetMaxNetPrice, netPrice),
    distance: distanceFilter(student.maxDistanceMiles, student.homeLat, student.homeLon, college.latitude, college.longitude),
    state: stateFilter(student.requiredState, college.state),
    religious: religiousFilter(student.religiousPreference, college.religiousAffiliation),
  };
  const hard = applyHardFilters(filters);
  const removedBy = Object.entries(filters).filter(([, r]) => !r.passes).map(([k]) => k);

  // Preference fit + final score (§3 prefs).
  const fit = preferenceFit(student.preferences, college.facts);
  if (fit.missingFactors.length) flags.push(`preference data missing: ${fit.missingFactors.join(", ")}`);
  const final = finalScore(match, fit.fit);

  return {
    collegeId: college.id,
    name: college.name,
    kept: hard.kept,
    band, odds, quality,
    qualityRank: q.rank, qualityBasis: q.basis, ambition: amb,
    strength,
    matchScore: match,
    preferenceFit: fit.fit,
    finalScore: final,
    overallAdmitRate: college.admitRate,
    effectiveAdmitRate: rate,
    netPrice,
    netPriceBasis: np.basis,
    usedFactors,
    flags,
    filterNotes: hard.notes,
    removedBy,
  };
}

export interface RankResult {
  list: CollegeScore[]; // the surfaced, band-balanced list (§10c)
  ranked: CollegeScore[]; // all kept colleges by final_score desc
  removed: CollegeScore[];
  empty: boolean;
  blockingFilter?: string; // §2.4 — the filter that removed the most, when nothing survives
  qualityBar?: number; // the worst program rank surfaced on a major run (spec); undefined = no bar
  shortBands: Band[]; // bands the bar left below quota
  barRelaxed?: boolean; // the bar would have emptied the list, so it was dropped
}

// §10c build_list quota — reach 3 / target 5 / safety 4. The quota is load-bearing
// (§10c): the ranking picks which school within each band. Selection + ordering use
// final_score (the preferences doc's final ranking), keeping the balanced shape.
// With a major-quality bar (`maxRank`), a program ranked worse than it can't fill a
// slot, so each quota becomes a maximum: a band that runs out stays short, never padded.
export function buildList(kept: CollegeScore[], nReach = 3, nTarget = 5, nSafety = 4, maxRank?: number): CollegeScore[] {
  const byFinal = (a: CollegeScore, b: CollegeScore) => b.finalScore - a.finalScore;
  const barred = (c: CollegeScore) =>
    maxRank != null && (c.qualityBasis === "program" || c.qualityBasis === "program-unranked") && c.qualityRank > maxRank;
  const inBand = (band: Band) => kept.filter((c) => c.band === band && !barred(c)).sort(byFinal);
  const reaches = inBand("reach").slice(0, nReach);
  const targets = inBand("target").slice(0, nTarget);
  const safeties = inBand("safety").slice(0, nSafety);
  return [...reaches, ...targets, ...safeties]; // reach → target → safety
}

export function rankColleges(student: StudentInput, colleges: CollegeInput[], lists?: RankingLists): RankResult {
  const scored = colleges.map((c) => scoreCollege(student, c, lists));
  const kept = scored.filter((s) => s.kept);
  const removed = scored.filter((s) => !s.kept);

  if (kept.length === 0) {
    // §2.4 — name the blocking filter (the one that removed the most), never relax.
    const counts: Record<string, number> = {};
    for (const s of removed) for (const f of s.removedBy) counts[f] = (counts[f] ?? 0) + 1;
    const blockingFilter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { list: [], ranked: [], removed, empty: true, blockingFilter, shortBands: [] };
  }

  const ranked = [...kept].sort((a, b) => b.finalScore - a.finalScore);
  // Major-quality bar (spec): on a major run with a collected ranking list, a program
  // below the student's bar can't fill a slot, and a band that runs out stays short.
  const majorRanked = !!student.majorCip && kept.some((s) => s.qualityBasis === "program" || s.qualityBasis === "program-unranked");
  let qualityBar = majorRanked ? majorQualityBar(kept[0].ambition) : undefined;
  let list = buildList(kept, 3, 5, 4, qualityBar);
  let barRelaxed: boolean | undefined;
  if (qualityBar != null && list.length === 0) {
    list = buildList(kept); // D5: never silently empty
    qualityBar = undefined;
    barRelaxed = true;
  }
  if (qualityBar != null) {
    for (const s of kept) {
      if ((s.qualityBasis === "program" || s.qualityBasis === "program-unranked") && s.qualityRank > qualityBar) {
        s.flags.push(`below major-quality bar (#${s.qualityRank} > #${Math.round(qualityBar)})`);
      }
    }
  }
  const QUOTA: Record<Band, number> = { reach: 3, target: 5, safety: 4 };
  const shortBands = qualityBar == null ? [] : (["reach", "target", "safety"] as Band[]).filter(
    (b) => list.filter((c) => c.band === b).length < Math.min(QUOTA[b], kept.filter((c) => c.band === b).length),
  );
  return { list, ranked, removed, empty: false, qualityBar, shortBands, barRelaxed };
}
