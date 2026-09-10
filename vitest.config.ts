import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          globals: true,
          setupFiles: './src/test/setup.ts',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: ['backend/tests/**/*.test.mjs'],
        },
      },
    ],
    coverage: {
      include: ['src/**', 'backend/src/**'],
      exclude: ['**/__tests__/**', '**/tests/**', 'src/content/**'],
    },
  },
})
