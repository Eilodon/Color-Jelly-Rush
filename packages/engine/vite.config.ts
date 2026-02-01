import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'CJREngine',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
        },
        outDir: 'dist',
        sourcemap: true,
        minify: false, // Keep readable for debugging
        rollupOptions: {
            // No external dependencies - engine is self-contained
            external: [],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});
