import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/pantry/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        // `gz` and the vendored OCR core are here so receipt scanning works
        // with no connection. They are also why the size cap is raised: the
        // language data is ~2.8MB and the WASM core ~3.8MB, and the default
        // 2MiB limit would skip both silently, leaving the feature looking
        // self-hosted while still reaching for a CDN at the worst moment.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,gz}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Only the SIMD core is worth an install-time download; every browser
        // that can install this PWA has SIMD. The non-SIMD build is served
        // from the same origin and cached the first time it is actually used.
        globIgnores: ['**/tesseract/core/tesseract-core-lstm.wasm.js'],
      },
    }),
  ],
});
