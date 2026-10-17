import { describe, it, expect } from "vitest";
import { profileKey, formatInsightDate } from "./insightStamp";

describe("profileKey", () => {
  it("ignores key order", () => {
    expect(profileKey({ gpa: 3.9, sat: 1500, prefs: { a: 1, b: 2 } })).toBe(
      profileKey({ prefs: { b: 2, a: 1 }, sat: 1500, gpa: 3.9 }),
    );
  });

  it("changes when a value changes", () => {
    expect(profileKey({ gpa: 3.9, sat: 1500 })).not.toBe(profileKey({ gpa: 3.9, sat: 1510 }));
  });

  it("changes when an activity is added", () => {
    const one = { activities: [{ description: "Robotics" }] };
    const two = { activities: [{ description: "Robotics" }, { description: "Debate" }] };
    expect(profileKey(one)).not.toBe(profileKey(two));
  });

  it("treats a missing field like an undefined one", () => {
    expect(profileKey({ gpa: 3.9 })).toBe(profileKey({ gpa: 3.9, sat: undefined }));
  });
});

describe("formatInsightDate", () => {
  it("formats an ISO date", () => {
    expect(formatInsightDate("2026-10-15T12:00:00.000Z")).toBe("Oct 15, 2026");
  });

  it("returns null for a missing or bad date", () => {
    expect(formatInsightDate(null)).toBeNull();
    expect(formatInsightDate("not a date")).toBeNull();
  });
});
