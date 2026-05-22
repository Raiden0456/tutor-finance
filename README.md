# Uchetka

Open-source finance dashboard for tutors. Lessons, students, payments, expenses, and income tracking — without spreadsheet chaos.

![Uchetka preview](apps/web/public/og.png)

## What it does

- Track students, lesson history, schedules, and payment status.
- See income, expenses, planned revenue, and net results in one dashboard.
- Manage one-time and recurring transactions.
- Work with multiple currencies: USD, EUR, RUB, GBP, UAH, KZT, TRY, PLN, USDT, USDC.
- Use auth, protected pages, and first-party cookies via the web reverse proxy.
- Run locally with PostgreSQL and Redis through Docker Compose.

## Preview assets

| Social preview                                    | Login illustration                                            |
| ------------------------------------------------- | ------------------------------------------------------------- |
| ![Uchetka social preview](apps/web/public/og.png) | ![Uchetka login illustration](apps/web/public/login-hero.svg) |

## Stack

- Turborepo + pnpm workspaces
- `apps/web` — Astro 5 SSR, React 19 islands, Tailwind v4, shadcn/ui
- `apps/api` — NestJS 11 REST API, Drizzle ORM, Better Auth
- `packages/shared` — Zod schemas, currency and money helpers
- `packages/auth` — shared Better Auth factory, email templates, auth client
- PostgreSQL 17 + Redis 7 via Docker Compose

## Run locally

Requirements:

- Node.js 22+
- pnpm 10+
- Docker

```bash
cp .env.example .env
pnpm setup
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed # optional demo data: demo@tutor.local / demo12345
pnpm dev
```

Web: http://localhost:4321  
API: http://localhost:3000

## Useful commands

```bash
pnpm dev              # run API and web in parallel
pnpm build            # build all workspaces
pnpm lint             # ESLint across the monorepo
pnpm typecheck        # TypeScript checks
pnpm format           # Prettier

pnpm db:up            # start PostgreSQL + Redis
pnpm db:down          # stop local services
pnpm db:migrate       # apply migrations
pnpm db:generate      # generate migrations from Drizzle schema
pnpm db:seed          # seed demo data
pnpm db:auth:generate # regenerate Better Auth tables
```

## Project structure

```txt
apps/api/        NestJS API
apps/web/        Astro SSR web app + React islands
packages/auth/   Better Auth setup shared by API/web
packages/shared/ Zod schemas, shared types, money helpers
drizzle/         Generated migrations
scripts/         Migration and seed scripts
docker/          PostgreSQL + Redis compose setup
```

## Better Auth schema

Better Auth tables (`user`, `session`, `account`, `verification`) live in `packages/auth/src/schema.ts` and are included in Drizzle generation.

After changing auth config or upgrading Better Auth:

```bash
pnpm db:auth:generate
pnpm db:generate
pnpm db:migrate
```
