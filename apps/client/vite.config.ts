/// <reference types="node" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl'; // EIDOLON-V: REAL PLUGIN - not fake!

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    // EIDOLON-V: Enable SharedArrayBuffer support (Cross-Origin Isolation)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [
    react(),
    glsl(), // REAL PLUGIN with #include support
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cjr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@cjr/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@services': path.resolve(__dirname, './src/services'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  build: {
    target: 'esnext', // SOTA 2026: Optimize for modern browsers
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // EIDOLON-V P3: Better chunk splitting for faster initial load
          'pixi-core': ['pixi.js'], // PixiJS renderer
          colyseus: ['colyseus.js'], // Networking
          'ui-framework': ['react', 'react-dom'],
        },
      },
    },
    // EIDOLON-V P3: Increase warning limit since game engines are inherently large
    chunkSizeWarningLimit: 700,
  },
});
