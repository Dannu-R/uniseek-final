// Shape of a collected ranking list: data/rankings/<source>-<edition>-<listKey>.json
// One file per (source, list). Entries cover only colleges in the Uniseek catalog;
// a catalog college that offers the major but is absent from `entries` is unranked.

import path from "node:path";
import { z } from "zod";
import type { RankingLists } from "../../lib/scoring/rankingLists";

export const RANKINGS_DIR = path.resolve("data", "rankings");

export const RankingEntry = z.object({
  ipedsUnitId: z.number().int().positive(),
  name: z.string().min(1),
  rank: z.number().int().positive(), // for a range like "#541-587", its first number
  tie: z.boolean().default(false),
  band: z.string().nullable().default(null), // the range as shown, e.g. "#541-587"
});

export const RankingFile = z
  .object({
    source: z.enum(["USNEWS", "NICHE"]),
    edition: z.string().min(1),
    cip: z.string().regex(/^\d{2}\.\d{4}$/),
    listKey: z.string().min(1),
    url: z.string().url(),
    size: z.number().int().positive(), // the list's "N results"
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z.array(RankingEntry),
  })
  .superRefine((f, ctx) => {
    const seen = new Set<number>();
    for (const e of f.entries) {
      if (seen.has(e.ipedsUnitId)) ctx.addIssue({ code: "custom", message: `duplicate ipedsUnitId ${e.ipedsUnitId}` });
      seen.add(e.ipedsUnitId);
      if (e.rank > f.size) ctx.addIssue({ code: "custom", message: `${e.name}: rank ${e.rank} > list size ${f.size}` });
    }
  });
export type RankingFile = z.infer<typeof RankingFile>;

// The file must match its RANKING_LISTS entry, so scoring's "size + 1" is right.
export function checkAgainstConfig(file: RankingFile, lists: RankingLists): string[] {
  const cfg = lists.programs[file.cip];
  if (!cfg) return [`${file.cip} is not registered in RANKING_LISTS.programs (lib/scoring/rankingLists.ts)`];
  const errs: string[] = [];
  if (cfg.source !== file.source) errs.push(`source ${file.source} ≠ config ${cfg.source}`);
  if (cfg.listKey !== file.listKey) errs.push(`listKey ${file.listKey} ≠ config ${cfg.listKey}`);
  if (cfg.size !== file.size) errs.push(`size ${file.size} ≠ config ${cfg.size}`);
  if (cfg.edition !== file.edition) errs.push(`edition ${file.edition} ≠ config ${cfg.edition}`);
  return errs;
}
