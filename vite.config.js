import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // BASE=/residence-les-cerfs/ for GitHub Pages; '/' everywhere else
  base: process.env.BASE ?? '/',
  plugins: [react()],
  server: { port: 5180, host: true },
  build: {
    rollupOptions: {
      // one HTML page per address: home, legal pages, owner space
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        conditions: resolve(import.meta.dirname, 'conditions/index.html'),
        mentions: resolve(import.meta.dirname, 'mentions-legales/index.html'),
        confidentialite: resolve(import.meta.dirname, 'confidentialite/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
      output: {
        manualChunks: (id) =>
          id.includes('node_modules/react') ? 'vendor' : /node_modules\/(gsap|lenis)/.test(id) ? 'motion' : undefined,
      },
    },
  },
});
