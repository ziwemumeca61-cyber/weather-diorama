import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
