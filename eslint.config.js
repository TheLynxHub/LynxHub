import configPrettier from '@electron-toolkit/eslint-config-prettier';
import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import react from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

const MAX_LINE_LENGTH = 120;

export default defineConfig([
  {
    ignores: ['node_modules', 'out', '.gitignore'],
  },
  configPrettier,

  eslint.configs.recommended,
  react.configs.flat.recommended,
  tsEslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: '19',
      },
    },

    plugins: {
      react,
      perfectionist,
      'simple-import-sort': simpleImportSort,
      'jsx-a11y': jsxA11y,
      'react-hooks': hooksPlugin,
    },

    rules: {
      ...hooksPlugin.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/display-name': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/immutability': 'off',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'no-async-promise-executor': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',

      'perfectionist/sort-jsx-props': [
        'error',
        {
          type: 'line-length',
          order: 'asc',
          groups: ['multiline-prop', 'unknown', 'shorthand-prop'],
        },
      ],

      'max-len': ['error', {code: MAX_LINE_LENGTH, ignoreComments: true}],

      'sonarjs/os-command': 'off',
      'no-useless-escape': 'off',
      'prettier/prettier': [
        'error',
        {
          proseWrap: 'always',
          singleQuote: true,
          printWidth: MAX_LINE_LENGTH,
          bracketSpacing: false,
          bracketSameLine: true,
          arrowParens: 'avoid',
          endOfLine: 'auto',
        },
      ],

      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
