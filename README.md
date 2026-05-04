# tutor-finance

Open-source self-hosted finance tracker for tutors. Single-user MVP.

## Stack

- Turborepo + pnpm workspaces
- `apps/web` Astro 5 (SSR, islands) + React 19 + Tailwind + shadcn/ui
- `apps/api` NestJS 11 + Apollo GraphQL (code-first) + Mongoose + Better Auth
- `packages/shared` Zod schemas, currency / money helpers
- `packages/auth` shared `betterAuth()` instance (MongoDB adapter)
- MongoDB (replica set), MinIO, Mailhog, Caddy in docker-compose

## Run locally

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d mongo mailhog minio
pnpm install
pnpm --filter @tutor-finance/shared --filter @tutor-finance/auth build
pnpm dev
```

Web: http://localhost:4321 · API: http://localhost:3000/graphql · Mailhog: http://localhost:8025

## Run full stack in Docker

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up --build -d
```

Caddy proxies http://localhost (port 80) — `/api/*` and `/graphql` go to the api, everything else to Astro.
