# Uniseek — Plan

> Status: planning. This file defines scope. Empty placeholder docs
> (`notes.md`, `requirements.md`, `scratch.md`) are unchanged.

## Product in one line

Uniseek helps a student discover colleges that fit them: they fill a guided
intake profile, and the app returns a set of college recommendations that are
evidence-backed, transparent, and honest about uncertainty.

## Current focus: the College Match feature

We are narrowing scope. **For now we build only the College Match feature.**
Everything else (payments/plans, guidance chat, compare, settings, etc.) is
parked and revisited later.

### What "College Match" does

1. The student provides an **intake profile** (academics, preferences, location,
   budget, priorities).
2. The app produces a fixed set of **college recommendations**.
3. Each recommendation carries three separate, clearly-labeled signals:
   - **Match Strength** — how well the college fits the student's profile.
   - **Admission Category** — Reach / Match / Safety.
   - **Confidence** — how sure we are, given the data we have.

The point of separating these three is honesty: a college can be a strong fit
(high Match Strength) while still being a Reach, and we can say so with low or
high Confidence depending on the evidence.

### Scope for this phase (in)

- Intake form → saved profile.
- A matching step that turns a profile into a ranked list of colleges.
- A results view showing each college with the three labels above.
- Persisting profiles and results per user (see `STACK.md`).

### Out of scope for now (later)

- Stripe, payment plans, tiers/paywalls.
- Guidance/chat, compare screen, explorer, settings polish.
- Real admissions modeling — start with a simple, transparent scoring approach
  and improve it later.

## Rough build order

1. **Foundation** — Next.js app + Postgres + Prisma schema + NextAuth login
   (see `STACK.md`). Get "a logged-in user exists and has a row in the DB."
2. **Intake** — a form that writes a `Profile` row for the logged-in user.
3. **Match** — a server function that reads a `Profile` and produces
   recommendations (start with straightforward, explainable scoring).
4. **Results** — a page that renders the recommendations with Match Strength,
   Admission Category, and Confidence.
5. **Persist & revisit** — save results so the user can come back to them.

## Success signal

A logged-in student can fill intake, get a saved set of recommendations, and
see all three labels per college — end to end.
