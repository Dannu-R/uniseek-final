import { describe, it, expect } from "vitest";
import { gpaX, trendPenaltyFires, adjustedGpa } from "./gpa";

describe("gpaX (§3)", () => {
  it("maps the anchor points", () => {
    expect(gpaX(2.0)).toBeCloseTo(0, 10);
    expect(gpaX(3.0)).toBeCloseTo(0.5, 10);
    expect(gpaX(3.5)).toBeCloseTo(0.75, 10);
    expect(gpaX(4.0)).toBeCloseTo(1.0, 10);
  });

  it("clamps below the 2.00 floor", () => {
    expect(gpaX(1.5)).toBe(0);
  });
});

describe("trendPenaltyFires (§4)", () => {
  it("fires on a clear senior slump", () => {
    // min(3.9,3.9)-3.5 = 0.4 > 0.07*3.5 = 0.245
    expect(trendPenaltyFires(3.9, 3.9, 3.5)).toBe(true);
  });

  it("does not fire when grade 12 is not the lowest", () => {
    expect(trendPenaltyFires(3.5, 3.6, 3.7)).toBe(false);
  });

  it("does not fire on a drop under the 7% threshold", () => {
    // min(3.9,3.8)-3.7 = 0.1 < 0.07*3.7 = 0.259
    expect(trendPenaltyFires(3.9, 3.8, 3.7)).toBe(false);
  });

  it("cannot fire at or above a 3.738 senior GPA (§4)", () => {
    expect(trendPenaltyFires(4.0, 4.0, 3.74)).toBe(false);
  });

  it("cannot fire when a yearly GPA is missing (optional inputs)", () => {
    expect(trendPenaltyFires(3.9, undefined, 3.5)).toBe(false);
    expect(trendPenaltyFires(3.9, 3.9, null)).toBe(false);
  });
});

describe("adjustedGpa (§4)", () => {
  it("docks 0.075 when the penalty fires", () => {
    expect(adjustedGpa(3.6, 3.9, 3.9, 3.5)).toBeCloseTo(3.525, 10);
  });

  it("passes the GPA through untouched otherwise", () => {
    expect(adjustedGpa(3.8, 3.7, 3.75, 3.8)).toBe(3.8);
    expect(adjustedGpa(3.9)).toBe(3.9);
  });
});
