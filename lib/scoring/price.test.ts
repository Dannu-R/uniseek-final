import { describe, it, expect } from "vitest";
import { residencyFor, studentNetPrice } from "./price";

const pub = { bands: { B75_110K: 20000 }, average: 18000, tuitionInState: 12000, tuitionOutOfState: 40000 };

describe("residencyFor", () => {
  it("compares two-letter states", () => {
    expect(residencyFor("TX", "TX")).toBe("in-state");
    expect(residencyFor("TX", "FL")).toBe("out-of-state");
    expect(residencyFor(null, "FL")).toBeNull();
    expect(residencyFor("TX", null)).toBeNull();
  });
});

describe("studentNetPrice (out-of-state cost spec)", () => {
  it("uses the published band price in state", () => {
    expect(studentNetPrice({ ...pub, incomeBand: "B75_110K", residency: "in-state" })).toEqual({ price: 20000, basis: "published", premium: 28000 });
  });
  it("adds the nonresident premium out of state", () => {
    expect(studentNetPrice({ ...pub, incomeBand: "B75_110K", residency: "out-of-state" })).toEqual({ price: 48000, basis: "out-of-state estimate", premium: 28000 });
  });
  it("leaves a single-tuition (private) college unchanged", () => {
    const r = studentNetPrice({ bands: {}, average: 30000, tuitionInState: 60000, tuitionOutOfState: 60000, residency: "out-of-state" });
    expect(r).toEqual({ price: 30000, basis: "published", premium: 0 });
  });
  it("keeps the published price, flagged, when tuition is unknown", () => {
    const r = studentNetPrice({ bands: {}, average: 18000, residency: "out-of-state" });
    expect(r).toEqual({ price: 18000, basis: "in-state (premium unknown)", premium: null });
  });
  it("reports the premium but doesn't apply it with no home state", () => {
    expect(studentNetPrice({ ...pub, residency: null })).toEqual({ price: 18000, basis: "published", premium: 28000 });
  });
  it("falls back to the average without an income band", () => {
    expect(studentNetPrice({ ...pub, residency: "out-of-state" }).price).toBe(46000);
  });
  it("returns null price when nothing is published", () => {
    expect(studentNetPrice({ bands: {}, average: null, residency: "out-of-state", tuitionInState: 1, tuitionOutOfState: 2 }).price).toBeNull();
  });
  it("picks the income-band column, else the average", () => {
    const bands = { LT_30K: 8000, GT_110K: 30000 } as const;
    expect(studentNetPrice({ incomeBand: "LT_30K", bands, average: 18000, residency: null }).price).toBe(8000);
    expect(studentNetPrice({ incomeBand: null, bands, average: 18000, residency: null }).price).toBe(18000);
    expect(studentNetPrice({ incomeBand: "B48_75K", bands, average: 18000, residency: null }).price).toBe(18000); // band missing -> average
  });
});
