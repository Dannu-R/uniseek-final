# uniseek_final

> **Note:** Current focus is the **College Match** feature. See `docs/PLAN.md`
> for scope and `docs/STACK.md` for the planned stack (Next.js, Postgres,
> Prisma, NextAuth; Stripe/payments later).

## Deploying: program rankings

After running migrations on a new or production database, run `npm run rankings:import`
(the ranking files live in `data/rankings/`). Until then the scoring API falls back to
institutional ranks for major-specific quality and logs a warning naming the missing lists.
