import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Local dev: the browser calls /api/... on the Vite origin, forwarded to Flask.
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
  build: {
    // Never ship source maps: they expose the original source to anyone.
    sourcemap: false,
    rolldownOptions: {
      output: {
        minify: { compress: { dropConsole: true, dropDebugger: true } },
        legalComments: 'none',
      },
    },
  },
})
