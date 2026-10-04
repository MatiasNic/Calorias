import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'supabase/functions/**/*.test.ts',
      'supabase/tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', 'supabase/tests/rls/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/shared/src/**', 'supabase/functions/_shared/**'],
      exclude: ['supabase/functions/_shared/shared/**'],
    },
  },
});
