import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Inject it, describe, expect, vi into global scope (Jest-like)
    globals: true,
    // Run hooks sequentially to better mirror Jest behavior
    sequence: {
      hooks: 'list',
    },
    // Node environment (default); adjust if you need DOM mocking
    environment: 'node',
    // Enable coverage using V8 as approved
    coverage: {
      provider: 'v8',
      enabled: false, // use script "test:coverage" to enable
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'vitest.config.ts'],
    },
  },
});