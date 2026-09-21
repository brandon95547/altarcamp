import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 5190,
    strictPort: true,
    // The API is same-origin in development too, so the session cookie behaves identically
    // here and behind nginx in production.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/docs': { target: 'http://localhost:4000', changeOrigin: true },
      '/health': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  preview: { port: 4173 },
  build: { outDir: 'dist', sourcemap: true },
});
