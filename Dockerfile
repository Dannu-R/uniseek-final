# Capstone deployment image — Next.js standalone + Prisma migrate-on-start.
#
# Requires next.config.ts to include:  output: 'standalone'
# The entrypoint runs `prisma migrate deploy` BEFORE the server starts, so the
# database schema is always current before new code serves traffic.

# ---- build stage: compile the Next.js standalone bundle ----
FROM node:22-alpine AS build
WORKDIR /src
# openssl + libc6-compat: required by Prisma's engine on Alpine (musl).
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- prisma stage: isolated CLI closure for migrate-on-start ----
# Installed on its own (fresh package.json, no app deps) so the runtime image
# ships just the ~150MB migrate tool instead of the full ~800MB node_modules.
# Keep this version in sync with `prisma` in package.json.
FROM node:22-alpine AS prismacli
WORKDIR /pcli
RUN apk add --no-cache openssl
RUN npm init -y >/dev/null && npm install prisma@6.19.3 --omit=dev

# ---- runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache openssl libc6-compat

# Next standalone output + static assets (ship their own trimmed node_modules)
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
COPY --from=build /src/public ./public

# Prisma schema + migrations, plus the isolated CLI in its own dependency tree.
# We invoke prisma via its package entry (build/index.js) — not the
# node_modules/.bin/prisma symlink, which Docker's COPY would dereference into a
# plain file that can't find its sibling .wasm assets. Its deps resolve from
# ./prisma-cli/node_modules, kept separate from the app tree so neither clobbers
# the other.
COPY --from=build /src/prisma ./prisma
COPY --from=prismacli /pcli/node_modules ./prisma-cli/node_modules

EXPOSE 3000
# To enable seeding later, add a db seed call before the server starts:
#   ... migrate deploy ... && node prisma-cli/node_modules/prisma/build/index.js db seed && node server.js
CMD ["sh", "-c", "node prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma && node server.js"]
