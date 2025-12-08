// @ts-check

import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://localhost:4321',
  integrations: [react()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // Ignore .wrangler directory to prevent SQLite WAL changes from triggering reloads
        ignored: ['**/.wrangler/**', '**/node_modules/**'],
      },
    },
  },
});
