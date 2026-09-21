import { rm } from 'node:fs/promises';
import { afterAll, beforeAll } from 'vitest';
import { closePool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { seed } from '../db/seeds/seed.js';

const ADMIN_URL =
  process.env['TEST_DATABASE_ADMIN_URL'] ??
  'postgres://altar:altar_dev_password@localhost:5442/postgres';
const TEST_DB = process.env['TEST_DATABASE_NAME'] ?? 'altar_test';

beforeAll(async () => {
  // globalSetup runs in its own process, so the URL is rebuilt here too.
  const url = new URL(ADMIN_URL);
  url.pathname = `/${TEST_DB}`;
  process.env['DATABASE_URL'] = url.toString();

  await migrate(() => {});
  await seed(() => {});
});

afterAll(async () => {
  await closePool();
  await rm('./.test-storage', { recursive: true, force: true });
});
