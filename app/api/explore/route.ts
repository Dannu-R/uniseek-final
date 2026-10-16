// POST /api/explore — generate personalized insight for ONE college the student
// has explicitly chosen to explore. Called on demand from the Explorer screen only
// (after the student confirms), never for the whole recommendation list.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCollegeInsight, type InsightCollege, type InsightStudent } from "@/lib/collegeInsight";
import type { IncomeBand } from "@/lib/scoring/filters";
import { residencyFor, studentNetPrice } from "@/lib/scoring/price";

type Band = "reach" | "target" | "safety";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { collegeId?: string; band?: Band; profile?: Record<string, unknown>; notListedReasons?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { collegeId, band = "target", profile = {} } = body;
  if (!collegeId) return NextResponse.json({ error: "collegeId required" }, { status: 400 });

  // Why the college isn't on the student's list (lib/whyNotListed.ts, computed in the
  // explorer), or null when it is. Kept short: at most 3 plain sentences.
  const notListedReasons = Array.isArray(body.notListedReasons)
    ? body.notListedReasons.filter((r): r is string => typeof r === "string").slice(0, 3).map((r) => r.slice(0, 400))
    : null;
  const notListed = !!notListedReasons && notListedReasons.length > 0;

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
  // Only if it was written for the same situation: a briefing for a college on the list
  // reads differently from one explaining why it isn't. (Older rows have no flag = on list.)
  const storedNotListed = (stored?.data as { notListed?: boolean } | undefined)?.notListed ?? false;
  if (stored && storedNotListed === notListed) {
    return NextResponse.json({ insight: stored.data, cached: true, stats });
  }

  const majorCip = typeof profile.majorCip === "string" ? profile.majorCip : null;
  const major = majorCip ? await prisma.major.findUnique({ where: { cipCode: majorCip } }) : null;
  const majorProgram = majorCip ? college.programs.find((p) => p.cipCode === majorCip) ?? null : null;

  // Same residency-aware price the list and budget filter use (lib/scoring/price.ts).
  const homeState = typeof profile.homeState === "string" ? profile.homeState : null;
  const np = studentNetPrice({
    incomeBand: typeof profile.incomeBand === "string" ? (profile.incomeBand as IncomeBand) : null,
    bands: {
      LT_30K: college.netPriceLt30k,
      B30_48K: college.netPrice30to48k,
      B48_75K: college.netPrice48to75k,
      B75_110K: college.netPrice75to110k,
      GT_110K: college.netPriceGt110k,
    },
    average: college.netPriceAvg,
    residency: residencyFor(homeState, college.state),
    tuitionInState: college.tuitionInState,
    tuitionOutOfState: college.tuitionOutOfState,
  });

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
    netPriceForStudent: np.price,
    netPriceBasis: np.basis,
    tuitionInState: college.tuitionInState,
    tuitionOutOfState: college.tuitionOutOfState,
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
    notListedReasons: notListed ? notListedReasons : null,
  };

  const studentInput: InsightStudent = {
    gpaUnweighted: num(profile.gpaUnweighted),
    apCoursesTaken: num(profile.apCoursesTaken),
    satSuperscore: num(profile.satSuperscore),
    actSuperscore: num(profile.actSuperscore),
    classRank: num(profile.classRank),
    classSize: num(profile.classSize),
    majorName: major?.name ?? null,
    homeState,
    budget: num(profile.budgetMaxNetPrice),
    activities,
  };

  const generated = await generateCollegeInsight(collegeInput, studentInput);
  // Remember which situation it was written for (see the cache check above).
  const insight = generated ? { ...generated, notListed } : null;

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
