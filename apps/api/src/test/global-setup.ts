import pg from 'pg';

const ADMIN_URL =
  process.env['TEST_DATABASE_ADMIN_URL'] ??
  'postgres://altar:altar_dev_password@localhost:5442/postgres';
const TEST_DB = process.env['TEST_DATABASE_NAME'] ?? 'altar_test';

/**
 * Create the test database once per run. It is dropped and recreated so a failed run cannot
 * leave rows that make the next run pass for the wrong reason.
 */
export default async function setup(): Promise<void> {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres at ${ADMIN_URL}. Start it with "npm run docker:up" (or "docker compose up -d db"), then run the tests again.\n${
        (error as Error).message
      }`,
    );
  }

  await client.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB],
  );
  await client.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await client.query(`CREATE DATABASE ${TEST_DB}`);
  await client.end();

  const url = new URL(ADMIN_URL);
  url.pathname = `/${TEST_DB}`;
  process.env['DATABASE_URL'] = url.toString();
}
