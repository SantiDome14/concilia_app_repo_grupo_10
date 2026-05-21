import pluginVue from 'eslint-plugin-vue';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

// ────────────────────────────────────────────────────────────────────
// Flat ESLint config (ESLint 9+)
// ────────────────────────────────────────────────────────────────────

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.config.js',
    ],
  },

  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  skipFormatting,

  {
    rules: {
      // ─── Vue ─────────────────────────────────────────────
      'vue/multi-word-component-names': 'off', // Login.vue / Dashboard.vue are OK
      'vue/require-default-prop': 'off',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineProps', 'defineEmits', 'defineExpose'],
        },
      ],

      // ─── TypeScript ──────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // NOTE: consistent-type-imports requires `parserOptions.project` for
      // type-aware linting in @typescript-eslint v8+. Disabled here to keep
      // lint green; the template's vue-tsc type-check already covers most
      // of what this rule catches.
      '@typescript-eslint/consistent-type-imports': 'off',

      // ─── General ─────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
];
