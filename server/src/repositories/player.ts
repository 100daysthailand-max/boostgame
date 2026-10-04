import type { Db } from '../db/types.js';
import type { TelegramUser } from '../services/telegram.js';

export interface UserRow {
  id: string;
  telegram_id: string;
  is_banned: boolean;
}

/**
 * Creates or refreshes a user from validated Telegram data (spec 02 section 3).
 * The client never supplies an amount or identity beyond the validated initData.
 */
export async function upsertUserFromTelegram(db: Db, user: TelegramUser): Promise<UserRow> {
  const res = await db.query<UserRow>(
    `INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_premium)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username      = EXCLUDED.username,
       first_name    = EXCLUDED.first_name,
       last_name     = EXCLUDED.last_name,
       language_code = EXCLUDED.language_code,
       is_premium    = EXCLUDED.is_premium,
       updated_at    = now()
     RETURNING id, telegram_id, is_banned`,
    [
      String(user.id),
      user.username ?? null,
      user.first_name ?? null,
      user.last_name ?? null,
      user.language_code ?? null,
      user.is_premium ?? false,
    ],
  );
  return res.rows[0]!;
}

/** Ensures the auxiliary rows exist for a player. Safe to call repeatedly. */
export async function provisionPlayer(db: Db, userId: string): Promise<void> {
  await db.query(`INSERT INTO player_state (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  await db.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  await db.query(`INSERT INTO memberships (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  await db.query(`INSERT INTO streaks (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  await db.query(
    `INSERT INTO player_skins (user_id, skin_id, source, equipped)
     SELECT $1, id, 'DEFAULT', TRUE FROM skins WHERE is_default = TRUE
     ON CONFLICT (user_id, skin_id) DO NOTHING`,
    [userId],
  );
}

export interface MeView {
  user: Record<string, unknown>;
  state: Record<string, unknown>;
  wallet: Record<string, unknown>;
  membership: Record<string, unknown>;
}

/** Assembles the `/api/me` view (spec 02 section 12 profile surface). */
export async function getMeView(db: Db, userId: string): Promise<MeView | null> {
  const user = await db.query(
    `SELECT id, telegram_id, username, first_name, last_name, is_banned, created_at
     FROM users WHERE id = $1`,
    [userId],
  );
  if (user.rows.length === 0) return null;

  const state = await db.query(
    `SELECT level, xp, energy, combo_count, verified_ads_count, conversion_available_at
     FROM player_state WHERE user_id = $1`,
    [userId],
  );
  const wallet = await db.query(
    `SELECT coin, gem, bc_available, bc_locked, bc_withheld, payout_wallet_address
     FROM wallets WHERE user_id = $1`,
    [userId],
  );
  const membership = await db.query(
    `SELECT main_channel, group_chat, payout_channel, last_verified_at
     FROM memberships WHERE user_id = $1`,
    [userId],
  );

  return {
    user: user.rows[0]!,
    state: state.rows[0] ?? {},
    wallet: wallet.rows[0] ?? {},
    membership: membership.rows[0] ?? {},
  };
}
