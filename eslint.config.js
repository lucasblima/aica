import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'supabase/functions/**',
      '**/*.stories.tsx',
      '**/*.example.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      'playwright.config.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
    ],
  },

  // Base JS/TS configuration
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React configuration
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Console logging restriction
      // During migration: warn (change to 'error' after migration complete)
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
