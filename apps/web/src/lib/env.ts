// Server-only env access. Vite/Astro exposes import.meta.env at build/SSR time.
const env = import.meta.env;

export const PUBLIC_APP_URL = (env.PUBLIC_APP_URL as string | undefined) ?? 'http://localhost:4321';

// SERVER_API_URL is used ONLY by SSR / Astro frontmatter to talk to the API
// directly (can be an internal Render hostname for speed). The browser must
// never use this — it goes through the same-origin proxy at /api/*.
export const SERVER_API_URL =
  (env.SERVER_API_URL as string | undefined) ??
  (env.PUBLIC_API_URL as string | undefined) ??
  'http://localhost:3000';

// Browser-facing API base. Empty string => relative URLs => same-origin requests
// that hit the Astro `/api/[...path]` reverse proxy. This makes auth cookies
// first-party in all browsers (incl. Safari ITP).
export const BROWSER_API_URL =
  typeof window !== 'undefined' ? window.location.origin : PUBLIC_APP_URL;
