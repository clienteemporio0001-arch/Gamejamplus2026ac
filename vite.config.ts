import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'dist', assetsDir: 'assets' }, server:{host:'0.0.0.0'} });
