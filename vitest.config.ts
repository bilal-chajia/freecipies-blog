import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
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
    },
  },
});
