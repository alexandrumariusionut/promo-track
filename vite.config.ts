import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { importNavbar, setDevCookies } from '@amzn/harmony-build-tools/vite-plugins'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), importNavbar(), setDevCookies()],
  build: {
    outDir: 'app',
  },
  server: {
    proxy: {
      '/api/ai': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api'),
      },
    },
  },
})
