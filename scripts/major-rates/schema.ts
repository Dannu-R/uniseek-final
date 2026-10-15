// Shape of a researched major-admit-rate file: data/major-rates/<major>-<cycle>.json.
// One entry per catalog college (§6a collection standard); see the design spec.

import path from "node:path";
import { z } from "zod";

export const MAJOR_RATES_DIR = path.resolve("data", "major-rates");

export const MajorRateEntry = z
  .object({
    ipedsUnitId: z.number().int().positive(),
    name: z.string().min(1),
    admissionUnit: z.enum(["UNIVERSITY", "SCHOOL", "MAJOR"]).nullable(),
    sourceClass: z.enum(["UNIVERSITY", "DERIVED", "PUBLISHED", "CONSENSUS", "ESTIMATE"]),
    admitRate: z.number().gt(0).max(1).nullable(), // null exactly when sourceClass is UNIVERSITY
    directAdmit: z.boolean().nullable(),
    basis: z.string().min(10), // where the number came from, or the estimate's peers/argument
    url: z.string().url().nullable(),
    year: z.string().nullable(), // e.g. "Fall 2025"
  })
  .superRefine((e, ctx) => {
    if (e.sourceClass === "UNIVERSITY" && e.admitRate !== null) {
      ctx.addIssue({ code: "custom", message: `${e.name}: UNIVERSITY class stores admitRate null` });
    }
    if (e.sourceClass !== "UNIVERSITY" && e.admitRate === null) {
      ctx.addIssue({ code: "custom", message: `${e.name}: admitRate required for ${e.sourceClass}` });
    }
    if ((e.sourceClass === "DERIVED" || e.sourceClass === "PUBLISHED") && !e.url) {
      ctx.addIssue({ code: "custom", message: `${e.name}: url required for ${e.sourceClass}` });
    }
  });
export type MajorRateEntry = z.infer<typeof MajorRateEntry>;

export const MajorRateFile = z
  .object({
    cip: z.string().regex(/^\d{2}\.\d{4}$/),
    cycle: z.string().regex(/^\d{4}-\d{2}$/),
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(MajorRateEntry),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<number>();
    for (const e of f.entries) {
      if (seen.has(e.ipedsUnitId)) ctx.addIssue({ code: "custom", message: `duplicate ipedsUnitId ${e.ipedsUnitId}` });
      seen.add(e.ipedsUnitId);
    }
  });
export type MajorRateFile = z.infer<typeof MajorRateFile>;
