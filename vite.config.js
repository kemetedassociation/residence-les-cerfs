import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // BASE=/residence-les-cerfs/ for GitHub Pages; '/' everywhere else
  base: process.env.BASE ?? '/',
  plugins: [react()],
  server: { port: 5180, host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('node_modules/react') ? 'vendor' : /node_modules\/(gsap|lenis)/.test(id) ? 'motion' : undefined,
      },
    },
  },
});
