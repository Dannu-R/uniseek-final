// POST /api/explore — generate personalized insight for ONE college the student
// has explicitly chosen to explore. Called on demand from the Explorer screen only
// (after the student confirms), never for the whole recommendation list.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCollegeInsight, type InsightCollege, type InsightStudent } from "@/lib/collegeInsight";

type Band = "reach" | "target" | "safety";

const NET_PRICE_COLUMN: Record<string, keyof PrismaCollegeNetPrice> = {
  LT_30K: "netPriceLt30k",
  B30_48K: "netPrice30to48k",
  B48_75K: "netPrice48to75k",
  B75_110K: "netPrice75to110k",
  GT_110K: "netPriceGt110k",
};
type PrismaCollegeNetPrice = {
  netPriceLt30k: number | null;
  netPrice30to48k: number | null;
  netPrice48to75k: number | null;
  netPrice75to110k: number | null;
  netPriceGt110k: number | null;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { collegeId?: string; band?: Band; profile?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { collegeId, band = "target", profile = {} } = body;
  if (!collegeId) return NextResponse.json({ error: "collegeId required" }, { status: 400 });

  const userId = session.user.id;

  // College is fetched first so the admissions stats (real SAT middle-50%) ride along
  // on every response path — including a cache hit — for the "Where you stand" visual.
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    include: { programs: true },
  });
  if (!college) return NextResponse.json({ error: "college not found" }, { status: 404 });
  const stats = { satP25: college.satP25, satP75: college.satP75 };

  // Serve a previously stored insight instead of regenerating it.
  const stored = await prisma.collegeInsight.findUnique({
    where: { userId_collegeId: { userId, collegeId } },
  });
  if (stored) return NextResponse.json({ insight: stored.data, cached: true, stats });

  const majorCip = typeof profile.majorCip === "string" ? profile.majorCip : null;
  const major = majorCip ? await prisma.major.findUnique({ where: { cipCode: majorCip } }) : null;
  const majorProgram = majorCip ? college.programs.find((p) => p.cipCode === majorCip) ?? null : null;

  const incomeBand = typeof profile.incomeBand === "string" ? profile.incomeBand : null;
  const bandCol = incomeBand ? NET_PRICE_COLUMN[incomeBand] : undefined;
  const netPriceForStudent = (bandCol ? college[bandCol] : null) ?? college.netPriceAvg ?? null;

  const activities = Array.isArray(profile.activities)
    ? (profile.activities as { description?: string }[]).map((a) => a.description ?? "").filter((d) => d.trim() !== "")
    : [];

  const collegeInput: InsightCollege = {
    name: college.name,
    band,
    overallAdmitRate: college.admitRate,
    majorName: major?.name ?? null,
    majorAdmitRate: majorProgram?.admitRate ?? null,
    majorProgramRank: majorProgram?.programRank ?? null,
    inStateAdmitRate: college.inStateAdmitRate,
    outOfStateAdmitRate: college.outOfStateAdmitRate,
    satP25: college.satP25,
    satP75: college.satP75,
    netPriceForStudent,
    enrollmentUndergrad: college.enrollmentUndergrad,
    setting: college.setting,
    greekLife: college.greekLife,
    athleticsTier: college.athleticsTier,
    housingOnCampusPct: college.housingOnCampusPct,
    classSizeUnder20Pct: college.classSizeUnder20Pct,
    meritAidPct: college.meritAidPct,
    studyAbroadRate: college.studyAbroadRate,
    coOp: college.coOp,
    religiousAffiliation: college.religiousAffiliation,
    state: college.state,
  };

  const studentInput: InsightStudent = {
    gpaUnweighted: num(profile.gpaUnweighted),
    apCoursesTaken: num(profile.apCoursesTaken),
    satSuperscore: num(profile.satSuperscore),
    actSuperscore: num(profile.actSuperscore),
    classRank: num(profile.classRank),
    classSize: num(profile.classSize),
    majorName: major?.name ?? null,
    homeState: typeof profile.homeState === "string" ? profile.homeState : null,
    budget: num(profile.budgetMaxNetPrice),
    activities,
  };

  const insight = await generateCollegeInsight(collegeInput, studentInput);

  // Persist the generated insight so future opens serve it from the DB.
  if (insight) {
    await prisma.collegeInsight.upsert({
      where: { userId_collegeId: { userId, collegeId } },
      update: { data: insight as unknown as Prisma.InputJsonValue, band },
      create: { userId, collegeId, band, data: insight as unknown as Prisma.InputJsonValue },
    });
  }

  return NextResponse.json({ insight, cached: false, stats });
}

// Remove a stored insight (used when the student unsaves a college).
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { collegeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.collegeId) return NextResponse.json({ error: "collegeId required" }, { status: 400 });

  const { count } = await prisma.collegeInsight.deleteMany({
    where: { userId: session.user.id, collegeId: body.collegeId },
  });
  return NextResponse.json({ ok: true, deleted: count });
}
