// Wizard data model — the client-side (anonymous-first) intake state. Numeric
// inputs are held as strings while typing; toPayload.ts converts to StudentInput.

export type FactorKey =
  | "schoolSize" | "classSize" | "greekLife" | "housing" | "athletics" | "partyScene"
  | "academicSupport" | "meritAid" | "studyAbroad" | "coOp";

export type SettingValue = "URBAN" | "SUBURBAN" | "RURAL";

// Text-only for now. Each activity is scored at a neutral default EC tier until a
// text→tier method is chosen (see lib/scoring/OPEN_ITEMS.md #3).
export interface ActivityEntry {
  description: string;
}

export const DEFAULT_EC_TIER = 2;

export interface WizardData {
  // Academics
  gpaUnweighted: string;
  gpaGrade10: string;
  gpaGrade11: string;
  gpaGrade12: string;
  apCoursesTaken: string;
  apCoursesOffered: string;
  apOfferedUnsure: boolean;
  satSuperscore: string;
  actSuperscore: string;
  notSubmittingScores: boolean;
  classRank: string;
  classSize: string;
  schoolDoesNotRank: boolean;
  activities: ActivityEntry[];
  volunteerHoursPerYear: string;

  // Goals
  majorCip: string; // "" = undecided
  homeState: string;
  homeZip: string;

  // Hard filters
  budgetMaxNetPrice: string;
  incomeBand: string; // "" = not given
  maxDistanceMiles: string;
  inStateOnly: boolean;
  religiousPreference: "REQUIRE" | "EXCLUDE" | "NO_PREFERENCE";

  // Soft preferences
  prefs: Record<FactorKey, { weight: number; direction: number }>;
  setting: { weight: number; selections: SettingValue[] };
}

// Direction poles are oriented to the college-value scale: the HIGH end (4) always
// means a high college_value, so target = direction/4 works directly (§3.2).
export const FACTORS: {
  key: FactorKey;
  label: string;
  kind: "directional" | "magnitude";
  low?: string;
  high?: string;
  hint?: string;
}[] = [
  { key: "schoolSize", label: "School size", kind: "directional", low: "Small", high: "Large" },
  { key: "classSize", label: "Class size", kind: "directional", low: "Big lectures", high: "Small classes" },
  { key: "greekLife", label: "Greek life", kind: "directional", low: "Avoid", high: "Want it" },
  { key: "housing", label: "Campus housing", kind: "directional", low: "Commuter", high: "Residential" },
  { key: "athletics", label: "Big-time athletics", kind: "directional", low: "Doesn't matter", high: "Big-time sports" },
  { key: "partyScene", label: "Party scene", kind: "directional", low: "Avoid", high: "Want it" },
  { key: "academicSupport", label: "Academic support", kind: "magnitude", hint: "Strong advising & first-year retention" },
  { key: "meritAid", label: "Merit aid", kind: "magnitude", hint: "Non-need scholarships" },
  { key: "studyAbroad", label: "Study abroad", kind: "magnitude", hint: "Study-abroad participation" },
  { key: "coOp", label: "Co-op programs", kind: "magnitude", hint: "Paid work placements" },
];

export const WEIGHT_LABELS = ["Not at all", "A little", "Somewhat", "A lot", "Deal-breaker"];

export const INCOME_BANDS: { value: string; label: string }[] = [
  { value: "", label: "Prefer not to say" },
  { value: "LT_30K", label: "Under $30,000" },
  { value: "B30_48K", label: "$30,000 – $48,000" },
  { value: "B48_75K", label: "$48,000 – $75,000" },
  { value: "B75_110K", label: "$75,000 – $110,000" },
  { value: "GT_110K", label: "Over $110,000" },
];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY",
  "LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const emptyPrefs = () =>
  FACTORS.reduce(
    (acc, f) => ({ ...acc, [f.key]: { weight: 0, direction: 2 } }),
    {} as WizardData["prefs"],
  );

export const DEFAULT_DATA: WizardData = {
  gpaUnweighted: "",
  gpaGrade10: "",
  gpaGrade11: "",
  gpaGrade12: "",
  apCoursesTaken: "",
  apCoursesOffered: "",
  apOfferedUnsure: false,
  satSuperscore: "",
  actSuperscore: "",
  notSubmittingScores: false,
  classRank: "",
  classSize: "",
  schoolDoesNotRank: false,
  activities: [],
  volunteerHoursPerYear: "",
  majorCip: "",
  homeState: "",
  homeZip: "",
  budgetMaxNetPrice: "",
  incomeBand: "",
  maxDistanceMiles: "",
  inStateOnly: false,
  religiousPreference: "NO_PREFERENCE",
  prefs: emptyPrefs(),
  setting: { weight: 0, selections: [] },
};

export const STEPS = ["Academics", "Goals", "Filters", "Preferences"] as const;
