// Prisma seed — placeholder.
//
// Runs against the production database if enabled in the Dockerfile CMD
// (`npx prisma db seed && ...`). Keep every write idempotent (use `upsert`)
// so re-running on each deploy is safe.
//
// To enable later:
//   1. Add a runner + config to package.json:
//        "prisma": { "seed": "tsx prisma/seed.ts" }   (and add `tsx` as a devDependency)
//   2. Update the Dockerfile CMD to run `npx prisma db seed` before `node server.js`.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // No seed data yet. Add idempotent upserts here, e.g.:
  // await prisma.user.upsert({
  //   where: { email: "admin@example.com" },
  //   update: {},
  //   create: { email: "admin@example.com" },
  // });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
