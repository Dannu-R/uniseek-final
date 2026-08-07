// §3 + §4 (student preferences) — soft factors and the final blend.
//
//   factor_score  = 1 − |college_value − target|      (directional / magnitude)
//   setting       = 1 if college matches any selection, else 0   (categorical)
//   preference_fit = Σ(weight · factor_score) / Σ(weight)
//   final_score   = match_score × (0.5 + 0.5 · preference_fit)
//
// direction is the stored 5-point choice 0..4 ON THE COLLEGE-VALUE SCALE (0 = low
// end, 4 = high end); target = direction / 4. The UI is responsible for orienting
// each factor's ends so 4 always means "high college_value" (§3.2).

import { clip, interpolate } from "./piecewise";

export type AthleticsTier =
  | "D1_FBS_POWER" | "D1_FBS_OTHER" | "D1_FCS" | "D1_NO_FOOTBALL" | "D2" | "D3" | "NAIA_OR_NONE";
export type Setting = "URBAN" | "SUBURBAN" | "RURAL";

const ATHLETICS_VALUE: Record<AthleticsTier, number> = {
  D1_FBS_POWER: 1.0, D1_FBS_OTHER: 0.83, D1_FCS: 0.67, D1_NO_FOOTBALL: 0.5, D2: 0.33, D3: 0.17, NAIA_OR_NONE: 0.0,
};

// §4.2 Carnegie size, interpolated within band via band-midpoint anchors so a 6,000
// college does not score identically to a 9,500 one. (Anchor placement is an
// interpretation of "interpolate within each band".)
const SIZE_ANCHORS: [number, number][] = [
  [500, 0.0], [2000, 0.25], [6500, 0.5], [15000, 0.75], [30000, 1.0],
];
export function schoolSizeValue(enrollment: number | null | undefined): number | null {
  return enrollment == null ? null : interpolate(enrollment, SIZE_ANCHORS);
}

// The college fields each soft factor reads (§4).
export interface CollegeFacts {
  enrollmentUndergrad?: number | null; // school_size
  classSizeUnder20Pct?: number | null; // class_size
  greekLife?: boolean | null; // greek_life
  housingOnCampusPct?: number | null; // housing
  athleticsTier?: AthleticsTier | null; // athletics
  setting?: Setting | null; // setting
  firstYearRetentionRate?: number | null; // academic_support
  meritAidPct?: number | null; // merit_aid
  studyAbroadRate?: number | null; // study_abroad
  coOp?: boolean | null; // co_op
}

// college_value on 0..1, or null when the underlying field is missing (that factor
// is then excluded from this college's preference average, not assumed).
export function collegeValue(factor: string, c: CollegeFacts): number | null {
  switch (factor) {
    case "schoolSize": return schoolSizeValue(c.enrollmentUndergrad);
    case "classSize": return c.classSizeUnder20Pct ?? null;
    case "greekLife": return c.greekLife == null ? null : c.greekLife ? 1 : 0;
    case "housing": return c.housingOnCampusPct ?? null;
    case "athletics": return c.athleticsTier == null ? null : ATHLETICS_VALUE[c.athleticsTier];
    case "academicSupport": return c.firstYearRetentionRate ?? null;
    case "meritAid": return c.meritAidPct ?? null;
    case "studyAbroad": return c.studyAbroadRate ?? null; // binary fallback handled upstream
    case "coOp": return c.coOp == null ? null : c.coOp ? 1 : 0;
    // §4.7 party_scene is CONSTRUCTED from greek + housing + athletics (equal weights, a guess).
    case "partyScene": {
      const g = c.greekLife == null ? null : c.greekLife ? 1 : 0;
      const h = c.housingOnCampusPct ?? null;
      const a = c.athleticsTier == null ? null : ATHLETICS_VALUE[c.athleticsTier];
      if (g == null || h == null || a == null) return null;
      return (g + h + a) / 3;
    }
    default: return null;
  }
}

// The directional / magnitude / categorical factor sets (§3.1).
export const DIRECTIONAL = ["schoolSize", "classSize", "greekLife", "housing", "athletics", "partyScene"] as const;
export const MAGNITUDE = ["academicSupport", "meritAid", "studyAbroad", "coOp"] as const;

export interface Preference {
  weight: number; // 0..4; 0 removes the factor
  direction?: number | null; // 0..4, directional factors only
}
export interface StudentPreferences {
  schoolSize?: Preference; classSize?: Preference; greekLife?: Preference; housing?: Preference;
  athletics?: Preference; partyScene?: Preference;
  academicSupport?: Preference; meritAid?: Preference; studyAbroad?: Preference; coOp?: Preference;
  setting?: { weight: number; selections: Setting[] };
}

// factor_score for one factor given the student's target and the college value.
export function factorScore(collegeVal: number, target: number): number {
  return 1 - Math.abs(collegeVal - target);
}

export interface PreferenceFitResult {
  fit: number; // 0..1; 1.00 when no weighted factors apply
  usedFactors: string[];
  missingFactors: string[]; // weighted but college data absent → excluded
}

// §3.4. Self-normalising weighted average; missing college values are excluded.
export function preferenceFit(prefs: StudentPreferences, c: CollegeFacts): PreferenceFitResult {
  let num = 0;
  let den = 0;
  const usedFactors: string[] = [];
  const missingFactors: string[] = [];

  // Directional + magnitude factors.
  for (const f of [...DIRECTIONAL, ...MAGNITUDE]) {
    const p = prefs[f as keyof StudentPreferences] as Preference | undefined;
    if (!p || p.weight <= 0) continue;
    const cv = collegeValue(f, c);
    if (cv == null) {
      missingFactors.push(f);
      continue;
    }
    // magnitude-only: target = 1.0 → factor_score = college_value.
    const target = (MAGNITUDE as readonly string[]).includes(f) ? 1.0 : clip((p.direction ?? 2) / 4, 0, 1);
    num += p.weight * factorScore(cv, target);
    den += p.weight;
    usedFactors.push(f);
  }

  // setting: categorical multi-select.
  if (prefs.setting && prefs.setting.weight > 0) {
    if (c.setting == null || prefs.setting.selections.length === 0) {
      missingFactors.push("setting");
    } else {
      const score = prefs.setting.selections.includes(c.setting) ? 1 : 0;
      num += prefs.setting.weight * score;
      den += prefs.setting.weight;
      usedFactors.push("setting");
    }
  }

  // All weights 0 (or all missing) → fit undefined → fall back to pure match_score.
  const fit = den === 0 ? 1.0 : num / den;
  return { fit, usedFactors, missingFactors };
}

// §3.5. Preference multiplies match_score in [0.5, 1.0] — it can reorder a shortlist
// but never resurrect a bad-odds match.
export function finalScore(matchScore: number, fit: number): number {
  return matchScore * (0.5 + 0.5 * fit);
}
