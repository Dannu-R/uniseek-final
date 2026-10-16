import { describe, it, expect } from "vitest";
import { stateCode, searchWhere, pageCount, clampPage, pageList } from "./search";

describe("stateCode", () => {
  it("accepts two-letter codes and full names in any case", () => {
    expect(stateCode("TX")).toBe("TX");
    expect(stateCode("tx")).toBe("TX");
    expect(stateCode("Texas")).toBe("TX");
    expect(stateCode("  new york ")).toBe("NY");
    expect(stateCode("District of Columbia")).toBe("DC");
  });
  it("returns null for anything else", () => {
    expect(stateCode("Rice")).toBeNull();
    expect(stateCode("")).toBeNull();
  });
});

describe("searchWhere", () => {
  it("is empty for an empty query", () => {
    expect(searchWhere("  ", [])).toEqual({});
  });
  it("matches name and city, plus state when the query is a state", () => {
    expect(searchWhere("texas", [])).toEqual({
      OR: [
        { name: { contains: "texas", mode: "insensitive" } },
        { city: { contains: "texas", mode: "insensitive" } },
        { state: "TX" },
      ],
    });
  });
  it("adds the major clause only when majors matched", () => {
    const w = searchWhere("computer", ["11.0701", "14.0901"]) as { OR: unknown[] };
    expect(w.OR).toHaveLength(3);
    expect(w.OR[2]).toEqual({ programs: { some: { cipCode: { in: ["11.0701", "14.0901"] } } } });
  });
});

describe("pageCount and clampPage", () => {
  it("never reports fewer than one page", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
  });
  it("clamps into range", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(NaN, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(3, 5)).toBe(3);
  });
});

describe("pageList (the course's generatePagination)", () => {
  it("shows every page when there are 7 or fewer", () => {
    expect(pageList(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("collapses the middle near the start", () => {
    expect(pageList(2, 16)).toEqual([1, 2, 3, "...", 15, 16]);
  });
  it("collapses the middle near the end", () => {
    expect(pageList(15, 16)).toEqual([1, 2, "...", 14, 15, 16]);
  });
  it("shows the neighbours of a page in the middle", () => {
    expect(pageList(8, 16)).toEqual([1, "...", 7, 8, 9, "...", 16]);
  });
});
