// College search helpers (college-search spec). Pure functions, so they're unit-tested
// and shared by the API route and the Search view.

import type { Prisma } from "@prisma/client";

export const ITEMS_PER_PAGE = 10;

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming",
};

// "TX", "tx" or "Texas" → "TX"; anything else → null.
export function stateCode(query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  const upper = q.toUpperCase();
  if (upper in STATE_NAMES) return upper;
  const match = Object.entries(STATE_NAMES).find(([, name]) => name.toLowerCase() === q.toLowerCase());
  return match ? match[0] : null;
}

// One search box, matched against name, city, state or major (spec D1).
// majorCips: the majors whose names matched the query (looked up by the route).
export function searchWhere(query: string, majorCips: string[]): Prisma.CollegeWhereInput {
  const q = query.trim();
  if (!q) return {};
  const or: Prisma.CollegeWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { city: { contains: q, mode: "insensitive" } },
  ];
  const code = stateCode(q);
  if (code) or.push({ state: code });
  if (majorCips.length > 0) or.push({ programs: { some: { cipCode: { in: majorCips } } } });
  return { OR: or };
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), totalPages);
}

// Which page numbers to show, with "..." gaps (the course's generatePagination).
export function pageList(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, "...", totalPages - 1, totalPages];
  if (currentPage >= totalPages - 2) return [1, 2, "...", totalPages - 2, totalPages - 1, totalPages];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}
