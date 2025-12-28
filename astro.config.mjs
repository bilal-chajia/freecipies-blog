// @ts-check

import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

const messageChannelPolyfill = `if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}
`;

// https://astro.build/config
export default defineConfig({
  site: 'https://localhost:4321',
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
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
      rollupOptions: {
        output: {
          banner: messageChannelPolyfill,
        },
      },
    },
    worker: {
      format: 'es',
    },
  },
});
