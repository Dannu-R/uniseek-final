# Uniseek — Planned Stack

> Status: planning. This describes the intended fullstack setup for
> `uniseek-final`. Nothing here is built yet.

## The stack

| Layer          | Choice                | Role                                          |
| -------------- | --------------------- | --------------------------------------------- |
| Framework/UI   | **Next.js** (App Router) | Pages, server actions/route handlers, rendering |
| Database       | **Postgres**          | Stores users, profiles, recommendations       |
| ORM            | **Prisma**            | Typed DB access + schema migrations           |
| Auth           | **NextAuth**          | Sign-in and sessions                          |
| Payments       | **Stripe** *(later)*  | Payment plans — deferred, not built now        |

## How the pieces fit together

- **Next.js** is the whole app: the pages the student sees, and the server-side
  code (server actions / route handlers) that does the work.
- **NextAuth** handles login. Once someone is signed in, we know which user a
  request belongs to, so we can save and load their data.
- **Prisma** is how our server code talks to the database — we describe our
  tables in a schema file, and Prisma gives us safe functions to read/write them.
- **Postgres** is where the data actually lives (users, profiles, results).
- **Stripe** comes later, when we add paid plans. Nothing in the College Match
  work should depend on it.

Request flow, roughly:

```
Student → Next.js page → (NextAuth: who is this?) → server code
        → Prisma → Postgres → back up to the page
```

## Data model (first draft — college match only)

Just enough to support the College Match feature. Refine when we write the real
Prisma schema.

- **User** — created/managed by NextAuth (id, email, etc.).
- **Profile** — one per user. The intake answers: academics, preferences,
  location, budget, priorities. `userId` links it to the User.
- **Recommendation** — a college result generated for a Profile. Fields:
  college identity, **matchStrength**, **admissionCategory**
  (Reach/Match/Safety), **confidence**, and the reasoning/evidence behind it.

(Colleges themselves can start as seeded/fake data and move into their own table
later.)

## Setup order (when we start building)

1. `create-next-app` (App Router).
2. Stand up a Postgres database and put its connection string in `.env`.
3. Add Prisma, write the schema above, run the first migration.
4. Add NextAuth, confirm a user can sign in and gets a row in the DB.
5. Only then start on intake → match → results (see `PLAN.md`).

## Explicitly deferred

- **Stripe / payment plans.** We will design the schema so adding a `plan` or
  `subscription` later is easy, but we build none of it now.
