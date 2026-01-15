import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', 'dist', '.DownPatNode'],
    environmentMatchGlobs: [
      // React component tests need jsdom environment
      ['**/client/**/*.test.tsx', 'jsdom'],
      ['packages/ui-components/**/*.test.tsx', 'jsdom'],
      ['packages/admin-ui/**/*.test.tsx', 'jsdom'],
      ['packages/react/**/*.test.tsx', 'jsdom'],
      // Token tests need jsdom for localStorage
      ['packages/ui-components/src/auth/*.test.ts', 'jsdom'],
      // Hook tests need jsdom for renderHook
      ['packages/ui-components/src/hooks/*.test.ts', 'jsdom'],
      ['packages/react/src/hooks/*.test.ts', 'jsdom'],
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
