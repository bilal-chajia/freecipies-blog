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
    ssr: {
      external: ['node:fs/promises', 'node:path', 'node:worker_threads'],
    },
    server: {
      watch: {
        // Ignore .wrangler directory to prevent SQLite WAL changes from triggering reloads
        ignored: ['**/.wrangler/**', '**/node_modules/**'],
      },
    },
    // WASM support for jSquash (WebP/AVIF encoding)
    optimizeDeps: {
      exclude: ['@jsquash/avif', '@jsquash/webp'],
      // Pre-bundle heavy Admin SPA dependencies to avoid dev mode "waterfall"
      include: [
        'konva',
        'react-konva',
        'recharts',
        'framer-motion',
        'lucide-react',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-accordion',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-switch',
        '@radix-ui/react-slider',
        '@radix-ui/react-scroll-area',
        'react-router-dom',
        'react-hook-form',
        '@hookform/resolvers',
        'zod',
        'date-fns',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
      ],
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1800,
    },
    worker: {
      format: 'es',
    },
  },
});
