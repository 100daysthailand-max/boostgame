import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { requirePool, closePool, getPool } from './pool.js';
import { logger } from '../logger.js';

/**
 * Minimal forward-only SQL migration runner.
 *
 * Runs every `*.sql` file in ./migrations in lexical order inside a transaction and
 * records it in `schema_migrations`. Safe to run repeatedly.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

export async function runMigrations(): Promise<string[]> {
  const pool = requirePool();
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      logger.info({ migration: file }, 'applying migration');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    return applied;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (!getPool()) {
    // eslint-disable-next-line no-console
    console.error('DATABASE_URL is not configured. Set it before running migrations.');
    process.exit(1);
  }
  try {
    const applied = await runMigrations();
    // eslint-disable-next-line no-console
    console.log(
      applied.length === 0
        ? 'Database is up to date (no migrations applied).'
        : `Applied ${applied.length} migration(s): ${applied.join(', ')}`,
    );
  } finally {
    await closePool();
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
