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
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/strava': {
        target: 'https://www.strava.com/api/v3',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/strava/, ''),
      },
      '/api/reflection': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/habits': {
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
      '/api/google-auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/google-callback': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/google-calendar-sync': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
