// API lint config. Extends the shared base, adds TypeScript parsing, and the
// §0.3/§10.1 rule that `process.env` is read in exactly one module
// (src/config/env.ts). A second read site is a defect even while its answer
// agrees, because the two will be edited on different days.
import base from '../../packages/config/eslint.config.mjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...base,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // TypeScript (strict) already rejects undefined identifiers; no-undef is
      // redundant for .ts and this is the typescript-eslint recommended stance.
      'no-undef': 'off',
      // The TS-aware rule understands enum members and type-only usage, which
      // the core no-unused-vars gets wrong.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'process.env may only be read in src/config/env.ts — config is the single entry point (P0.3).',
        },
      ],
    },
  },
  {
    files: ['src/config/env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  }
);
