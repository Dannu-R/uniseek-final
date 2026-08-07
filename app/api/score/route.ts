// POST /api/score — score the catalog against a student profile and return a
// band-balanced reach/target/safety list. Stateless: the profile is in the request
// body (anonymous-first — no account needed to score).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankColleges } from "@/lib/scoring/score";
import { mapCollege, scorableCollege } from "@/lib/scoring/mapCollege";
import { StudentInputSchema } from "@/lib/scoring/validation";
import type { StudentInput } from "@/lib/scoring/types";

export async function POST(req: Request) {
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
  const student = parsed.data as StudentInput;

  const colleges = await prisma.college.findMany({ include: { programs: true } });
  const scorable = colleges.filter(scorableCollege);
  const inputs = scorable.map((c) => mapCollege(c, student.majorCip));

  const result = rankColleges(student, inputs);

  return NextResponse.json({
    majorRun: !!student.majorCip,
    scoredCount: inputs.length,
    skippedCount: colleges.length - scorable.length,
    empty: result.empty,
    blockingFilter: result.blockingFilter ?? null,
    list: result.list,
    ranked: result.ranked,
    removedCount: result.removed.length,
  });
}
