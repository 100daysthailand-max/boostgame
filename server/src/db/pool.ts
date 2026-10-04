import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../logger.js';

/**
 * PostgreSQL access (spec 02 section 1: PostgreSQL is the source of truth).
 *
 * The pool is only created when DATABASE_URL is configured. Endpoints that need
 * the database call `requirePool()`; health checks use `pingDb()`.
 */
let pool: pg.Pool | null = null;

function sslConfig(url: string): pg.PoolConfig['ssl'] {
  if (/sslmode=require|neon\.tech|neon\.build|onrender\.com/.test(url)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function getPool(): pg.Pool | null {
  const url = env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: sslConfig(url),
    });
    pool.on('error', (err) => logger.error({ err }, 'postgres pool error'));
  }
  return pool;
}

export function requirePool(): pg.Pool {
  const p = getPool();
  if (!p) {
    throw new Error('DATABASE_URL is not configured');
  }
  return p;
}

export type DbStatus = 'up' | 'down' | 'not_configured';

export async function pingDb(): Promise<DbStatus> {
  const p = getPool();
  if (!p) return 'not_configured';
  try {
    await p.query('SELECT 1');
    return 'up';
  } catch (err) {
    logger.warn({ err }, 'postgres ping failed');
    return 'down';
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
