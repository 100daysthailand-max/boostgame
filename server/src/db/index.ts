import { closePool, getPool, pingDb } from './pool.js';
import { createPgDb } from './pg.js';
import type { Db } from './types.js';

let db: Db | null = null;

/** Returns the Postgres-backed Db port, or null when DATABASE_URL is not set. */
export function getDb(): Db | null {
  const pool = getPool();
  if (!pool) return null;
  if (!db) db = createPgDb(pool);
  return db;
}

export { closePool, pingDb };
export type { Db, DbQueryResult } from './types.js';
