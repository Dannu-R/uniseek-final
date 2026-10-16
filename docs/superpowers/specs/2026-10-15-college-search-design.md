# College search + pagination — design

Date: 2026-10-15 · Status: draft for review

## Problem

The dashboard's **Search** tab is a disabled "Coming soon" placeholder ("Search colleges by
name, major, or state"). Students can only see colleges their answers surfaced; they can't
look up a college they already have in mind.

## Approach (option 1 from the conversation)

Follow the Next.js Learn chapter **"Adding Search and Pagination"**
(nextjs.org/learn/dashboard-app/adding-search-and-pagination): search state lives in the
**URL** (`?query=…&page=…`), input is **debounced** (300 ms, `use-debounce`), page resets to
1 on a new search, and a `<Pagination>` component builds page links from the current params.

One deliberate difference: the dashboard is a single client component that switches tabs with
`useState`, so results can't come from a server component the way the course's
`<InvoicesTable>` does. Instead a small **API route** runs the Prisma query on the server, and
the Search view fetches it. The database is still never exposed to the browser.

| Course | Uniseek |
|---|---|
| `/dashboard/invoices?query=…&page=…` | `/dashboard?tab=search&query=…&page=…` |
| `<Search>` client component, `useSearchParams` + `replace` | same |
| `useDebouncedCallback(…, 300)` | same |
| `params.set('page', '1')` on a new search | same |
| Server page awaits `searchParams`, passes to `<Table>` | `<SearchView>` reads `useSearchParams()` and fetches `/api/colleges/search` |
| `fetchFilteredInvoices` (SQL `ILIKE`, `LIMIT`/`OFFSET`) | Prisma `contains … mode: "insensitive"`, `skip`/`take` |
| `fetchInvoicesPages` | the same route returns `totalPages` |
| `<Suspense key={query + currentPage}>` skeleton | a skeleton shown while the fetch for `query + page` is in flight |
| `<Pagination>` with `createPageURL` | same |

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | What does a query match? | Any of: college **name** (contains, case-insensitive), **city** (contains), **state** (two-letter code, e.g. "TX", or full state name, e.g. "Texas"), or **major** (a `Major` whose name contains the query, e.g. "computer" → colleges offering CS or Computer Engineering). One box, OR across all four. |
| D2 | Empty query | All colleges, A–Z, paginated, so the tab doubles as a catalog browser. |
| D3 | Page size and order | 10 per page, ordered by name. An out-of-range `page` clamps to the last page. |
| D4 | What each result shows | Name, city and state, overall acceptance rate, US News rank. If the college is in the student's **last results run**, also its band and odds ("Match · 59% odds"), plus a **Save** button. |
| D5 | Saving | The saved list holds scored colleges, so only colleges in the last run can be saved. Others show a short reason instead of the button: "Not in your results. Your filters (budget, major, location) left it out." or, with no run yet, "Run your college match to see how you compare." Scoring a single college on demand is out of scope (v2). |
| D6 | URL and tabs | The Search view writes `tab=search` alongside `query`/`page`. On load, `?tab=search` opens the Search tab with the query restored. Selecting any other tab clears the search params (`router.replace("/dashboard")`). |
| D7 | Auth | The route requires a signed-in session, like `/api/score` and `/api/explore` (401 otherwise). |

## Interfaces

- **`lib/search.ts`** (pure, unit-tested):
  - `ITEMS_PER_PAGE = 10`
  - `searchWhere(query, majorCips): Prisma.CollegeWhereInput`: the D1 OR clause. `majorCips`
    is the list of majors whose names matched, looked up by the route.
  - `stateCode(query): string | null`: maps "TX" or "Texas" (any case) to "TX".
  - `pageCount(total): number` and `clampPage(page, totalPages): number`.
- **`app/api/colleges/search/route.ts`**: `GET ?query=&page=` returns
  `{ colleges: SearchCollege[], total, totalPages, page }`, where
  `SearchCollege = { id, name, city, state, admitRate, usNewsRank }`. It runs one `count` and
  one `findMany` (`skip`/`take`) with the same `where`.
- **`app/dashboard/search/`**:
  - `SearchBox.tsx`: the course's `<Search>`, with `use-debounce`.
  - `Pagination.tsx`: the course's `<Pagination>`, with prev/next arrows and page numbers.
  - `SearchView.tsx`: reads the params, fetches, renders rows, the skeleton and an empty
    state ("No colleges match "…". Try a name, a state like TX, or a major.").
- **`DashboardClient.tsx`**: replaces the placeholder with `<SearchView>`, passes in the last
  run's `ranked` list plus `isSaved` / `addSaved`, and applies D6. `app/dashboard/page.tsx`
  wraps the client in `<Suspense>`, which `useSearchParams` requires.
- **Styles**: plain CSS in `app/styles/dashboard.css`, reusing the existing card and pill
  styles.
- **Dependency**: `use-debounce`.

## Tests

- `lib/search.test.ts`:
  - `stateCode` handles codes, full names, any case, and non-states → null.
  - `searchWhere` includes name, city and state, includes the major clause only when there are
    matching majors, and returns `{}` for an empty query.
  - `pageCount`: 0 → 1 page, 10 → 1, 11 → 2.
  - `clampPage`: page < 1 → 1, page past the end → the last page.
- Manual checks:
  - Typing updates the URL after 300 ms, and a new search resets to page 1.
  - Back and forward buttons restore earlier searches, and a pasted URL reopens the search.
  - "TX", "Texas", "computer" and "michigan" each return the expected colleges.
  - A college in the last run shows its band and can be saved; one outside it shows the reason.

## Out of scope

Scoring a college that isn't in the last run ("see how you line up" for any college; v2).
Filters beyond the single box (sliders, checkboxes). Moving the dashboard to route-based tabs.
