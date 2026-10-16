// POST /api/score — score the catalog against a student profile and return a
// band-balanced reach/target/safety list. The profile is in the request body, but a
// signed-in session is required (the search is gated behind sign-in).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rankColleges } from "@/lib/scoring/score";
import { loadedRankingLists, RANKING_LISTS } from "@/lib/scoring/rankingLists";
import { mapCollege, scorableCollege } from "@/lib/scoring/mapCollege";
import { StudentInputSchema } from "@/lib/scoring/validation";
import { classifyActivityTiers } from "@/lib/scoring/classifyActivities";
import type { StudentInput } from "@/lib/scoring/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = StudentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  // Infer each activity's EC tier (and major-relevance) from its text via the AI
  // classifier, then hand the scoring engine the assigned tiers.
  const majorName = input.majorCip
    ? (await prisma.major.findUnique({ where: { cipCode: input.majorCip } }))?.name ?? null
    : null;
  const activities = await classifyActivityTiers(input.activities, majorName);
  const student = { ...input, activities } as StudentInput;

  const colleges = await prisma.college.findMany({ include: { programs: true } });
  const scorable = colleges.filter(scorableCollege);

  // Only score against ranking lists that have actually been imported; otherwise a
  // registered-but-empty list would floor every college's quality.
  const loadedCips = new Set<string>();
  for (const c of colleges) for (const p of c.programs) if (p.programRank != null) loadedCips.add(p.cipCode);
  const lists = loadedRankingLists(loadedCips);
  const missing = Object.keys(RANKING_LISTS.programs).filter((cip) => !loadedCips.has(cip));
  if (missing.length) {
    console.warn(`[score] no imported program ranks for ${missing.join(", ")}; using institutional ranks for those majors. Run \`npm run rankings:import\`.`);
  }

  const inputs = scorable.map((c) => mapCollege(c, student.majorCip, lists));

  const result = rankColleges(student, inputs, lists);

  return NextResponse.json({
    majorRun: !!student.majorCip,
    scoredCount: inputs.length,
    skippedCount: colleges.length - scorable.length,
    empty: result.empty,
    blockingFilter: result.blockingFilter ?? null,
    list: result.list,
    ranked: result.ranked,
    removedCount: result.removed.length,
    qualityBar: result.qualityBar ?? null,
    shortBands: result.shortBands,
  });
}
