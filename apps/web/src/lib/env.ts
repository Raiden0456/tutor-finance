// Server-only env access. Vite/Astro exposes import.meta.env at build/SSR time.
const env = import.meta.env;

export const PUBLIC_API_URL =
  (env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000';
export const PUBLIC_APP_URL =
  (env.PUBLIC_APP_URL as string | undefined) ?? 'http://localhost:4321';

// SERVER_API_URL can point to an internal hostname on Render (faster, no round-trip).
// Falls back to PUBLIC_API_URL so local dev needs no extra config.
export const SERVER_API_URL = (env.SERVER_API_URL as string | undefined) ?? PUBLIC_API_URL;
