import { describe, it, expect } from "vitest";
import { CollegeFile, CollegeRecord, FIELD_NAMES } from "./batch";

describe("batch schema", () => {
  describe("usNewsRankList field", () => {
    it("CollegeFile.parse with empty fields should NOT include usNewsRankList", () => {
      const result = CollegeFile.parse({
        ipedsUnitId: 1,
        name: "Test College",
        fields: {},
        status: "done",
      });
      expect("usNewsRankList" in result.fields).toBe(false);
    });

    it("CollegeFile.parse preserves usNewsRankList when provided", () => {
      const result = CollegeFile.parse({
        ipedsUnitId: 1,
        name: "Test College",
        fields: { usNewsRankList: "NATIONAL_LIBERAL_ARTS" },
        status: "done",
      });
      expect(result.fields.usNewsRankList).toBe("NATIONAL_LIBERAL_ARTS");
    });

    it("CollegeRecord parses without usNewsRankList and yields null (backward compatibility)", () => {
      // Build a record with all FIELD_NAMES set to null, except omit usNewsRankList
      // name is required, so set it explicitly
      const recordObj: Record<string, unknown> = {
        ipedsUnitId: 1,
        name: "Test College",
        website: null,
        majorsOffered: [],
        status: "done" as const,
        sources: {},
        notes: [],
      };

      // Add all FIELD_NAMES except usNewsRankList and name set to null
      for (const fieldName of FIELD_NAMES) {
        if (fieldName !== "usNewsRankList" && fieldName !== "name") {
          recordObj[fieldName] = null;
        }
      }

      const result = CollegeRecord.parse(recordObj);
      expect(result.usNewsRankList).toBe(null);
    });
  });
});
