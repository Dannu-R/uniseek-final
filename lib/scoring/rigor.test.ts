import { describe, it, expect } from "vitest";
import { rigorVolume, rigorGpaMultiplier } from "./rigor";

describe("rigorVolume (§2a)", () => {
  // The exact worked numbers measured in §2a.
  it("returns 1.000 for 13-of-13", () => {
    expect(rigorVolume(13, 13)).toBeCloseTo(1.0, 4);
  });

  it("costs 0.026 for one unused offering: 13-of-14 -> 0.9737", () => {
    expect(rigorVolume(13, 14)).toBeCloseTo(0.9737, 4);
  });

  it("13-of-15 -> 0.9639 (catalog capped at 14, then ×0.99)", () => {
    expect(rigorVolume(13, 15)).toBeCloseTo(0.9639, 4);
  });

  it("is byte-identical above 14 offered: 14-of-15 == 14-of-18 == 0.990", () => {
    const a = rigorVolume(14, 15)!;
    const b = rigorVolume(14, 18)!;
    expect(a).toBeCloseTo(0.99, 4);
    expect(a).toBe(b);
  });

  it("saturates the absolute component only slowly: 5-of-5 -> 0.847", () => {
    expect(rigorVolume(5, 5)).toBeCloseTo(0.847, 3);
  });

  it("is ABSENT (null) when offered === 0", () => {
    expect(rigorVolume(8, 0)).toBeNull();
  });
});

describe("rigorGpaMultiplier (§2b)", () => {
  it("hits both hand-set endpoints", () => {
    expect(rigorGpaMultiplier(3.7)).toBe(1.0);
    expect(rigorGpaMultiplier(4.0)).toBe(1.0);
    expect(rigorGpaMultiplier(3.3)).toBe(0.7);
    expect(rigorGpaMultiplier(2.0)).toBe(0.7);
  });

  it("steps by 0.0429 per band at the lower edge", () => {
    expect(rigorGpaMultiplier(3.6429)).toBeCloseTo(0.9571, 4);
    expect(rigorGpaMultiplier(3.3571)).toBeCloseTo(0.7429, 4);
  });

  it("takes the lower-edge value within a band", () => {
    // 3.68 sits in the [3.6429, 3.70) band -> 0.9571, not 1.0
    expect(rigorGpaMultiplier(3.68)).toBeCloseTo(0.9571, 4);
  });
});
