/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WEB_URL: string;
  readonly PUBLIC_LANDING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
