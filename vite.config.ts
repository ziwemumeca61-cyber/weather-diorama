import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Short build id shown in the corner credit, so anyone can tell at a glance
// which deployment they're looking at. Vercel exposes the commit SHA in env.
function buildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (sha) return sha.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'og.png'],
      manifest: {
        name: '微缩城市天气',
        short_name: '城市天气',
        description: '把真实天气"下"到 3D 微缩城市上：雨打屋顶、雾罩街道、昼夜灯火。',
        lang: 'zh-CN',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1220',
        theme_color: '#0b1220',
        categories: ['weather', 'entertainment', 'lifestyle'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // precache the app shell + hashed chunks, but not the heavy GLB model
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        globIgnores: ['**/*.glb'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // weather + geocoding: fresh when online, last-known when offline
            urlPattern: ({ url }) => url.hostname.endsWith('open-meteo.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // the demo GLB model: cache on first use
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'models',
              expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split the heavy 3D stack into cacheable vendor chunks so the app
        // shell and each lazily-loaded city land in their own small files.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@react-three')) return 'r3f' // fiber / drei / postprocessing wrapper
          if (id.includes('/postprocessing/')) return 'postprocessing'
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-reconciler|scheduler|zustand|use-sync-external-store)[\\/]/.test(
              id,
            )
          )
            return 'react-vendor'
          // Everything else is the 3D stack (three + three-stdlib, camera-controls,
          // stats-gl, maath, troika…). Keeping it in one chunk means nothing imports
          // three from a sibling chunk, so there's no circular chunk edge.
          return 'three'
        },
      },
    },
  },
})
