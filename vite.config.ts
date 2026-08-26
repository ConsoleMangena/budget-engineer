import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const rootDir = import.meta.dirname;

/**
 * Make CSS non-render-blocking: converts <link rel="stylesheet" ...>
 * to media="print" onload="this.media='all'" with a <noscript> fallback.
 * Skips links that already have onload (e.g. Google Fonts).
 * Saves ~195ms render-blocking time on the critical path.
 */
function nonBlockingCss(): Plugin {
  return {
    name: 'non-blocking-css',
    enforce: 'post',
    transformIndexHtml(html) {
      // Only target stylesheet links WITHOUT an existing onload attribute
      return html.replace(
        /<link\s+rel="stylesheet"\s+(?!onload)([^>]*?href="([^"]+)"[^>]*?)>/g,
        (_match, attrs, _href) => {
          // Skip if this link already has media="print" (already non-blocking)
          if (attrs.includes('onload') || attrs.includes('media="print"')) return _match;
          return `<link rel="stylesheet" ${attrs} media="print" onload="this.media='all'"><noscript><link rel="stylesheet" ${attrs}></noscript>`;
        },
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nonBlockingCss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globIgnores: ['**/opencv-*'],
      },
      manifest: {
        name: 'Dzenhare Budget Engineer Studio',
        short_name: 'Budget Engineer',
        description: 'AI-powered computational design → CAD → BIM → BOQ',
        theme_color: '#1a365d',
        background_color: '#0B0F19',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'design', 'utilities'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  build: {
    chunkSizeWarningLimit: 512,
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
      output: {
        manualChunks(id) {
          // React core (critical path — must render before anything else)
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor'
          // React Router — loads in parallel with React, not blocking initial render
          if (id.includes('react-router')) return 'router-vendor'
          if (
            id.includes('framer-motion') ||
            id.includes('lucide-react') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx') ||
            id.includes('class-variance-authority')
          ) return 'ui-vendor'
          if (id.includes('zustand') || id.includes('immer') || id.includes('dexie')) return 'state-vendor'
        },
      },
    },
  },
});
