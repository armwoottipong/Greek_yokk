import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    maxWorkers: 1
  }
})
