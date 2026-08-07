// Request validation for the scoring API. Zod schema mirroring StudentInput.
import { z } from "zod";

const Preference = z.object({
  weight: z.number().min(0).max(4),
  direction: z.number().min(0).max(4).nullish(),
});

const Setting = z.enum(["URBAN", "SUBURBAN", "RURAL"]);

const Preferences = z
  .object({
    schoolSize: Preference.optional(),
    classSize: Preference.optional(),
    greekLife: Preference.optional(),
    housing: Preference.optional(),
    athletics: Preference.optional(),
    partyScene: Preference.optional(),
    academicSupport: Preference.optional(),
    meritAid: Preference.optional(),
    studyAbroad: Preference.optional(),
    coOp: Preference.optional(),
    setting: z.object({ weight: z.number().min(0).max(4), selections: z.array(Setting) }).optional(),
  })
  .default({});

const Activity = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  majorRelevant: z.boolean().optional(),
});

export const StudentInputSchema = z.object({
  gpaUnweighted: z.number().min(0).max(5),
  gpaGrade10: z.number().nullish(),
  gpaGrade11: z.number().nullish(),
  gpaGrade12: z.number().nullish(),
  apCoursesTaken: z.number().int().min(0),
  apCoursesOffered: z.number().int().min(0).nullable(), // null = "not sure"
  satSuperscore: z.number().int().nullish(),
  actSuperscore: z.number().int().nullish(),
  notSubmittingScores: z.boolean().default(false),
  classRank: z.number().int().nullish(),
  classSize: z.number().int().nullish(),
  schoolDoesNotRank: z.boolean().default(false),
  activities: z.array(Activity).max(10).default([]),
  volunteerHoursPerYear: z.number().min(0).default(0),
  majorCip: z.string().nullish(),
  homeState: z.string().nullish(),
  homeLat: z.number().nullish(),
  homeLon: z.number().nullish(),
  budgetMaxNetPrice: z.number().min(0),
  incomeBand: z.enum(["LT_30K", "B30_48K", "B48_75K", "B75_110K", "GT_110K"]).nullish(),
  maxDistanceMiles: z.number().min(0).nullish(),
  inStateOnly: z.boolean().default(false),
  religiousPreference: z.enum(["REQUIRE", "EXCLUDE", "NO_PREFERENCE"]).default("NO_PREFERENCE"),
  preferences: Preferences,
});

export type ValidatedStudentInput = z.infer<typeof StudentInputSchema>;
