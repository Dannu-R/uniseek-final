import { describe, it, expect } from "vitest";
import { whyNotListed, type ScoredCollege } from "./whyNotListed";

const listed = (id: string, o: Partial<ScoredCollege> = {}): ScoredCollege =>
  ({ collegeId: id, band: "target", odds: 0.55, quality: 0.8, preferenceFit: 0.6, finalScore: 0.5, ...o });

describe("whyNotListed", () => {
  const list = [listed("a"), listed("b"), listed("c", { band: "safety" })];

  it("returns null for a college on the list", () => {
    expect(whyNotListed(listed("a"), list, 55000)).toBeNull();
  });

  it("explains a hard filter, with the out-of-state price", () => {
    const r = whyNotListed({ collegeId: "x", band: "target", removedBy: ["price"], netPrice: 65210, netPriceBasis: "out-of-state estimate" }, list, 55000);
    expect(r).toEqual(["It would cost you about $65,210 a year as an out-of-state student. That is over your $55,000 budget."]);
  });

  it("explains the major-quality bar", () => {
    const r = whyNotListed({ collegeId: "x", band: "target", flags: ["below major-quality bar (#141 > #50)"] }, list, 55000);
    expect(r).toEqual(["Its program for your major is ranked #141. For a student with your profile, the list only includes programs ranked #50 or better."]);
  });

  it("says an unranked program isn't ranked rather than quoting the placeholder rank", () => {
    const r = whyNotListed({ collegeId: "x", band: "target", qualityBasis: "program-unranked", flags: ["below major-quality bar (#588 > #50)"] }, list, 55000);
    expect(r).toEqual(["Its program for your major isn't ranked. For a student with your profile, the list only includes programs ranked #50 or better."]);
  });

  it("says the band's listed colleges scored higher, naming the biggest gap", () => {
    const r = whyNotListed(listed("x", { quality: 0.5, odds: 0.6, preferenceFit: 0.62 }), list, 55000);
    expect(r).toEqual([
      "Your list shows 2 matches, and each scored higher overall than this college.",
      "The biggest difference is that its program for your major is weaker than at the matches on your list.",
    ]);
  });

  it("skips the gap sentence when nothing stands out", () => {
    const r = whyNotListed(listed("x", { quality: 0.79, odds: 0.54 }), list, 55000);
    expect(r).toHaveLength(1);
  });

  it("uses the singular for one listed college", () => {
    const r = whyNotListed(listed("x", { band: "safety" }), list, null);
    expect(r![0]).toBe("Your list shows 1 safety, and it scored higher overall than this college.");
  });
});
