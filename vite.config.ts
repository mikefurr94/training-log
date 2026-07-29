import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/strava': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/reflection': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/plan': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/activities': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/coach-plan': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/race-goals': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/google-calendar': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Google redirects here after OAuth. In production vercel.json rewrites
      // it to /api/google-calendar?path=callback; locally the Express server
      // mirrors that, but only if the request gets proxied instead of being
      // swallowed by Vite's SPA fallback.
      '/google-callback': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
