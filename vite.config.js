import { defineConfig } from 'vite';

// Vite configuration for Island Escape 3D.
// Kept intentionally minimal: the project is a static ES-module app with
// no backend dependency, which makes it trivially deployable to Vercel
// (or any static host) via `vite build`.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2019',
    chunkSizeWarningLimit: 1200
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
});
