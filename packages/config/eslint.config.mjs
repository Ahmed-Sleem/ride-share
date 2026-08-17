// Shared ESLint base. Consumed by every package; no package defines its own.
// Kept dependency-light on purpose: extends the stock recommended set; the
// TypeScript rules are added per-package once `typescript-eslint` is adopted.
import js from '@eslint/js';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.output/**', '**/coverage/**'],
  },
  js.configs.recommended,
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
    },
  },
];
