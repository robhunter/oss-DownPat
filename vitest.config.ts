import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.DownPatNode'],
    environmentMatchGlobs: [
      // Client tests need jsdom environment
      ['**/client/**/*.test.tsx', 'jsdom'],
      // Server and other tests use node environment
      ['**/*.test.ts', 'node'],
    ],
    setupFiles: ['./example-app/client/src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '.DownPatNode', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});
