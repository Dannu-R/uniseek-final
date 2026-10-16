// GET /api/colleges/search?query=&page= — one page of colleges matching the search box
// (college-search spec). Signed-in only, like /api/score.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE, searchWhere, pageCount, clampPage } from "@/lib/search";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = (params.get("query") ?? "").trim().slice(0, 100);

  // Majors whose names match ("computer" → CS, Computer Engineering).
  const majors = query
    ? await prisma.major.findMany({ where: { name: { contains: query, mode: "insensitive" } }, select: { cipCode: true } })
    : [];
  const where = searchWhere(query, majors.map((m) => m.cipCode));

  const total = await prisma.college.count({ where });
  const totalPages = pageCount(total);
  const page = clampPage(Number(params.get("page")) || 1, totalPages);

  const colleges = await prisma.college.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (page - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
    select: { id: true, name: true, city: true, state: true, admitRate: true, usNewsRank: true },
  });

  return NextResponse.json({ colleges, total, totalPages, page });
}
