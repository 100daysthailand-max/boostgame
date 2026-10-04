import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db/types.js';

/**
 * Local dev server with an in-memory Postgres (PGlite) so the real API can be
 * exercised without Neon/Render. Dev-only: never used in production.
 *
 *   npm run dev:local
 */
const DEV_BOT_TOKEN = process.env.DEV_BOT_TOKEN ?? 'dev-bot-token';
const PORT = Number(process.env.PORT ?? 3000);

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'db',
  'migrations',
);

async function main(): Promise<void> {
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

  const app = createApp({ db, botToken: DEV_BOT_TOKEN });
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[dev] Boost Game API listening on http://127.0.0.1:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[dev] bot token for initData = ${DEV_BOT_TOKEN}`);
    // eslint-disable-next-line no-console
    console.log('[dev] run smoke test: npm run smoke');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
