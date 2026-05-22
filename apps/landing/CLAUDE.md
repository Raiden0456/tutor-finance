# apps/landing

Static AstroJS one-page marketing site for Uchetka. Bilingual EN/RU.

## Conventions

- `src/components/ui/button.tsx` and `src/components/ui/card.tsx` are duplicated from `apps/web/src/components/ui/`. If you make non-trivial changes here, mirror them in `apps/web` (and vice versa). When duplication grows past ~5 primitives, lift to `packages/ui`.
- `src/styles/globals.css` is a brand-only slice of `apps/web/src/styles/globals.css` (no finance-domain tokens like `--income`/`--expense`). Brand palette stays in sync by convention.
- All sign-in / sign-up CTAs link to `${import.meta.env.PUBLIC_WEB_URL}` (defaults to `http://localhost:4321`).
- Static output (`output: 'static'`). Only two React islands: `ThemeToggle` and `LanguageSwitcher` — everything else is plain `.astro`.
- Dev port: `4322`.
