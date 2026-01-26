import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl'; // EIDOLON-V: REAL PLUGIN - not fake!

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  plugins: [
    react(),
    glsl() // REAL PLUGIN with #include support
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Standard alias
      '@services': path.resolve(__dirname, './services'),
      '@components': path.resolve(__dirname, './components'),
      '@assets': path.resolve(__dirname, './assets'),
    }
  },
  build: {
    target: 'esnext', // SOTA 2026: Optimize for modern browsers
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'engine-core': ['pixi.js', 'colyseus.js'], // Split heavy engine deps
          'ui-framework': ['react', 'react-dom'],    // Split UI deps
        }
      }
    }
  }
});
