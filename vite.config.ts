import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// EIDOLON-V: Custom plugin to load shaders as raw strings
const glsl = () => ({
  name: 'vite-plugin-glsl',
  transform(code, id) {
    if (/\.(glsl|vert|frag)$/.test(id)) {
      return {
        code: `export default ${JSON.stringify(code)}`,
        map: null
      };
    }
  }
});

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  plugins: [react(), glsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Standard alias
      '@services': path.resolve(__dirname, './services'),
      '@components': path.resolve(__dirname, './components'),
      '@assets': path.resolve(__dirname, './assets'),
    }
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setupTests.vitest.ts'],
    globals: true
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
