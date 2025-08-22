import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'pdf': fileURLToPath(new URL('./pdf', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      // Exclude Next.js pages and API routes from unit coverage; covered by E2E instead
      exclude: [
        'src/app/**',
        'src/middleware.ts',
        '.next/**',
      ],
    },
  },
})
