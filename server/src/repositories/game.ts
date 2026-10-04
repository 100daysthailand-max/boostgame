import type { Db } from '../db/types.js';
import { TAP } from '../config/constants.js';

export interface PlayerGameState {
  energy: number;
  energyUpdatedAt: Date;
  comboCount: number;
  lastTapAt: Date | null;
  level: number;
  xp: number;
  verifiedAdsCount: number;
  conversionAvailableAt: Date | null;
}

interface PlayerStateRow {
  energy: string | number;
  energy_updated_at: string | Date;
  combo_count: number;
  last_tap_at: string | Date | null;
  level: number;
  xp: string | number;
  verified_ads_count: number;
  conversion_available_at: string | Date | null;
}

export async function loadPlayerGameState(
  tx: Db,
  userId: string,
  forUpdate = false,
): Promise<PlayerGameState | null> {
  const res = await tx.query<PlayerStateRow>(
    `SELECT energy, energy_updated_at, combo_count, last_tap_at, level, xp,
            verified_ads_count, conversion_available_at
     FROM player_state
     WHERE user_id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    energy: Number(row.energy),
    energyUpdatedAt: new Date(row.energy_updated_at),
    comboCount: Number(row.combo_count),
    lastTapAt: row.last_tap_at ? new Date(row.last_tap_at) : null,
    level: Number(row.level),
    xp: Number(row.xp),
    verifiedAdsCount: Number(row.verified_ads_count),
    conversionAvailableAt: row.conversion_available_at
      ? new Date(row.conversion_available_at)
      : null,
  };
}

/** Base 100 energy plus Energy Cap upgrades, capped by the configured ceiling. */
export async function computeEnergyCap(tx: Db, userId: string, ceiling: number): Promise<number> {
  const res = await tx.query<{ bonus: string | number }>(
    `SELECT COALESCE(SUM(uc.effect_value), 0) AS bonus
     FROM player_upgrades pu
     JOIN upgrade_config uc
       ON uc.category = pu.category AND uc.tier = pu.tier AND uc.level = pu.level
     WHERE pu.user_id = $1 AND pu.category = 'ENERGY_CAP'`,
    [userId],
  );
  const bonus = Number(res.rows[0]?.bonus ?? 0);
  return Math.min(ceiling, TAP.START_ENERGY + bonus);
}

/** Product of active coin-affecting boost multipliers (spec 01 section 5). */
export async function activeCoinBoostMultiplier(
  tx: Db,
  userId: string,
  now: Date,
): Promise<number> {
  const res = await tx.query<{ multiplier: string | number }>(
    `SELECT multiplier FROM boosts
     WHERE user_id = $1 AND expires_at > $2 AND type IN ('COIN_2X', 'PRODUCTION_3X')`,
    [userId, now.toISOString()],
  );
  return res.rows.reduce((acc, r) => acc * Number(r.multiplier), 1);
}

export async function listActiveBoosts(tx: Db, userId: string, now: Date): Promise<unknown[]> {
  const res = await tx.query(
    `SELECT id, type, multiplier, expires_at FROM boosts
     WHERE user_id = $1 AND expires_at > $2 ORDER BY expires_at`,
    [userId, now.toISOString()],
  );
  return res.rows;
}

export async function activeMinerKey(tx: Db, userId: string, now: Date): Promise<unknown | null> {
  const res = await tx.query(
    `SELECT id, expires_at FROM miner_keys
     WHERE user_id = $1 AND expires_at > $2 ORDER BY expires_at DESC LIMIT 1`,
    [userId, now.toISOString()],
  );
  return res.rows[0] ?? null;
}

export async function updatePlayerAfterTap(
  tx: Db,
  userId: string,
  p: { energy: number; comboCount: number; now: Date },
): Promise<void> {
  await tx.query(
    `UPDATE player_state
     SET energy = $2, energy_updated_at = $3, combo_count = $4, last_tap_at = $3, updated_at = now()
     WHERE user_id = $1`,
    [userId, p.energy, p.now.toISOString(), p.comboCount],
  );
}
