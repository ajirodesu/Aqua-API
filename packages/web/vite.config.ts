import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config';

// PostCSS plugins are configured inline here (rather than in a separate
// postcss.config.*) so the whole frontend toolchain — including build
// config — stays TypeScript, with no CJS/ESM loader conflicts.
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(tailwindConfig), autoprefixer()],
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Only the meta endpoints live under /api. Dynamically-loaded
      // endpoints (e.g. /random/blue-archive) are called against the
      // absolute backend origin in dev — see src/lib/api.ts.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
