// GET /api/majors — the controlled major list (CIP + name) for the intake dropdown.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const majors = await prisma.major.findMany({
    select: { cipCode: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ majors });
}
