// @ts-check
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      'apps/mobile/.expo/**',
      'apps/mobile/expo-env.d.ts',
      'supabase/functions/_shared/shared/**',
      '**/*.config.js',
      '**/babel.config.js',
      '**/metro.config.js',
    ],
  },
  // Mobile app: Expo rules (React, hooks, import resolution).
  ...expoConfig.map((c) => ({ ...c, files: ['apps/mobile/**/*.{ts,tsx,js}'] })),
  // TypeScript everywhere.
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.{ts,tsx,mts}'] })),
  {
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: {
      'import/no-unresolved': 'off',
      'react/react-in-jsx-scope': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'supabase/tests/**'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
