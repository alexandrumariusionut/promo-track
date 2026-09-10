import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'app', 'docs', 'coverage', '**/.aws-sam/**', '**/coverage/**', 'backend/**/node_modules/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The icons barrel pulls ~2000 modules into dev/test; use path imports.
      'no-restricted-imports': ['error', {
        paths: [{ name: '@mui/icons-material', message: "Import icons individually: import X from '@mui/icons-material/X'." }],
      }],
    },
  },
  {
    // Context providers and imperative snackbar APIs intentionally export a
    // component alongside a hook/function; HMR falls back to a full reload.
    files: ['src/store/*.tsx', 'src/context/*.tsx', 'src/components/ErrorSnackbar.tsx', 'src/components/UndoSnackbar.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
