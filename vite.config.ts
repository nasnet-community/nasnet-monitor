/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rawBasePath = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '')
const basePath = rawBasePath && !rawBasePath.startsWith('/') ? `/${rawBasePath}` : rawBasePath

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? `${basePath}/` : './',
  root: path.resolve(__dirname, 'frontend'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  server: {
    proxy: {
      [`${basePath}/api`]: 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: path.resolve(__dirname, 'frontend/src/test/setup.ts'),
    css: true,
  },
}))
