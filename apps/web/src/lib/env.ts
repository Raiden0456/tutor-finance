// Server-side env (SSR + reverse proxy) is read from process.env at RUNTIME.
// Don't use `import.meta.env.SERVER_API_URL` — Vite inlines that at build time,
// and on platforms like Render the env vars aren't yet present during the build,
// so the value would be baked in as `undefined` and fall back to localhost.
//
// `PUBLIC_*` vars are different — they need to ship to the client bundle, so
// Vite has to substitute them at build time via `import.meta.env`.

const proc =
  typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
const viteEnv = import.meta.env as Record<string, string | undefined>;

export const PUBLIC_APP_URL =
  viteEnv.PUBLIC_APP_URL ?? proc.PUBLIC_APP_URL ?? 'http://localhost:4321';

// SERVER_API_URL is used ONLY by SSR / Astro frontmatter and the /api/* reverse
// proxy. Read from process.env at runtime so it works on Render.
export const SERVER_API_URL =
  proc.SERVER_API_URL ?? proc.PUBLIC_API_URL ?? viteEnv.SERVER_API_URL ?? 'http://localhost:3000';

// Browser-facing API base. In the browser, requests go to the current origin
// and hit the same-origin `/api/*` reverse proxy, which keeps auth cookies
// first-party (Safari ITP friendly). On the server we fall back to the app's
// own public URL (only used for SSR hydration of islands; no real fetches).
export const BROWSER_API_URL =
  typeof window !== 'undefined' ? window.location.origin : PUBLIC_APP_URL;
