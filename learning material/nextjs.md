# Next.js — the non-obvious parts

> Scope: the stuff that isn't spelled out cleanly in the docs, or where the
> "correct" pattern differs from what you'd guess. Assumes you already know
> SSR/SSG/ISR, streaming, Server vs Client Components, layouts, and data
> fetching in async Server Components. This is App Router, Next 15/16 + React 19.

---

## 1. `params` and `searchParams` are now Promises (async)

This is the single biggest "why doesn't my code from the tutorial work" change.
In Next 15+, the dynamic props are **Promises**. You must `await` them (server)
or unwrap with `use()` (client).

```jsx
// app/colleges/[slug]/page.js  — SERVER component
export default async function CollegePage({ params, searchParams }) {
  const { slug } = await params;            // ← await, not params.slug
  const { sort } = await searchParams;      // e.g. ?sort=cost
  const college = await getCollege(slug);
  // ...
}
```

```jsx
// A CLIENT component that receives params — unwrap with the `use` hook
"use client";
import { use } from "react";

export default function Panel({ params }) {
  const { slug } = use(params);   // `use` unwraps a promise during render
  // ...
}
```

Why they did this: it lets Next start rendering the static shell **before** the
request-specific values resolve (part of the streaming/PPR story). The mental
model: `params`/`searchParams` are request data, and request data is now async.

Same treatment for the request APIs — these all return Promises now:

```jsx
import { cookies, headers, draftMode } from "next/headers";

const cookieStore = await cookies();
const token = cookieStore.get("session")?.value;

const h = await headers();
const ua = h.get("user-agent");
```

**Gotcha:** `cookies()` is read-only in Server Components. You can only *set*
cookies inside a Server Action or a Route Handler (see §3 and §6).

---

## 2. Reading URL state on the client — the four navigation hooks

All from `next/navigation` (NOT `next/router`, that's the old Pages Router).
These are how you drive the search/filter/pagination UI you were about to learn.

```jsx
"use client";
import { useSearchParams, usePathname, useRouter, useParams } from "next/navigation";

function Filters() {
  const searchParams = useSearchParams(); // ReadonlyURLSearchParams (like URLSearchParams)
  const pathname     = usePathname();     // "/colleges" — the path, no query string
  const { replace }  = useRouter();       // programmatic navigation
  const params       = useParams();       // dynamic segments, e.g. { slug: "mit" }

  function onSearch(term) {
    // Build the next query string immutably off the current one
    const next = new URLSearchParams(searchParams); // clone it (it's read-only)
    if (term) next.set("q", term);
    else next.delete("q");
    next.set("page", "1"); // reset pagination when the query changes

    // replace() updates the URL WITHOUT adding a history entry (so Back doesn't
    // walk through every keystroke). push() would add one.
    replace(`${pathname}?${next.toString()}`);
  }
  // ...
}
```

Key distinctions people miss:
- **`replace` vs `push`** — `replace` swaps the current history entry (right for
  live search/filters, so the back button isn't polluted). `push` adds one
  (right for "go to a new page" actions).
- **`router.refresh()`** — re-runs the Server Components for the current route
  and refetches their data, *without* losing client state (form inputs, scroll).
  This is how you "reload the server data" after a mutation without a full nav.
- **`useSearchParams()` forces a Suspense boundary.** Any Client Component that
  calls it bails out to client-side rendering, and Next will error at build if
  it isn't wrapped in `<Suspense>`. Pattern:

```jsx
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<FiltersSkeleton />}>
      <Filters />   {/* the component that calls useSearchParams */}
    </Suspense>
  );
}
```

**The pagination Suspense-`key` trick** (not obvious, comes straight from the
search/pagination chapter): give your streaming results boundary a `key` that
includes the query + page. When the key changes, React throws away the old
subtree and re-shows the fallback — so you get a fresh loading state per page.

```jsx
<Suspense key={query + currentPage} fallback={<TableSkeleton />}>
  <CollegeTable query={query} page={currentPage} />
</Suspense>
```

**Debouncing search** — don't fire a nav on every keystroke. The docs use
`use-debounce`:

```jsx
import { useDebouncedCallback } from "use-debounce";
const onSearch = useDebouncedCallback((term) => { /* replace(...) */ }, 300);
```

---

## 3. Server Actions — the logic, not just the `"use server"` line

A Server Action is a function that runs **on the server** but can be called
directly from client code / passed to a `<form action={...}>`. It's an RPC
endpoint Next generates for you.

Two ways to declare:

```jsx
// (a) Inline in a Server Component — directive at top of the function
export default function Page() {
  async function createMatch(formData) {
    "use server";                       // ← this function now runs on the server
    const collegeId = formData.get("collegeId");
    // ...db write...
  }
  return <form action={createMatch}> ... </form>;
}
```

```jsx
// (b) In a dedicated file — directive at top of the FILE (most common)
// app/lib/actions.js
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveQuiz(formData) {
  const budget = Number(formData.get("budget"));
  await db.quizResponse.create({ data: { budget /* ... */ } });

  revalidatePath("/dashboard"); // bust the cache for that route (see §4)
  redirect("/dashboard");       // note: this THROWS — see gotcha below
}
```

Things the tutorial glosses over:

- **`formData.get()` returns strings** (or `File`). Always coerce
  (`Number(...)`, `=== "on"` for checkboxes) and validate. Zod is the common
  choice; validate before touching the DB.
- **You cannot return non-serializable data** from an action (no functions, no
  class instances). Return plain objects.
- **`redirect()` and `notFound()` work by throwing** a special error
  (`NEXT_REDIRECT` / `NEXT_HTTP_ERROR_FALLBACK`). So:
  - Call them **outside** a `try/catch`, OR your `catch` will swallow the
    redirect and it silently won't happen. If you must, rethrow it.
  - Put `redirect()` *after* the DB work succeeds, not inside the `try`.

```jsx
export async function saveQuiz(formData) {
  try {
    await db.quizResponse.create({ /* ... */ });
  } catch (e) {
    return { message: "Database error." }; // return errors as data
  }
  revalidatePath("/dashboard");
  redirect("/dashboard"); // OUTSIDE the try — otherwise the catch eats it
}
```

---

## 4. The React 19 form hooks — `useActionState`, `useFormStatus`, `useOptimistic`

These replace the old ad-hoc `useState` + `onSubmit` dance and are the modern
way to wire forms to Server Actions.

### `useActionState` — action result + pending, with progressive enhancement
(This is the renamed `useFormState`; it now lives in `react`, not `react-dom`,
and also gives you `isPending`.)

```jsx
"use client";
import { useActionState } from "react";
import { saveQuiz } from "@/app/lib/actions";

const initialState = { message: null, errors: {} };

export default function QuizForm() {
  // [current state, the action you pass to <form>, pending flag]
  const [state, formAction, isPending] = useActionState(saveQuiz, initialState);

  return (
    <form action={formAction}>
      <input name="budget" type="number" />
      {/* field errors returned from the action as data */}
      {state.errors?.budget && <p>{state.errors.budget}</p>}

      <button disabled={isPending}>{isPending ? "Saving…" : "Save"}</button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

The action signature changes when used here — it receives `prevState` first:

```jsx
// actions.js
export async function saveQuiz(prevState, formData) {   // ← prevState is new
  // validate, return { errors } or { message } as data; or redirect on success
}
```

### `useFormStatus` — read the parent form's submit state from a child
Must be used in a component **rendered inside** the `<form>`, not the one that
renders the form. This is why submit buttons are usually their own component.

```jsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus(); // true while the form's action runs
  return <button disabled={pending}>{pending ? "Submitting…" : "Submit"}</button>;
}
```

### `useOptimistic` — show the result before the server confirms
Render an optimistic value immediately, then reconcile when the action resolves
(or React reverts it if the action throws).

```jsx
"use client";
import { useOptimistic } from "react";

function SavedList({ saved, saveAction }) {
  const [optimistic, addOptimistic] = useOptimistic(
    saved,
    (state, newCollege) => [...state, { ...newCollege, pending: true }]
  );

  async function action(formData) {
    const college = { id: formData.get("id"), name: formData.get("name") };
    addOptimistic(college);   // UI updates instantly
    await saveAction(formData); // real write; list re-syncs from server after
  }
  return (/* render `optimistic` */);
}
```

---

## 5. Caching & revalidation — what actually invalidates what

Next 15+ changed the defaults: **`fetch` is no longer cached by default**, and
GET Route Handlers aren't cached by default either. So the confusing part is
now less "why is it cached" and more "which lever revalidates which thing."

```jsx
// Opt INTO caching per-fetch:
await fetch(url, { cache: "force-cache" });          // cache indefinitely
await fetch(url, { next: { revalidate: 3600 } });    // ISR: refresh hourly
await fetch(url, { next: { tags: ["colleges"] } });  // tag it for targeted busting
```

Two revalidation functions (from `next/cache`), used **inside Server Actions or
Route Handlers**:

```jsx
import { revalidatePath, revalidateTag } from "next/cache";

revalidatePath("/dashboard");   // throw out cached render for this exact path
revalidatePath("/colleges/[slug]", "page"); // or a dynamic route pattern
revalidateTag("colleges");      // bust everything tagged "colleges"
```

For **non-fetch data** (e.g. a Prisma query), `fetch` caching doesn't apply.
Wrap it in `unstable_cache` to get the same tag/revalidate behavior:

```jsx
import { unstable_cache } from "next/cache";

const getTopColleges = unstable_cache(
  async () => db.college.findMany({ orderBy: { rank: "asc" }, take: 10 }),
  ["top-colleges"],                 // cache key parts
  { tags: ["colleges"], revalidate: 3600 }
);
// later: revalidateTag("colleges") busts this too.
```

**Force a route to be dynamic** (opt out of all caching / static rendering):

```jsx
export const dynamic = "force-dynamic";     // route segment config
// or, more targeted:
export const revalidate = 0;
```

### `cache()` from React — request-level dedup (different from the above!)
This is NOT persistent caching. It memoizes a function **within a single
request/render** so calling it from three components hits the DB once. Use it
for the "fetch the current user in the layout AND the page AND a nested
component" problem.

```jsx
import { cache } from "react";
export const getUser = cache(async (id) => db.user.findUnique({ where: { id } }));
// Called 3x in one render → 1 DB query. Resets every request.
```

---

## 6. Route Handlers vs Server Actions — when to use which

Both run on the server. The decision:

- **Server Action** — a mutation triggered by *your own* UI (form submit,
  button). No URL, no manual fetch, gets progressive enhancement for free.
  Prefer this for form/mutation flows inside the app.
- **Route Handler** (`app/api/.../route.js`) — you need an actual HTTP endpoint:
  webhooks (Stripe), a public/mobile API, third-party callbacks, or returning
  non-HTML (JSON, files, streamed responses).

```jsx
// app/api/colleges/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  // request is the standard web Request; parse query off nextUrl
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const colleges = await db.college.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
  });
  return NextResponse.json(colleges);
}

export async function POST(request) {
  const body = await request.json();     // parse JSON body
  const created = await db.college.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
```

Notes:
- Export a function **named after the HTTP verb** (`GET`, `POST`, `PATCH`,
  `DELETE`). A file can export several.
- `NextResponse.json(...)` is the shortcut; `NextResponse` also does redirects
  (`NextResponse.redirect(url)`) and cookie setting (`res.cookies.set(...)`).
- A folder can't have both `page.js` and `route.js` — one segment is either a
  page or an endpoint.

---

## 7. The Server/Client boundary gotchas (the ones that actually bite)

1. **You can't pass functions (or other non-serializable props) from a Server
   Component to a Client Component.** Props crossing the boundary are
   serialized. Server Actions are the exception — Next specially handles those.

2. **`"use client"` is a boundary, not a file-by-file label.** Once a module has
   it, every module it *imports* becomes part of the client bundle too. Keep it
   as low in the tree as possible.

3. **Composition pattern — pass Server Components as `children`/props into
   Client Components** to keep them server-rendered instead of getting pulled
   into the client bundle:

```jsx
// ClientShell.js
"use client";
export default function ClientShell({ children }) {
  const [open, setOpen] = useState(false);
  return <div onClick={() => setOpen(!open)}>{children}</div>;
}

// page.js (Server Component)
export default function Page() {
  return (
    <ClientShell>
      <ServerOnlyExpensiveThing />  {/* stays on the server — it's a child */}
    </ClientShell>
  );
}
```
The rule: a Client Component can *render* Server Components handed to it as
props, it just can't *import* them.

4. **Layout-segment hooks** (niche, for building active-nav / tab UIs without
   parsing `pathname` yourself):

```jsx
"use client";
import { useSelectedLayoutSegment } from "next/navigation";
const segment = useSelectedLayoutSegment(); // active child segment of THIS layout
```

---

## 8. Small sharp edges

- **`redirect()` in a Server Component** must run before you return JSX; it
  throws, so nothing after it runs.
- **`notFound()`** renders the nearest `not-found.js`. Same throw semantics.
- **Middleware runs on the Edge runtime** by default → no Node APIs (no Prisma,
  no `fs`) inside `middleware.js`. Use it for cheap checks (auth cookie present?
  redirect), not DB work.
- **`loading.js` is just `<Suspense>` sugar** wrapping the page — but only for
  navigations *into* that segment. In-place updates (changing searchParams on
  the same page) won't re-trigger it; that's what the manual `<Suspense key>`
  in §2 is for.
- **`export const runtime = "nodejs" | "edge"`** picks the runtime per route.
  Anything touching Prisma/Node stays `"nodejs"` (the default).
- **Env vars:** only `NEXT_PUBLIC_`-prefixed vars reach the browser bundle.
  Everything else is server-only — good, keep secrets unprefixed.

---

*Living doc — we'll add sections as they come up in Uniseek. Next likely
additions: data mutation flows end-to-end, and error/`error.js` boundaries.*
