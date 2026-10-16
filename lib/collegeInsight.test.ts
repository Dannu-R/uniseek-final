import { describe, it, expect } from "vitest";
import { notListedBlock } from "./collegeInsight";

describe("notListedBlock", () => {
  it("adds nothing for a college on the list", () => {
    expect(notListedBlock(null)).toBe("");
    expect(notListedBlock([])).toBe("");
  });

  it("puts the reasons in and shifts the briefing toward why it isn't on the list", () => {
    const block = notListedBlock(["It would cost you about $65,210 a year as an out-of-state student. That is over your $55,000 budget."]);
    expect(block).toContain("NOT ON THE STUDENT'S LIST");
    expect(block).toContain("- It would cost you about $65,210 a year");
    expect(block).toContain('"whyFits" and "studentLife": ONE short sentence per point');
    expect(block).toContain('"thingsToConsider": the main section');
  });
});
