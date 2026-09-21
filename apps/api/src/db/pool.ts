import pg from 'pg';
import { loadConfig } from '../config.js';

const { Pool, types } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings. A release date is a calendar date, not
// a moment in time, and letting node-postgres build a Date applies the server's timezone to it.
types.setTypeParser(1082, (value) => value);
// BIGINT as a number: money is in cents and amounts here stay far below 2^53.
types.setTypeParser(20, (value) => Number.parseInt(value, 10));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export type Queryable = Pick<pg.Pool, 'query'> | pg.PoolClient;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  client: Queryable = getPool(),
): Promise<T[]> {
  const result = await client.query<T>(text, params as unknown[]);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  client: Queryable = getPool(),
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

/**
 * Run a unit of work in a transaction.
 *
 * Split writes always go through this: a split that is half-saved is a split that does not
 * total 100%, and the whole product rests on that invariant.
 */
export async function withTransaction<T>(
  handler: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
