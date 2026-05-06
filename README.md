# tutor-finance

Open-source self-hosted finance tracker for tutors. Single-user MVP.

## Stack

- Turborepo + pnpm workspaces
- `apps/web` Astro 5 (SSR, islands) + React 19 + Tailwind + shadcn/ui
- `apps/api` NestJS 11 (REST) + Drizzle ORM + Better Auth
- `packages/shared` Zod schemas, currency / money helpers
- `packages/auth` shared `betterAuth()` instance (Drizzle / pg adapter)
- PostgreSQL (only service in docker-compose during MVP)

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm --filter @tutor-finance/shared --filter @tutor-finance/auth build
pnpm db:up                  # starts postgres
pnpm db:generate            # generate domain migrations from drizzle schema
pnpm db:migrate             # apply migrations to the database
pnpm dev
```

Web: http://localhost:4321 · API: http://localhost:3000

### Better Auth schema

The Better Auth tables (`user`, `session`, `account`, `verification`) live in
`packages/auth/src/schema.ts`. They are picked up by Drizzle along with the
domain tables. To regenerate them after upgrading Better Auth or adding plugins:

```bash
pnpm db:auth:generate       # runs `npx @better-auth/cli generate`
pnpm db:generate            # produce SQL migration for the diff
pnpm db:migrate
```
