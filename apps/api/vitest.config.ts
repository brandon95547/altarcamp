import { defineConfig } from 'vitest/config';

/**
 * API tests run against a real Postgres database — the rules this product enforces live in
 * constraints, transactions and SQL as much as in TypeScript, and a mocked database would
 * test the mock. `npm run docker:up db` provides one; the harness creates and migrates an
 * isolated `altar_test` database of its own.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    setupFiles: ['src/test/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
      LOG_LEVEL: 'silent',
      STORAGE_DIR: './.test-storage',
      ADMIN_EMAIL: 'admin@altar.test',
      ADMIN_PASSWORD: 'TestAdminPassword!2026',
      PUBLIC_WEB_URL: 'http://localhost:5190',
      RATE_LIMIT_ENABLED: 'false',
    },
  },
});
