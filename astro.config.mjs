// @ts-check

import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// Load env once — avoids Vite re-optimization triggered by dynamic process.env
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// Fix FSWatcher memory leak warning from Cloudflare adapter
// Only applies to dev server, not the temporary server created during build sync
const fixWatcherPlugin = () => ({
  name: 'fix-watcher',
  /** @param {any} server */
  configureServer(server) {
    if (server.watcher) {
      server.watcher.setMaxListeners(50);
    }
  },
});

// https://astro.build/config
export default defineConfig({
  site: env.SITE_URL || 'http://localhost:4321',
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  adapter: cloudflare({
    imageService: 'passthrough',
    prerenderEnvironment: 'node',
  }),
  output: 'server',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [fixWatcherPlugin(), ...tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    ssr: {
      external: [
        'node:fs/promises',
        'node:path',
        'node:worker_threads',
        // Server-only — no browser bundle needed
        '@anthropic-ai/sdk',
        'openai',
        '@google/generative-ai',
        'aws4fetch',
      ],
    },
    server: {
      allowedHosts: true,
      watch: {
        // Reduce memory usage by ignoring large directories
        // Note: Don't set ignored to [] or false, use null instead
        ignored: ['**/.wrangler/**', '**/node_modules/**', '**/.git/**'],
      },
      // DISABLED: warmup can cause FSWatcher memory leaks with Cloudflare adapter
      // warmup: { clientFiles: [...] },
    },
    // WASM support for jSquash (WebP/AVIF encoding)
    optimizeDeps: {
      // Exclude WASM modules - they cannot be pre-bundled
      exclude: ['@jsquash/avif', '@jsquash/webp'],

      // Only pre-bundle React core — everything else is discovered on-demand.
      // Heavy admin deps (BlockNote, Konva, Recharts) load lazily when the
      // admin panel is first visited, saving 10-30s on every cold start.
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },
    build: {
      target: 'esnext',
      // minify defaults to esbuild — optimal for Workers
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      // Note: manualChunks cannot be used here — the Cloudflare adapter
      // resolves heavy UI packages (BlockNote, Konva, Recharts) as externals
      // in the Workers bundle, which is incompatible with manualChunks.
    },

    worker: {
      format: 'es',
    },
    // Disable source maps in dev for speed
    // Enable only when debugging
  },
});
