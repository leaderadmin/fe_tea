import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: Object.fromEntries(
      ['/api', '/sanctum', '/login', '/logout', '/storage'].map((path) => [
        path,
        { target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: false },
      ]),
    ),
  },
})
