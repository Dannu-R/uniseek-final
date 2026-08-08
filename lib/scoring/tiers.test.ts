import { describe, it, expect } from "vitest";
import { piecewise } from "./piecewise";
import { tierForAdmitRate, TIER_FLOORS } from "./tiers";

describe("piecewise (§1)", () => {
  const f = TIER_FLOORS[3];

  it("pins the shared endpoints 0 and 1 (tier-invariant, §12 'flat top')", () => {
    expect(piecewise(0, TIER_FLOORS[1])).toBe(0);
    expect(piecewise(1, TIER_FLOORS[1])).toBeCloseTo(1, 10);
    expect(piecewise(0, TIER_FLOORS[6])).toBe(0);
    expect(piecewise(1, TIER_FLOORS[6])).toBeCloseTo(1, 10);
  });

  it("lands exactly on a floor at a 0.2 output step", () => {
    // At the lowest interior floor, output should be 0.2 (end of segment 0).
    const lowest = Math.min(...f);
    expect(piecewise(lowest, f)).toBeCloseTo(0.2, 10);
  });

  it("is monotonic increasing", () => {
    let prev = -1;
    for (let v = 0; v <= 1.0001; v += 0.05) {
      const s = piecewise(v, f);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe("tierForAdmitRate (§1)", () => {
  it("places the fixture colleges in the right tier", () => {
    expect(tierForAdmitRate(0.0365)).toBe(6); // Harvard
    expect(tierForAdmitRate(0.1274)).toBe(5); // Georgia Tech
    expect(tierForAdmitRate(0.266)).toBe(4); // UT Austin
    expect(tierForAdmitRate(0.33)).toBe(3); // Georgia
    expect(tierForAdmitRate(0.498)).toBe(2); // Purdue
    expect(tierForAdmitRate(0.884)).toBe(1); // ASU
  });

  it("uses lower-inclusive cutoffs at the boundaries", () => {
    expect(tierForAdmitRate(0.65)).toBe(1);
    expect(tierForAdmitRate(0.6499)).toBe(2);
    expect(tierForAdmitRate(0.12)).toBe(5);
    expect(tierForAdmitRate(0.1199)).toBe(6);
  });
});
