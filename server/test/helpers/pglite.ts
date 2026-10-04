import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../../src/db/types.js';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'db',
  'migrations',
);

/**
 * Boots an in-process Postgres (PGlite), applies every migration, and returns a Db
 * port so the real routes/repositories can be exercised without a live server.
 */
export async function createTestDb(): Promise<{ db: Db; pglite: PGlite }> {
  const pglite = new PGlite();
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await pglite.exec(await readFile(path.join(migrationsDir, file), 'utf8'));
  }

  const db: Db = {
    async query<T>(sql: string, params?: readonly unknown[]) {
      const res = await pglite.query(sql, params ? (params as unknown[]) : undefined);
      return { rows: res.rows as T[] };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      await pglite.exec('BEGIN');
      try {
        const out = await fn(db);
        await pglite.exec('COMMIT');
        return out;
      } catch (err) {
        await pglite.exec('ROLLBACK');
        throw err;
      }
    },
  };

  return { db, pglite };
}
