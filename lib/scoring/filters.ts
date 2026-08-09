// §2 (student preferences) — hard filters.
//
// All AND. A college must pass every filter the student set. CRITICAL RULE (§2.3):
// missing college data NEVER drops a college — it passes the filter and is flagged
// (a plain visible note; the confidence system is deferred). Only a college with
// DATA that fails is removed.

export type IncomeBand = "LT_30K" | "B30_48K" | "B48_75K" | "B75_110K" | "GT_110K";
export type ReligiousPreference = "REQUIRE" | "EXCLUDE" | "NO_PREFERENCE";

export interface FilterResult {
  passes: boolean;
  missing: boolean; // data gap → kept + flagged
  note?: string;
}

const pass: FilterResult = { passes: true, missing: false };

// Great-circle distance in miles.
export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Pick the net-price column: the income-band figure if given, else the college-wide
// average (§2.2).
export function selectNetPrice(
  incomeBand: IncomeBand | null | undefined,
  bands: Partial<Record<IncomeBand, number | null>>,
  average: number | null | undefined,
): number | null {
  if (incomeBand && bands[incomeBand] != null) return bands[incomeBand]!;
  return average ?? null;
}

// major_offered runs automatically off the (already collected) major. Inactive when
// no major is named.
export function majorOfferedFilter(majorCip: string | null, offeredCips: string[] | null): FilterResult {
  if (!majorCip) return pass; // no major → filter inactive
  if (offeredCips == null) return { passes: true, missing: true, note: "program data unavailable" };
  return { passes: offeredCips.includes(majorCip), missing: false };
}

// budget is required; net price must be <= budget.
export function netPriceFilter(budget: number, netPrice: number | null): FilterResult {
  if (netPrice == null) return { passes: true, missing: true, note: "cost data unavailable" };
  return { passes: netPrice <= budget, missing: false };
}

// Inactive when maxMiles is unset. Universal coverage, but guard missing geo anyway.
export function distanceFilter(
  maxMiles: number | null | undefined,
  homeLat: number | null | undefined,
  homeLon: number | null | undefined,
  collegeLat: number | null | undefined,
  collegeLon: number | null | undefined,
): FilterResult {
  if (maxMiles == null) return pass;
  if (homeLat == null || homeLon == null || collegeLat == null || collegeLon == null) {
    return { passes: true, missing: true, note: "location data unavailable" };
  }
  return { passes: haversineMiles(homeLat, homeLon, collegeLat, collegeLon) <= maxMiles, missing: false };
}

// Restricts the list to a single state. `requiredState` is already resolved by the
// caller — "in-state only" is just the home state — so null means inactive.
export function stateFilter(
  requiredState: string | null | undefined,
  collegeState: string | null | undefined,
): FilterResult {
  if (!requiredState) return pass;
  if (!collegeState) return { passes: true, missing: true, note: "state data unavailable" };
  return { passes: requiredState === collegeState, missing: false };
}

// null affiliation is treated as secular (§4 notes none/unreported can look alike).
export function religiousFilter(
  pref: ReligiousPreference,
  affiliation: string | null | undefined,
): FilterResult {
  if (pref === "NO_PREFERENCE") return pass;
  const isReligious = affiliation != null;
  return { passes: pref === "REQUIRE" ? isReligious : !isReligious, missing: false };
}

export interface HardFilterOutcome {
  kept: boolean;
  results: Record<string, FilterResult>;
  notes: string[]; // missing-data notes to surface in the UI
}

// Combine all five. Kept = passes every filter (missing counts as pass, §2.3).
export function applyHardFilters(filters: Record<string, FilterResult>): HardFilterOutcome {
  const notes: string[] = [];
  let kept = true;
  for (const r of Object.values(filters)) {
    if (!r.passes) kept = false;
    if (r.missing && r.note) notes.push(r.note);
  }
  return { kept, results: filters, notes };
}
