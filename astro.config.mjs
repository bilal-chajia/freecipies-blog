// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://freecipies.com',
  integrations: [sitemap(), react()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    routes: {
      extend: {
        include: [{ pattern: '/api/*' }],
      }
    }
  }),
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
});
