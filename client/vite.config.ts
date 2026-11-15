import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'next/link': path.resolve(__dirname, 'src/shims/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, 'src/shims/next-navigation.ts'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.mjs'),
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY || 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
