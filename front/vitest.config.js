import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'controllers/**',
        'api/**'
      ],
      reporter: ['text', 'lcov']
    }
  },
})