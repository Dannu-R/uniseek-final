// Input shapes the scoring engine consumes. DB-agnostic: the API route maps Prisma
// rows onto these. Rates are fractions 0..1.

import type { Archetype } from "./weights";
import type { EcTier } from "./ec";
import type { CollegeFacts, StudentPreferences } from "./preferences";
import type { IncomeBand, ReligiousPreference } from "./filters";

export interface StudentActivity {
  tier: EcTier; // assigned upstream (see OPEN_ITEMS #3)
  majorRelevant?: boolean; // for §6c field prep (currently unlabelled → suppressed)
}

export interface StudentInput {
  // Academics
  gpaUnweighted: number;
  gpaGrade10?: number | null;
  gpaGrade11?: number | null;
  gpaGrade12?: number | null;
  apCoursesTaken: number;
  apCoursesOffered: number | null; // null = "not sure"
  satSuperscore?: number | null;
  actSuperscore?: number | null;
  notSubmittingScores: boolean;
  classRank?: number | null;
  classSize?: number | null;
  schoolDoesNotRank: boolean;
  activities: StudentActivity[];
  volunteerHoursPerYear: number;

  // Goals
  majorCip?: string | null;
  homeState?: string | null;
  homeLat?: number | null;
  homeLon?: number | null;

  // Hard filters
  budgetMaxNetPrice: number;
  incomeBand?: IncomeBand | null;
  maxDistanceMiles?: number | null;
  requiredState?: string | null; // colleges must be in this state (null = anywhere)
  religiousPreference: ReligiousPreference;

  // Soft preferences
  preferences: StudentPreferences;
}

export interface CollegeMajorProgram {
  cipCode: string;
  admitRate?: number | null; // per-major (§6a); null when unresearched
  programRank?: number | null; // §18b
  directAdmit?: boolean | null;
}

export interface CollegeInput {
  id: string;
  name: string;

  // Admissions
  admitRate: number; // overall (fraction)
  usNewsRank: number;
  archetype?: Archetype | null;
  c7?: Partial<Record<"rigor" | "gpa" | "test" | "rank" | "ec" | "service", number | null>> | null;
  satP25?: number | null;
  satP75?: number | null;
  testBlind?: boolean | null;
  inStateAdmitRate?: number | null;
  outOfStateAdmitRate?: number | null;
  state?: string | null;

  // Geo
  latitude?: number | null;
  longitude?: number | null;

  // Major layer
  offeredCips: string[];
  majorProgram?: CollegeMajorProgram | null; // the program for the student's chosen major

  // Preference/filter facts
  facts: CollegeFacts;
  netPriceAvg?: number | null;
  netPriceBands: Partial<Record<IncomeBand, number | null>>;
  religiousAffiliation?: string | null;
}
