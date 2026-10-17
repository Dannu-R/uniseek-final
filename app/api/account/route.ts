// /api/account — everything the dashboard keeps for a signed-in student, so it follows
// them to any browser: their intake answers, their saved colleges, and their latest
// recommended list. The browser keeps a copy in local/session storage; this is the
// source of truth it loads from when the dashboard opens (lib/accountSync.ts).
//
// GET    → { userId, answers: { data, step } | null, saved: [...], run: result | null }
// PUT    → { answers?: { data, step }, saved?: [...], run?: result } replaces whichever
//          is given (`run` only for the one-time upload of a list scored before this
//          existed; new lists are saved by POST /api/score)
// DELETE → removes all three (the "clear everything" button); ?part=run removes only the list
//
// The recommended list itself is written by POST /api/score, right after it's scored.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_SAVED = 200;
const MAX_BODY_CHARS = 2_000_000;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [answers, saved, run] = await Promise.all([
    prisma.profileAnswers.findUnique({ where: { userId } }),
    prisma.savedCollege.findMany({ where: { userId }, orderBy: { position: "asc" } }),
    prisma.savedRun.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    userId,
    answers: answers ? { data: answers.data, step: answers.step } : null,
    saved: saved.map((s) => s.data),
    run: run?.result ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let body: { answers?: unknown; saved?: unknown; run?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.answers !== undefined) {
    const answers = body.answers;
    if (!isObject(answers) || !isObject(answers.data)) {
      return NextResponse.json({ error: "answers.data must be an object" }, { status: 400 });
    }
    const step = typeof answers.step === "number" && Number.isInteger(answers.step) ? answers.step : 0;
    const data = answers.data as Prisma.InputJsonValue;
    await prisma.profileAnswers.upsert({
      where: { userId },
      update: { data, step },
      create: { userId, data, step },
    });
  }

  if (body.saved !== undefined) {
    if (!Array.isArray(body.saved) || body.saved.length > MAX_SAVED) {
      return NextResponse.json({ error: `saved must be a list of at most ${MAX_SAVED} colleges` }, { status: 400 });
    }
    // One row per college; a repeat of the same college keeps the first.
    const rows: { userId: string; collegeId: string; position: number; data: Prisma.InputJsonValue }[] = [];
    const seen = new Set<string>();
    for (const item of body.saved) {
      if (!isObject(item) || typeof item.collegeId !== "string" || seen.has(item.collegeId)) continue;
      seen.add(item.collegeId);
      rows.push({ userId, collegeId: item.collegeId, position: rows.length, data: item as Prisma.InputJsonValue });
    }
    // Replace the whole list in one go, so the order and removals always match the browser.
    await prisma.$transaction([
      prisma.savedCollege.deleteMany({ where: { userId } }),
      prisma.savedCollege.createMany({ data: rows }),
    ]);
  }

  if (body.run !== undefined) {
    if (!isObject(body.run)) return NextResponse.json({ error: "run must be an object" }, { status: 400 });
    const snapshot = isObject(body.answers) && isObject(body.answers.data) ? body.answers.data : {};
    await prisma.$transaction([
      prisma.savedRun.deleteMany({ where: { userId } }),
      prisma.savedRun.create({
        data: {
          userId,
          profileSnapshot: snapshot as Prisma.InputJsonValue,
          result: body.run as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (new URL(request.url).searchParams.get("part") === "run") {
    await prisma.savedRun.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.profileAnswers.deleteMany({ where: { userId } }),
    prisma.savedCollege.deleteMany({ where: { userId } }),
    prisma.savedRun.deleteMany({ where: { userId } }),
  ]);
  return NextResponse.json({ ok: true });
}
