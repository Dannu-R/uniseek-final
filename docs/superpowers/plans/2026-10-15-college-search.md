# College Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's "Coming soon" Search tab with a working, paginated college search that keeps its state in the URL, following the Next.js Learn chapter "Adding Search and Pagination".

**Architecture:**
- Pure helpers in `lib/search.ts`, unit-tested.
- A signed-in `GET /api/colleges/search` route that runs the Prisma query.
- Three client components in `app/dashboard/search/` (`SearchBox`, `Pagination`, `SearchView`), wired into `DashboardClient` through `?tab=search&query=…&page=…`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6, vitest, `use-debounce`, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-15-college-search-design.md`

## Global Constraints

- The developer is learning React/Next.js. Keep the code simple and close to the course's own code; prefer clarity over cleverness.
- The URL is the source of truth for `query` and `page`. A new search sets `page=1`.
- 10 results per page, ordered by name. An out-of-range page clamps.
- The route requires a session (401 otherwise), like `/api/score`.
- Branch `college-search`, cut from `main`. `main` has uncommitted landing-page edits: carry them along, but **never stage them**. Stage only the paths each task names. Commit per task; never push. Suite baseline: 150.

---

### Task 0: Branch

- [ ] `git checkout -b college-search`, then `git add docs/superpowers/specs/2026-10-15-college-search-design.md docs/superpowers/plans/2026-10-15-college-search.md && git commit -m "Add spec and plan for college search"`.

---

### Task 1: `lib/search.ts` (TDD)

**Files:** Create `lib/search.ts`, `lib/search.test.ts`.

- [ ] **Step 1: Failing tests** — `lib/search.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stateCode, searchWhere, pageCount, clampPage, pageList } from "./search";

describe("stateCode", () => {
  it("accepts two-letter codes and full names in any case", () => {
    expect(stateCode("TX")).toBe("TX");
    expect(stateCode("tx")).toBe("TX");
    expect(stateCode("Texas")).toBe("TX");
    expect(stateCode("  new york ")).toBe("NY");
    expect(stateCode("District of Columbia")).toBe("DC");
  });
  it("returns null for anything else", () => {
    expect(stateCode("Rice")).toBeNull();
    expect(stateCode("")).toBeNull();
  });
});

describe("searchWhere", () => {
  it("is empty for an empty query", () => {
    expect(searchWhere("  ", [])).toEqual({});
  });
  it("matches name and city, plus state when the query is a state", () => {
    expect(searchWhere("texas", [])).toEqual({
      OR: [
        { name: { contains: "texas", mode: "insensitive" } },
        { city: { contains: "texas", mode: "insensitive" } },
        { state: "TX" },
      ],
    });
  });
  it("adds the major clause only when majors matched", () => {
    const w = searchWhere("computer", ["11.0701", "14.0901"]) as { OR: unknown[] };
    expect(w.OR).toHaveLength(3);
    expect(w.OR[2]).toEqual({ programs: { some: { cipCode: { in: ["11.0701", "14.0901"] } } } });
  });
});

describe("pageCount and clampPage", () => {
  it("never reports fewer than one page", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
  });
  it("clamps into range", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(NaN, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(3, 5)).toBe(3);
  });
});

describe("pageList (the course's generatePagination)", () => {
  it("shows every page when there are 7 or fewer", () => {
    expect(pageList(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("collapses the middle near the start", () => {
    expect(pageList(2, 16)).toEqual([1, 2, 3, "...", 15, 16]);
  });
  it("collapses the middle near the end", () => {
    expect(pageList(15, 16)).toEqual([1, 2, "...", 14, 15, 16]);
  });
  it("shows the neighbours of a page in the middle", () => {
    expect(pageList(8, 16)).toEqual([1, "...", 7, 8, 9, "...", 16]);
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run lib/search.test.ts` → FAIL (module not found).

- [ ] **Step 3: `lib/search.ts`**

```ts
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
```

- [ ] **Step 4: Verify** — `npx vitest run` → 161 (11 new tests); `npx tsc --noEmit -p . 2>&1 | grep lib/search` → nothing.

- [ ] **Step 5: Commit** — `git add lib/search.ts lib/search.test.ts && git commit -m "Add college search helpers"`

---

### Task 2: `GET /api/colleges/search`

**Files:** Create `app/api/colleges/search/route.ts`.

- [ ] **Step 1:**

```ts
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
```

- [ ] **Step 2: Verify the query logic against the real DB.** The route needs a session, so test the same `where` with a throwaway workspace script using `prisma` + `searchWhere`, not curl. Print the counts:
  - `""` → 159
  - `"TX"` and `"Texas"` → the same count
  - `"computer"` → most of the catalog (most colleges offer CS)
  - `"michigan"` → Michigan, Michigan State and Michigan Tech

  Then `npx tsc --noEmit -p . 2>&1 | grep app/api/colleges` → nothing.

- [ ] **Step 3: Commit** — `git add app/api/colleges && git commit -m "Add the college search API route"`

---

### Task 3: Search UI wired into the dashboard

**Files:**
- Create `app/dashboard/search/SearchBox.tsx`, `Pagination.tsx`, `SearchView.tsx`.
- Modify `app/dashboard/DashboardClient.tsx`, `app/dashboard/page.tsx`, `app/styles/dashboard.css`, `package.json` / `package-lock.json`.

- [ ] **Step 1:** `npm install use-debounce`.

- [ ] **Step 2: `SearchBox.tsx`** (the course's `<Search>`):

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBox({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Wait 300 ms after the last keystroke, then put the search in the URL.
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "search");
    params.set("page", "1"); // a new search starts on page 1
    if (term) params.set("query", term);
    else params.delete("query");
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <label className="search-box">
      <span className="sr-only">Search colleges</span>
      {/* the magnifier svg from the old placeholder */}
      <input
        type="search"
        className="search-box__input"
        placeholder={placeholder}
        defaultValue={searchParams.get("query") ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </label>
  );
}
```

  Reuse the magnifier `<svg>` from the current placeholder. If `.sr-only` doesn't exist in the styles, add it.

- [ ] **Step 3: `Pagination.tsx`** (the course's `<Pagination>` with `createPageURL`):
  - Read `page` from `useSearchParams()`.
  - Build links with `createPageURL(n)`: copy the params and set `page`.
  - Render ‹ Prev, the numbers from `pageList(current, totalPages)` ("..." as a plain span, the current page highlighted with `aria-current="page"`), and Next ›. Prev and Next are disabled at the ends.
  - Use `next/link`'s `<Link>`. Return `null` when `totalPages <= 1`.

- [ ] **Step 4: `SearchView.tsx`.** Props: `ranked` (the last run's `ranked` list, or null), `isSaved(id)`, `onSave(college)`.
  - Read `query` and `page` from `useSearchParams()`. `useEffect` on `[query, page]` fetches `/api/colleges/search?query=…&page=…`, with an `AbortController` cleanup so a stale response can't overwrite a newer one.
  - Show a skeleton (rows with the existing skeleton styling) while loading, and the API's error as a short message.
  - **Rows:** name, "City, ST", "X% acceptance rate", "#N US News". Then, looking up `ranked.find((r) => r.collegeId === college.id)`:
    - **Found:** a band pill (reuse the band colors), "NN% odds", and a Save / Saved button calling `onSave(rankedEntry)`.
    - **Not found, but a run exists:** muted "Not in your results. Your filters (budget, major, location) left it out."
    - **No run:** muted "Run your college match to see how you compare."
  - **Empty state:** "No colleges match "{query}". Try a name, a state like TX, or a major."
  - A count line above the list: "N colleges" (the API's `total`).
  - `<Pagination totalPages=… />` under the list.

- [ ] **Step 5: `DashboardClient.tsx`**
  1. Replace the "Coming soon" block with `<SearchBox placeholder="Search colleges by name, major, or state" />`, then `<SearchView … />`. Keep the `ViewHeader`.
  2. Pass `ranked={result?.ranked ?? null}`, `isSaved`, and the existing add-to-saved function. Find the right names; don't duplicate logic.
  3. **D6:** on load, `useSearchParams().get("tab") === "search"` opens the Search tab.
  4. **D6:** in `selectTab`, use `router.replace("/dashboard?tab=search")` when choosing Search (keep an existing query if one is already in the URL), and `router.replace("/dashboard")` when choosing any other tab while search params are present.
  5. Leave the existing `?demo` handling alone.
  6. `app/dashboard/page.tsx`: wrap `<DashboardClient …/>` in `<Suspense>` (`useSearchParams` requires it).

- [ ] **Step 6: Styles.** Add `.search-box`, `.search-results`, `.search-row` and `.pagination` to `app/styles/dashboard.css`, following that file's existing tokens and card styles. Remove the old `.soon__*` rules only if nothing else uses them (grep first).

- [ ] **Step 7: Verify**
  - `npx tsc --noEmit -p .` → only the 2 pre-existing `ExplorerView` `animate` errors.
  - `npx vitest run` → 161.
  - `curl` `/dashboard?tab=search&query=texas` on the dev server → 307 to login when signed out.

- [ ] **Step 8: Commit** — `git add app/dashboard app/styles/dashboard.css package.json package-lock.json && git commit -m "Build the dashboard college search with URL state and pagination"`

---

### Task 4: Hand-off check

- [ ] List the manual checks from the spec for the developer to click through: debounce and URL, back/forward, a pasted URL, the four sample queries, save from search, and the reason text.
