// Shared shape of a college batch file (data/colleges/<batch>.json) and of the
// per-college files Claude writes while researching (data/colleges/work/<batch>/<ipedsUnitId>.json).
//
// Pipeline (driven by the scrape-colleges Claude Code skill — no API keys):
//   Claude researches each college (College Navigator, CDS, admissions site) → work files
//   → build (validate + assemble) → review the diff in git → import (upsert into Postgres)
//
// Field names match prisma/schema.prisma `College` exactly so import is a straight copy.
// Percentages are FRACTIONS on 0..1, same convention as prisma/seed.ts.

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// UNISEEK_COLLEGES_DIR redirects batch + work files (e.g. for skill evals); the
// download cache (CDS PDFs) always stays in the repo so every run shares it.
export const DATA_DIR = path.resolve(process.env.UNISEEK_COLLEGES_DIR ?? path.join("data", "colleges"));
export const CACHE_DIR = path.resolve("data", "colleges", ".cache");
export const WORK_DIR = path.join(DATA_DIR, "work");

const frac = z.number().min(0).max(1);
const c7 = z.number().int().min(0).max(3); // Very Important 3 … Not Considered 0
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

// Every scraped College column. All nullable: null = unknown, never a guess.
export const CollegeFields = z.object({
  name: z.string().min(1),
  city: z.string().nullable(),
  state: z.string().length(2).nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),

  admitRate: frac.nullable(),
  admitRateProvenance: z.enum(["VERIFIED", "CARRIED", "APPROX"]).nullable(),
  usNewsRank: z.number().int().positive().nullable(),
  usNewsRankProvenance: z.enum(["VERIFIED", "CARRIED", "APPROX"]).nullable(),
  usNewsRankList: z.enum(["NATIONAL_UNIVERSITIES", "NATIONAL_LIBERAL_ARTS"]).nullable().default(null),
  inStateAdmitRate: frac.nullable(),
  outOfStateAdmitRate: frac.nullable(),

  satP25: z.number().int().min(400).max(1600).nullable(),
  satP75: z.number().int().min(400).max(1600).nullable(),
  actP25: z.number().int().min(1).max(36).nullable(),
  actP75: z.number().int().min(1).max(36).nullable(),
  testBlind: z.boolean().nullable(),
  superscores: z.boolean().nullable(),

  c7Rigor: c7.nullable(),
  c7Gpa: c7.nullable(),
  c7Test: c7.nullable(),
  c7Rank: c7.nullable(),
  c7Ec: c7.nullable(),
  c7Service: c7.nullable(),

  netPriceAvg: z.number().int().min(0).nullable(),
  netPriceLt30k: z.number().int().nullable(), // can be negative in Scorecard; kept as-is
  netPrice30to48k: z.number().int().nullable(),
  netPrice48to75k: z.number().int().nullable(),
  netPrice75to110k: z.number().int().nullable(),
  netPriceGt110k: z.number().int().nullable(),

  religiousAffiliation: z.string().nullable(),
  enrollmentUndergrad: z.number().int().min(0).nullable(),
  setting: z.enum(["URBAN", "SUBURBAN", "RURAL"]).nullable(),
  athleticsTier: z
    .enum(["D1_FBS_POWER", "D1_FBS_OTHER", "D1_FCS", "D1_NO_FOOTBALL", "D2", "D3", "NAIA_OR_NONE"])
    .nullable(),
  ncaaDivision: z.string().nullable(),
  conference: z.string().nullable(),

  greekLife: z.boolean().nullable(),
  coOp: z.boolean().nullable(),
  classSizeUnder20Pct: frac.nullable(),
  housingOnCampusPct: frac.nullable(),
  meritAidPct: frac.nullable(),
  studyAbroadRate: frac.nullable(),
  firstYearRetentionRate: frac.nullable(),

  deadlinesCycle: z.string().regex(/^\d{4}-\d{2}$/, 'expected e.g. "2026-27"').nullable(),
  edDeadline: isoDate.nullable(),
  ed2Deadline: isoDate.nullable(),
  eaDeadline: isoDate.nullable(),
  reaDeadline: isoDate.nullable(),
  priorityDeadline: isoDate.nullable(),
  rdDeadline: isoDate.nullable(),
  rollingAdmission: z.boolean().nullable(),
  deadlinesSourceUrl: z.string().url().nullable(),
});
export type CollegeFields = z.infer<typeof CollegeFields>;
export type FieldName = keyof CollegeFields;
export const FIELD_NAMES = Object.keys(CollegeFields.shape) as FieldName[];

// Where a value came from. Lives in the batch file only (reviewable in git), not the DB.
export const Source = z.object({
  source: z.enum(["college-navigator", "cds", "admissions-site", "web", "derived"]),
  url: z.string().optional(),
  year: z.string().optional(), // e.g. CDS "2025-26"
  note: z.string().optional(),
});

// The controlled major list (prisma/seed.ts MAJORS). A college "offers" a major when it
// awards a bachelor's in it; import turns each into a CollegeProgram row.
export const MAJOR_CIPS = [
  "11.0701", "26.0101", "52.0201", "14.1901", "14.1001", "14.0901", "42.0101", "45.0601",
  "45.1001", "51.3801", "23.0101", "27.0101", "40.0501", "09.0101", "52.0801",
] as const;

const Status = z.enum(["partial", "done"]);

// One researched college, as Claude writes it. `fields` holds only what was found;
// every key in it needs a matching `sources` entry.
export const CollegeFile = z.object({
  ipedsUnitId: z.number().int().positive(),
  name: z.string().min(1),
  website: z.string().nullable().default(null),
  fields: CollegeFields.omit({ name: true }).partial().strict(),
  majorsOffered: z.array(z.enum(MAJOR_CIPS)).default([]),
  sources: z.record(z.string(), Source).default({}),
  notes: z.array(z.string()).default([]),
  status: Status,
});
export type CollegeFile = z.infer<typeof CollegeFile>;

// A college in the assembled batch: every field present (null = unknown).
export const CollegeRecord = CollegeFields.extend({
  ipedsUnitId: z.number().int().positive(),
  website: z.string().nullable(),
  majorsOffered: z.array(z.enum(MAJOR_CIPS)),
  status: Status,
  sources: z.record(z.string(), Source),
  notes: z.array(z.string()),
});
export type CollegeRecord = z.infer<typeof CollegeRecord>;

export const BatchFile = z.object({
  batch: z.string(),
  description: z.string(), // the request that produced it, e.g. "3 largest Georgia publics"
  updatedAt: z.string(),
  colleges: z.array(CollegeRecord),
});
export type BatchFile = z.infer<typeof BatchFile>;

export function batchPath(batch: string) {
  return path.join(DATA_DIR, `${batch}.json`);
}

export function readBatch(file: string): BatchFile {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const parsed = BatchFile.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${file} failed validation:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function writeBatch(file: string, data: BatchFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function formatIssues(err: z.ZodError) {
  return err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

// Tiny argv parser: --flag value, --flag (boolean), repeated flags collect into arrays.
export function parseArgs(argv: string[]) {
  const flags: Record<string, string[]> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { positional.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    const value = next !== undefined && !next.startsWith("--") ? (i++, next) : "true";
    (flags[key] ??= []).push(value);
  }
  return { flags, positional, get: (k: string) => flags[k]?.[0], has: (k: string) => k in flags };
}

export function loadEnv() {
  try { process.loadEnvFile(".env"); } catch { /* no .env — fine */ }
}
