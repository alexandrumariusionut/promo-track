import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { importNavbar, setDevCookies } from '@amzn/harmony-build-tools/vite-plugins'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The Harmony navbar requires a Midway session. Set VITE_SKIP_HARMONY_NAVBAR=1 in
  // .env.local to run the app standalone (headless tests, no corp network).
  const skipNavbar = mode === 'development' && env.VITE_SKIP_HARMONY_NAVBAR === '1'

  return {
  base: '/',
  plugins: [react(), ...(skipNavbar ? [] : [importNavbar(), setDevCookies()])],
  build: {
    outDir: 'app',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep large, rarely-changing vendors in their own cacheable chunks.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) return 'mui';
          if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-')) return 'charts';
          if (id.includes('/node_modules/docx/') || id.includes('/node_modules/file-saver/')) return 'docx';
          if (id.includes('/node_modules/jspdf')) return 'pdfgen';
          if (id.includes('/node_modules/mammoth/')) return 'mammoth';
          return undefined;
        },
      },
    },
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
  }
})
