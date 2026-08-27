import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // PREVIEW_INLINE=1 → single-chunk build (no code splitting) so the offline
  // Preview.html can inline the whole app including the G1 question bank.
  build: process.env.PREVIEW_INLINE === '1'
    ? {
        rollupOptions: {
          output: { inlineDynamicImports: true },
        },
      }
    : undefined,
  server: {
    proxy: {
      // Local dev: /api → wrangler pages dev (functions + D1)
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
