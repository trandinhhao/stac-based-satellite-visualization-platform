import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/cog': {
        target: 'http://titiler:8002',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
        changeOrigin: true,
      },
      '/stac': {
        target: 'http://stac-fastapi:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/stac/, ''),
      }
    }
  }
})
