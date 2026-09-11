import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Harmony navbar plugins live in the Amazon-internal @amzn/harmony-build-tools
 * (an optionalDependency). Public CI runners cannot install it, so it is loaded
 * dynamically: present → navbar injected as before; absent → plain build.
 * Deployments to Harmony are always built locally where the package exists.
 */
async function harmonyPlugins(): Promise<PluginOption[]> {
  const specifier = '@amzn/harmony-build-tools/vite-plugins'
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      importNavbar: () => PluginOption
      setDevCookies: () => PluginOption
    }
    return [mod.importNavbar(), mod.setDevCookies()]
  } catch {
    console.warn('[vite] @amzn/harmony-build-tools not installed — building without the Harmony navbar')
    return []
  }
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The Harmony navbar requires a Midway session. Set VITE_SKIP_HARMONY_NAVBAR=1 in
  // .env.development.local to run the app standalone (headless tests, no corp network).
  const skipNavbar = mode === 'development' && env.VITE_SKIP_HARMONY_NAVBAR === '1'
  const harmony = skipNavbar ? [] : await harmonyPlugins()

  return {
  base: '/',
  plugins: [react(), ...harmony],
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
        rewrite: (path: string) => path.replace(/^\/api\/ai/, '/api'),
      },
    },
  },
  }
})
