# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm setup          # First-time: install deps + build shared packages
pnpm dev            # Run workspace dev scripts in parallel (currently API :3000, web :4321)
pnpm --filter @tutor-finance/mobile start   # Expo dev client (mobile)
pnpm --filter @tutor-finance/mobile android # Open Android via Expo dev client
pnpm --filter @tutor-finance/mobile ios     # Open iOS via Expo dev client

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

**Workspace-targeted commands:** `pnpm --filter @tutor-finance/<api|web|mobile> <cmd>`

There are no tests in this codebase.

## Architecture

Turborepo + pnpm monorepo. Build order enforced: `shared` → `auth` → `api` / `web`.

```
apps/api/    # NestJS 11 REST API
apps/web/    # Astro 5 SSR + React 19 islands
apps/mobile/ # Expo 54 + React Native wrapper over web app (WebView + push bridge)
packages/auth/    # Shared Better Auth instance (Drizzle + pg adapter)
packages/shared/  # Zod schemas, currency/money helpers, shared types
drizzle/          # Generated migrations
scripts/          # migrate.ts, seed.ts
docker/           # docker-compose.yml (PostgreSQL 17)
```

### API (`apps/api`)

NestJS with class-based DI. Module pattern: controller → service → DTOs.

- **Entry:** `src/main.ts` → `AppModule`. `bodyParser: false` is required for Better Auth — do not enable it.
- **Global:** `DbModule` (pool singleton), `ValidationPipe` with implicit conversion
- **Feature modules:** `Students`, `Lessons`, `Transactions`, `Settings`, `Dashboard`, `Fx`, `Recurring`, `Health`
- **Config:** `src/config.ts` — `required()`, `optional()`, `num()`, `bool()` helpers; no `.env` loading libraries, Turbo passes env vars
- **DB:** Drizzle ORM, schema at `src/db/schema.ts`, single `DATABASE_URL`
- **Auth:** `@thallesp/nestjs-better-auth` — auth instance in `src/auth/auth.provider.ts`; CORS allows `PUBLIC_APP_URL` and `BETTER_AUTH_URL`. Use `@CurrentUser()` decorator on any controller route that requires an authenticated user.
- **Scheduling:** `FxModule` refreshes exchange rates daily at 6am via `@Cron`; `RecurringModule` auto-generates expenses on schedule.

### Web (`apps/web`)

Astro SSR (Node.js adapter, standalone). React 19 used only for interactive islands.

- **Pages:** `src/pages/` (file-based routing)
- **Islands:** `src/islands/` — hydrated React components
- **Auth middleware:** `src/middleware.ts` — protects all routes except `/login`, `/sign-up`, `/forgot-password`, `/reset-password`
- **API client:** `src/lib/api.ts` exports two versions. The browser variant (reads `BROWSER_API_URL`, which resolves to `window.location.origin`) is used inside React islands and goes through the same-origin reverse proxy at `src/pages/api/[...path].ts`. The server variant (reads `SERVER_API_URL`) is used in `.astro` files and calls the API directly. This keeps auth cookies first-party in all browsers (incl. Safari ITP) even when the API is on a different domain.
- **Styling:** Tailwind v4 (Vite plugin) + shadcn/ui;
- **i18n:** `en` (default), `ru`

### Mobile (`apps/mobile`)

Expo app using a `WebView` shell around the web app instead of a fully native UI.

- **Entry:** `index.ts` → `registerRootComponent(App)`
- **Main app:** `App.tsx` renders `react-native-webview` pointing to `EXPO_PUBLIC_WEB_APP_URL` (fallback `http://localhost:4321`)
- **Navigation:** internal links stay in WebView, external links open via `Linking.openURL`
- **Push:** `expo-notifications` + `expo-device`; Expo push token is sent into web app via `postMessage` (`tutor-finance:expo-push-token`)
- **Config:** `app.config.ts` sets `scheme`, iOS/Android package IDs, and `extra.eas.projectId` via `EXPO_PUBLIC_EAS_PROJECT_ID`
- **Runtime note:** scripts use `--dev-client`; this is intended for custom dev client builds, not Expo Go

### Shared Packages

- **`@tutor-finance/shared`:** Zod schemas, currency/money utilities, shared types. Supported currencies: USD, EUR, RUB, GBP, UAH, KZT, TRY, PLN, USDT, USDC. USDT/USDC are pinned 1:1 to USD.
- **`@tutor-finance/auth`:** `createAuth()` factory, email abstraction (SMTP or Resend), email templates, auth client export.

## UI & Animation Rules

- **All elements that change visibility or state MUST have smooth transitions/animations.** No abrupt show/hide, no instant layout shifts.
- Use Tailwind `transition-*` utilities as baseline (`transition-all duration-200 ease-in-out` or similar).
- For enter/exit animations (conditional rendering), use `AnimatePresence` from Framer Motion or CSS-based approaches that handle unmounting gracefully.
- Loading states, skeleton screens, error states — all transitions must be smooth.
- This applies to: dropdowns, modals, dialogs, tooltips, collapsibles, tabs, conditional form sections, badges, counters, everything.

## Key Conventions

- **Mobile-first, baseline 390px (iPhone 14).** Use cards over tables; dialogs use bottom-sheet pattern on mobile.
- **Money is stored as minor units (integers).** Always use `toMinorUnits()` / `fromMinorUnits()` from `@tutor-finance/shared` when reading or writing monetary values. Never store or pass decimal amounts directly.
- Tailwind v4 syntax — no `tailwind.config.js`, config lives in CSS via `@theme`.
- Drizzle schema is the source of truth; always regenerate migrations after schema changes (`pnpm db:generate`).
- Better Auth tables are managed separately — use `pnpm db:auth:generate` after auth config changes.
- Auth email provider is selected by `AUTH_EMAIL_PROVIDER` env var (`smtp` or `resend`). Set `MAIL_FROM` for the sender address.
- TypeScript strict mode everywhere; ES2022 target.
- Git commits follow `type(scope): description` — types: `feat`, `fix`, `style`, `refactor`.
