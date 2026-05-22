import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  server: { host: '0.0.0.0', port: 4322 },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    fallback: {
      ru: 'en',
    },
    routing: {
      fallbackType: 'rewrite',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
