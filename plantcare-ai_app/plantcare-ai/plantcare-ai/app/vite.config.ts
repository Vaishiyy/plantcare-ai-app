import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Everything (JS, CSS, fonts, icons) is bundled into dist/ so the app works on the
// ESP8266 hotspot, which has no internet access.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
