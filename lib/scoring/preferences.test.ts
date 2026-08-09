import { describe, it, expect } from "vitest";
import {
  haversineMiles, selectNetPrice, majorOfferedFilter, netPriceFilter,
  distanceFilter, stateFilter, religiousFilter, applyHardFilters,
} from "./filters";
import {
  collegeValue, schoolSizeValue, factorScore, preferenceFit, finalScore,
  type CollegeFacts, type StudentPreferences,
} from "./preferences";

describe("hard filters (§2)", () => {
  it("major_offered: inactive without a major, else membership; missing => keep+flag", () => {
    expect(majorOfferedFilter(null, ["11.0701"]).passes).toBe(true);
    expect(majorOfferedFilter("11.0701", ["11.0701", "26.0101"]).passes).toBe(true);
    expect(majorOfferedFilter("14.1901", ["11.0701"]).passes).toBe(false); // not offered -> removed
    expect(majorOfferedFilter("11.0701", null)).toMatchObject({ passes: true, missing: true });
  });

  it("net_price: <= budget; missing data keeps the college (§2.3)", () => {
    expect(netPriceFilter(20000, 15000).passes).toBe(true);
    expect(netPriceFilter(20000, 25000).passes).toBe(false);
    expect(netPriceFilter(20000, null)).toMatchObject({ passes: true, missing: true, note: "cost data unavailable" });
  });

  it("selectNetPrice picks the income-band column, else the average", () => {
    const bands = { LT_30K: 8000, GT_110K: 30000 } as const;
    expect(selectNetPrice("LT_30K", bands, 18000)).toBe(8000);
    expect(selectNetPrice(null, bands, 18000)).toBe(18000);
    expect(selectNetPrice("B48_75K", bands, 18000)).toBe(18000); // band missing -> average
  });

  it("distance: great-circle <= max; inactive when unset", () => {
    expect(distanceFilter(null, 40, -80, 34, -118).passes).toBe(true); // inactive
    // Chicago (41.88,-87.63) -> Champaign (40.10,-88.23) ~ 125 mi
    const d = haversineMiles(41.88, -87.63, 40.1, -88.23);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(140);
    expect(distanceFilter(200, 41.88, -87.63, 40.1, -88.23).passes).toBe(true);
    expect(distanceFilter(50, 41.88, -87.63, 40.1, -88.23).passes).toBe(false);
  });

  it("state: inactive unless a state is required; then it must match", () => {
    expect(stateFilter(null, "CA").passes).toBe(true); // inactive
    expect(stateFilter("IL", "IL").passes).toBe(true);
    expect(stateFilter("IL", "CA").passes).toBe(false);
    expect(stateFilter("IL", null).missing).toBe(true); // missing data keeps the college
  });

  it("religious: require/exclude/no-preference (null affiliation = secular)", () => {
    expect(religiousFilter("NO_PREFERENCE", "Catholic").passes).toBe(true);
    expect(religiousFilter("REQUIRE", "Roman Catholic (Jesuit)").passes).toBe(true);
    expect(religiousFilter("REQUIRE", null).passes).toBe(false);
    expect(religiousFilter("EXCLUDE", null).passes).toBe(true);
    expect(religiousFilter("EXCLUDE", "Catholic").passes).toBe(false);
  });

  it("AND combiner: kept only if all pass; missing notes collected", () => {
    const out = applyHardFilters({
      major: majorOfferedFilter("11.0701", ["11.0701"]),
      price: netPriceFilter(20000, null), // missing -> keeps + note
      distance: distanceFilter(null, null, null, null, null),
    });
    expect(out.kept).toBe(true);
    expect(out.notes).toContain("cost data unavailable");

    const removed = applyHardFilters({
      price: netPriceFilter(10000, 25000), // fails
    });
    expect(removed.kept).toBe(false);
  });
});

describe("college values (§4)", () => {
  it("school_size interpolates within band (6k < 9.5k)", () => {
    expect(schoolSizeValue(6000)!).toBeLessThan(schoolSizeValue(9500)!);
    expect(schoolSizeValue(30000)).toBeCloseTo(1.0, 4);
    expect(schoolSizeValue(null)).toBeNull();
  });

  it("athletics tier maps to its published value; missing => null", () => {
    expect(collegeValue("athletics", { athleticsTier: "D1_FBS_POWER" })).toBeCloseTo(1.0, 4);
    expect(collegeValue("athletics", { athleticsTier: "D3" })).toBeCloseTo(0.17, 4);
    expect(collegeValue("athletics", {})).toBeNull();
  });

  it("party_scene is the mean of greek + housing + athletics (§4.7)", () => {
    const c: CollegeFacts = { greekLife: true, housingOnCampusPct: 0.6, athleticsTier: "D1_FBS_POWER" };
    expect(collegeValue("partyScene", c)).toBeCloseTo((1 + 0.6 + 1) / 3, 6);
  });
});

describe("preference_fit + final_score (§3)", () => {
  it("factor_score is linear distance to target", () => {
    expect(factorScore(0.5, 0.5)).toBe(1);
    expect(factorScore(1.0, 0.5)).toBe(0.5);
    expect(factorScore(0.0, 1.0)).toBe(0);
  });

  it("self-normalises over weighted factors", () => {
    const prefs: StudentPreferences = {
      classSize: { weight: 4, direction: 4 }, // wants high %-under-20
      meritAid: { weight: 2 }, // magnitude
    };
    const c: CollegeFacts = { classSizeUnder20Pct: 0.75, meritAidPct: 0.5 };
    // classSize: 1-|0.75-1| = 0.75 (w4); meritAid: 0.5 (w2) -> (4*.75+2*.5)/6 = 4/6
    expect(preferenceFit(prefs, c).fit).toBeCloseTo(4 / 6, 6);
  });

  it("excludes factors whose college value is missing", () => {
    const prefs: StudentPreferences = { coOp: { weight: 3 }, classSize: { weight: 1, direction: 4 } };
    const c: CollegeFacts = { classSizeUnder20Pct: 0.8 }; // coOp missing
    const r = preferenceFit(prefs, c);
    expect(r.missingFactors).toContain("coOp");
    expect(r.usedFactors).toEqual(["classSize"]);
    expect(r.fit).toBeCloseTo(1 - Math.abs(0.8 - 1.0), 6);
  });

  it("all weights 0 => fit 1.00 => pure match_score", () => {
    expect(preferenceFit({}, {}).fit).toBe(1.0);
    expect(finalScore(0.42, 1.0)).toBeCloseTo(0.42, 6);
  });

  it("final_score multiplies in [0.5, 1.0]", () => {
    expect(finalScore(0.8, 1.0)).toBeCloseTo(0.8, 6);
    expect(finalScore(0.8, 0.0)).toBeCloseTo(0.4, 6);
    expect(finalScore(0.8, 0.5)).toBeCloseTo(0.8 * 0.75, 6);
  });

  it("setting is categorical multi-select", () => {
    const prefs: StudentPreferences = { setting: { weight: 2, selections: ["URBAN", "SUBURBAN"] } };
    expect(preferenceFit(prefs, { setting: "URBAN" }).fit).toBe(1);
    expect(preferenceFit(prefs, { setting: "RURAL" }).fit).toBe(0);
  });
});
