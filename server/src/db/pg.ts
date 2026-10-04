import type { Pool, PoolClient } from 'pg';
import type { Db } from './types.js';

function isPool(client: Pool | PoolClient): client is Pool {
  return typeof (client as Pool).connect === 'function';
}

/** Wraps a `pg` Pool (or a transaction-bound PoolClient) behind the Db port. */
function wrap(client: Pool | PoolClient): Db {
  const db: Db = {
    async query<T>(sql: string, params?: readonly unknown[]) {
      const res = await client.query(sql, params as unknown[] | undefined);
      return { rows: res.rows as T[] };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (!isPool(client)) {
        throw new Error('nested transactions are not supported');
      }
      const conn = await client.connect();
      try {
        await conn.query('BEGIN');
        const out = await fn(wrap(conn));
        await conn.query('COMMIT');
        return out;
      } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
      } finally {
        conn.release();
      }
    },
  };
  return db;
}

export function createPgDb(pool: Pool): Db {
  return wrap(pool);
}
