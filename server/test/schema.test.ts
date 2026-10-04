import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * Runs the real migration SQL against PGlite (Postgres-in-WASM) to verify the
 * schema and seed files are valid before they ever touch Neon/Render.
 */
const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'db',
  'migrations',
);

const REQUIRED_TABLES = [
  'users', 'sessions', 'memberships', 'player_state', 'wallets', 'ledger_entries',
  'upgrade_config', 'player_upgrades', 'boost_config', 'boosts', 'miner_keys', 'skins',
  'player_skins', 'quest_templates', 'quest_assignments', 'quest_claims', 'ad_events',
  'provider_callbacks', 'daily_gate_tasks', 'daily_gate_codes', 'streaks',
  'new_day_switch_uses', 'referrals', 'weekly_scores', 'weekly_rewards', 'seasons',
  'season_scores', 'season_rewards', 'conversions', 'withdrawals', 'risk_signals',
  'risk_cases', 'tickets', 'ticket_messages', 'notifications', 'feature_flags',
  'system_config', 'system_config_history', 'admin_audit_logs',
];

describe('database schema migrations', () => {
  let db: PGlite;

  before(async () => {
    db = new PGlite();
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await db.exec(sql);
    }
  });

  after(async () => {
    await db.close();
  });

  it('creates every required table', async () => {
    const res = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    const names = new Set(res.rows.map((r) => r.tablename));
    for (const table of REQUIRED_TABLES) {
      assert.ok(names.has(table), `missing table: ${table}`);
    }
  });

  it('seeds launch feature flags with correct defaults', async () => {
    const res = await db.query<{ key: string; enabled: boolean }>(
      'SELECT key, enabled FROM feature_flags',
    );
    const flags = new Map(res.rows.map((r) => [r.key, r.enabled]));
    assert.equal(flags.size, 15);
    assert.equal(flags.get('MAINTENANCE'), false);
    assert.equal(flags.get('GEM_TON_PURCHASE'), false);
    assert.equal(flags.get('REGISTRATIONS'), true);
    assert.equal(flags.get('TAP_REWARDS'), true);
    assert.equal(flags.get('DAILY_GATE_FALLBACK'), false);
  });

  it('seeds boost config, default skin and system config', async () => {
    const boosts = await db.query<{ c: number }>('SELECT count(*)::int AS c FROM boost_config');
    assert.equal(boosts.rows[0]?.c, 6);
    const skins = await db.query<{ c: number }>('SELECT count(*)::int AS c FROM skins');
    assert.equal(skins.rows[0]?.c, 1);
    const cfg = await db.query<{ c: number }>('SELECT count(*)::int AS c FROM system_config');
    assert.equal(cfg.rows[0]?.c, 8);
  });

  it('rejects a duplicate ledger idempotency key', async () => {
    const u = await db.query<{ id: string }>(
      'INSERT INTO users (telegram_id) VALUES (900001) RETURNING id',
    );
    const userId = u.rows[0]!.id;
    await db.query(
      `INSERT INTO ledger_entries (user_id, asset, amount, reason, source, idempotency_key)
       VALUES ($1, 'COIN', 10, 'TAP', 'tap', 'tap:1')`,
      [userId],
    );
    await assert.rejects(
      db.query(
        `INSERT INTO ledger_entries (user_id, asset, amount, reason, source, idempotency_key)
         VALUES ($1, 'COIN', 10, 'TAP', 'tap', 'tap:1')`,
        [userId],
      ),
      /duplicate key/,
    );
  });

  it('enforces asset and withdrawal-status domain constraints', async () => {
    const u = await db.query<{ id: string }>(
      'INSERT INTO users (telegram_id) VALUES (900002) RETURNING id',
    );
    const userId = u.rows[0]!.id;

    await assert.rejects(
      db.query(
        `INSERT INTO ledger_entries (user_id, asset, amount, reason, source, idempotency_key)
         VALUES ($1, 'BITCOIN', 1, 'TAP', 'tap', 'bad:1')`,
        [userId],
      ),
      /check constraint/i,
    );

    await assert.rejects(
      db.query(
        `INSERT INTO withdrawals (user_id, amount_bc, rate_snapshot, ton_amount, net_ton,
           wallet_address, status)
         VALUES ($1, 100, '{}'::jsonb, 0.1, 0.1, 'EQabc', 'PENDING')`,
        [userId],
      ),
      /check constraint/i,
    );
  });

  it('allows exactly one season Top 1 per board', async () => {
    const s = await db.query<{ id: string }>(
      `INSERT INTO seasons (number, starts_at, ends_at) VALUES (1, now(), now() + interval '30 days')
       RETURNING id`,
    );
    const seasonId = s.rows[0]!.id;
    const a = await db.query<{ id: string }>(
      'INSERT INTO users (telegram_id) VALUES (900003) RETURNING id',
    );
    const b = await db.query<{ id: string }>(
      'INSERT INTO users (telegram_id) VALUES (900004) RETURNING id',
    );

    await db.query(
      `INSERT INTO season_rewards (season_id, board, rank, user_id, reward_snapshot, idempotency_key)
       VALUES ($1, 'COIN', 1, $2, '{}'::jsonb, 'season:1:COIN:1')`,
      [seasonId, a.rows[0]!.id],
    );
    await assert.rejects(
      db.query(
        `INSERT INTO season_rewards (season_id, board, rank, user_id, reward_snapshot, idempotency_key)
         VALUES ($1, 'COIN', 1, $2, '{}'::jsonb, 'season:1:COIN:1b')`,
        [seasonId, b.rows[0]!.id],
      ),
      /duplicate key/,
    );
  });
});
