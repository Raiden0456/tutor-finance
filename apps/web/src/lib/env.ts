// Server-only env access. Vite/Astro exposes import.meta.env at build/SSR time.
const env = import.meta.env;

export const PUBLIC_API_URL =
  (env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000';
export const PUBLIC_APP_URL =
  (env.PUBLIC_APP_URL as string | undefined) ?? 'http://localhost:4321';

// Build the URL Astro should use for server-side GraphQL requests. In docker
// the api hostname is `api`; locally it's localhost. PUBLIC_API_URL covers both.
export const SERVER_API_URL = PUBLIC_API_URL;
