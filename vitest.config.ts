import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Playwright owns the browser suite.  Keeping it out of Vitest prevents
    // two runners from loading incompatible test globals in one process.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', 'tests/browser/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/helpers/server-only.ts'),
    },
  },
});
