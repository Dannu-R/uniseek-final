// Map the wizard's UI state onto the /api/score request body (StudentInput shape).

import { FACTORS, type WizardData } from "./model";

// The state hard filter, collapsed to the single state a college must be in
// (null = no restriction). "In-state only" just means the home state.
export function requiredState(d: WizardData): string | null {
  if (d.stateFilterMode === "IN_STATE") return d.homeState || null;
  if (d.stateFilterMode === "SPECIFIC") return d.goalState || null;
  return null;
}

function num(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface PayloadIssue {
  field: string;
  message: string;
}

// Client-side required-field check before we bother the API.
export function validate(d: WizardData): PayloadIssue[] {
  const issues: PayloadIssue[] = [];
  if (num(d.gpaUnweighted) == null) issues.push({ field: "GPA", message: "Enter your GPA in the Academics step." });
  if (num(d.apCoursesTaken) == null) issues.push({ field: "AP courses", message: "Enter your AP course count in the Academics step." });
  if (num(d.budgetMaxNetPrice) == null) issues.push({ field: "Budget", message: "Enter a yearly budget in the Filters step." });
  if (d.stateFilterMode === "SPECIFIC" && !d.goalState)
    issues.push({ field: "State", message: "Pick the state you want to study in, in the Filters step." });
  if (d.stateFilterMode === "IN_STATE" && !d.homeState)
    issues.push({ field: "State", message: "Set your home state in the Goals step to filter to in-state colleges." });
  return issues;
}

export function toPayload(d: WizardData) {
  const preferences: Record<string, unknown> = {};
  for (const f of FACTORS) {
    const p = d.prefs[f.key];
    if (p && p.weight > 0) {
      preferences[f.key] = f.kind === "directional" ? { weight: p.weight, direction: p.direction } : { weight: p.weight };
    }
  }
  if (d.setting.weight > 0 && d.setting.selections.length > 0) {
    preferences.setting = { weight: d.setting.weight, selections: d.setting.selections };
  }

  return {
    gpaUnweighted: num(d.gpaUnweighted) ?? 0,
    gpaGrade10: num(d.gpaGrade10),
    gpaGrade11: num(d.gpaGrade11),
    gpaGrade12: num(d.gpaGrade12),
    apCoursesTaken: num(d.apCoursesTaken) ?? 0,
    apCoursesOffered: d.apOfferedUnsure ? null : num(d.apCoursesOffered), // null = "not sure"
    satSuperscore: d.notSubmittingScores ? null : num(d.satSuperscore),
    actSuperscore: d.notSubmittingScores ? null : num(d.actSuperscore),
    notSubmittingScores: d.notSubmittingScores,
    classRank: d.schoolDoesNotRank ? null : num(d.classRank),
    classSize: d.schoolDoesNotRank ? null : num(d.classSize),
    schoolDoesNotRank: d.schoolDoesNotRank,
    // Send the raw text; the server infers each activity's tier via the AI classifier.
    activities: d.activities
      .filter((a) => a.description.trim() !== "")
      .map((a) => ({ description: a.description.trim() })),
    volunteerHoursPerYear: num(d.volunteerHoursPerYear) ?? 0,
    majorCip: d.majorCip || null,
    homeState: d.homeState || null,
    budgetMaxNetPrice: num(d.budgetMaxNetPrice) ?? 0,
    incomeBand: d.incomeBand || null,
    maxDistanceMiles: num(d.maxDistanceMiles),
    requiredState: requiredState(d),
    religiousPreference: d.religiousPreference,
    preferences,
  };
}
