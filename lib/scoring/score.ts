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
import { programQuality, qualityRank } from "./quality";
import { ambition, matchScore } from "./match";
import {
  majorOfferedFilter, netPriceFilter, distanceFilter, inStateFilter,
  religiousFilter, selectNetPrice, applyHardFilters,
} from "./filters";
import { preferenceFit, finalScore } from "./preferences";
import type { StudentInput, CollegeInput } from "./types";

export interface CollegeScore {
  collegeId: string;
  name: string;
  kept: boolean; // survived the hard filters
  band: Band;
  odds: number;
  quality: number;
  strength: number;
  matchScore: number;
  preferenceFit: number;
  finalScore: number;
  effectiveAdmitRate: number; // after the major offset (§6a)
  usedFactors: Factor[];
  flags: string[]; // low-confidence / missing-data notes
  filterNotes: string[]; // hard-filter missing-data notes (§2.3)
  removedBy: string[]; // filters this college FAILED (empty when kept)
}

// The effective admit rate for tier + odds (§6a major offset). Residency (§15) is
// deferred (see OPEN_ITEMS). Falls back to the overall rate when the major rate is
// unresearched (the §18d "most generous" fallback), flagged low-confidence.
function effectiveAdmitRate(student: StudentInput, college: CollegeInput): { rate: number; flag?: string } {
  if (student.majorCip && college.majorProgram) {
    const mr = college.majorProgram.admitRate;
    if (mr != null) return { rate: mr };
    return { rate: college.admitRate, flag: "major admit rate unresearched — using overall rate" };
  }
  return { rate: college.admitRate };
}

export function scoreCollege(student: StudentInput, college: CollegeInput): CollegeScore {
  const flags: string[] = [];
  const majorNamed = !!student.majorCip;

  const { rate, flag } = effectiveAdmitRate(student, college);
  if (flag) flags.push(flag);
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
  const rankForQuality = qualityRank(college.usNewsRank, college.majorProgram?.programRank, majorNamed);
  const quality = programQuality(rankForQuality);
  const amb = ambition(rigor.effectiveVolume, gpaX(adjGpa), ecBaseValue, service);
  const match = matchScore(odds, quality, amb);

  // Hard filters (§2 prefs).
  const netPrice = selectNetPrice(student.incomeBand, college.netPriceBands, college.netPriceAvg);
  const filters = {
    major: majorOfferedFilter(student.majorCip ?? null, college.offeredCips),
    price: netPriceFilter(student.budgetMaxNetPrice, netPrice),
    distance: distanceFilter(student.maxDistanceMiles, student.homeLat, student.homeLon, college.latitude, college.longitude),
    inState: inStateFilter(student.inStateOnly, student.homeState, college.state),
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
    band, odds, quality, strength,
    matchScore: match,
    preferenceFit: fit.fit,
    finalScore: final,
    effectiveAdmitRate: rate,
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
}

// §10c build_list quota — reach 3 / target 5 / safety 4. The quota is load-bearing
// (§10c): the ranking picks which school within each band. Selection + ordering use
// final_score (the preferences doc's final ranking), keeping the balanced shape.
export function buildList(kept: CollegeScore[], nReach = 3, nTarget = 5, nSafety = 4): CollegeScore[] {
  const byFinal = (a: CollegeScore, b: CollegeScore) => b.finalScore - a.finalScore;
  const inBand = (band: Band) => kept.filter((c) => c.band === band).sort(byFinal);
  const reaches = inBand("reach").slice(0, nReach);
  const targets = inBand("target").slice(0, nTarget);
  const safeties = inBand("safety").slice(0, nSafety);
  return [...reaches, ...targets, ...safeties]; // reach → target → safety
}

export function rankColleges(student: StudentInput, colleges: CollegeInput[]): RankResult {
  const scored = colleges.map((c) => scoreCollege(student, c));
  const kept = scored.filter((s) => s.kept);
  const removed = scored.filter((s) => !s.kept);

  if (kept.length === 0) {
    // §2.4 — name the blocking filter (the one that removed the most), never relax.
    const counts: Record<string, number> = {};
    for (const s of removed) for (const f of s.removedBy) counts[f] = (counts[f] ?? 0) + 1;
    const blockingFilter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { list: [], ranked: [], removed, empty: true, blockingFilter };
  }

  const ranked = [...kept].sort((a, b) => b.finalScore - a.finalScore);
  return { list: buildList(kept), ranked, removed, empty: false };
}
