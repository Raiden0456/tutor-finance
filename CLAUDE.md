# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm setup          # First-time: install deps + build shared packages
pnpm dev            # Run all apps in parallel (API :3000, web :4321)

# Database
pnpm db:up          # Start PostgreSQL via Docker Compose
pnpm db:down        # Stop PostgreSQL
pnpm db:migrate     # Apply migrations
pnpm db:generate    # Regenerate migrations from schema changes
pnpm db:seed        # Populate demo data
pnpm db:auth:generate  # Regenerate Better Auth tables in Drizzle schema

# Quality
pnpm lint           # ESLint across all workspaces
pnpm typecheck      # TypeScript type checking
pnpm format         # Prettier (single quotes, 100-char width, trailing commas)
pnpm build          # Build all packages in dependency order
```

**Workspace-targeted commands:** `pnpm --filter @tutor-finance/api <cmd>` or `pnpm --filter @tutor-finance/web <cmd>`

## Architecture

Turborepo + pnpm monorepo. Build order enforced: `shared` → `auth` → `api` / `web`.

```
apps/api/    # NestJS 11 REST API
apps/web/    # Astro 5 SSR + React 19 islands
packages/auth/    # Shared Better Auth instance (Drizzle + pg adapter)
packages/shared/  # Zod schemas, currency/money helpers, shared types
drizzle/          # Generated migrations
scripts/          # migrate.ts, seed.ts
docker/           # docker-compose.yml (PostgreSQL 17)
```

### API (`apps/api`)

NestJS with class-based DI. Module pattern: controller → service → DTOs.

- **Entry:** `src/main.ts` → `AppModule`
- **Global:** `DbModule` (pool singleton), `ValidationPipe` with implicit conversion
- **Feature modules:** `Students`, `Lessons`, `Transactions`, `Settings`, `Dashboard`, `Fx`, `Recurring`, `Health`
- **Config:** `src/config.ts` — `required()`, `optional()`, `num()`, `bool()` helpers; no `.env` loading libraries, Turbo passes env vars
- **DB:** Drizzle ORM, schema at `src/db/schema.ts`, single `DATABASE_URL`
- **Auth:** `@thallesp/nestjs-better-auth` — auth instance in `src/auth/auth.provider.ts`; CORS allows `PUBLIC_APP_URL` and `BETTER_AUTH_URL`

### Web (`apps/web`)

Astro SSR (Node.js adapter, standalone). React 19 used only for interactive islands.

- **Pages:** `src/pages/` (file-based routing)
- **Islands:** `src/islands/` — hydrated React components
- **Auth middleware:** `src/middleware.ts` — protects all routes except `/login`, `/sign-up`, `/forgot-password`, `/reset-password`
- **Styling:** Tailwind v4 (Vite plugin) + shadcn/ui; theme: Rose Pine
- **i18n:** `en` (default), `ru`

### Shared Packages

- **`@tutor-finance/shared`:** Zod schemas, currency/money utilities, shared TypeScript types
- **`@tutor-finance/auth`:** `createAuth()` factory, email abstraction (SMTP or Resend), email templates, auth client export

## UI & Animation Rules

- **All elements that change visibility or state MUST have smooth transitions/animations.** No abrupt show/hide, no instant layout shifts.
- Use Tailwind `transition-*` utilities as baseline (`transition-all duration-200 ease-in-out` or similar).
- For enter/exit animations (conditional rendering), use `AnimatePresence` from Framer Motion or CSS-based approaches that handle unmounting gracefully.
- Loading states, skeleton screens, error states — all transitions must be smooth.
- This applies to: dropdowns, modals, dialogs, tooltips, collapsibles, tabs, conditional form sections, badges, counters, everything.

## Key Conventions

- **Mobile-first, baseline 390px (iPhone 14).** Use cards over tables; dialogs use bottom-sheet pattern on mobile.
- Tailwind v4 syntax — no `tailwind.config.js`, config lives in CSS via `@theme`.
- Drizzle schema is the source of truth; always regenerate migrations after schema changes (`pnpm db:generate`).
- Better Auth tables are managed separately — use `pnpm db:auth:generate` after auth config changes.
- Auth email provider is selected by `AUTH_EMAIL_PROVIDER` env var (`smtp` or `resend`).
- TypeScript strict mode everywhere; ES2022 target.
