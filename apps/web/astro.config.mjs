import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { host: '0.0.0.0', port: 4321 },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['recharts'],
    },
  },
});
