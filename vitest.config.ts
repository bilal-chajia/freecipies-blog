import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/.worktrees/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolvePath('./src/admin'),
      '@admin': resolvePath('./src/admin'),
      '@modules': resolvePath('./src/modules'),
      '@server': resolvePath('./src/server'),
      '@shared': resolvePath('./src/shared'),
      '@site': resolvePath('./src/site'),
      '@components': resolvePath('./src/site/components'),
      '@layouts': resolvePath('./src/site/layouts'),
      '@styles': resolvePath('./src/site/styles'),
      'cloudflare:workers': resolvePath('./src/test-stubs/cloudflare-workers.ts'),
    },
  },
});
