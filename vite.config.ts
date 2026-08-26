import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      // Local dev: /api → wrangler pages dev (functions + D1)
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
