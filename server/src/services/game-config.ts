import type { Db } from '../db/types.js';
import { TAP, PROGRESSION, ADS, CONVERSION, WITHDRAWAL } from '../config/constants.js';

/**
 * Runtime configuration lives in PostgreSQL `system_config` / `feature_flags`
 * (spec 04 section 8) and is edited from the admin panel. These defaults mirror
 * the binding launch values so the game works before any admin edit.
 */

export interface TapConfig {
  energyCost: number;
  regenSeconds: number;
  maxTapsPerSecond: number;
  baseCoinPerTap: number;
  comboEvery: number;
  comboMultipliers: number[];
  comboTimeoutSeconds: number;
  energyCapL1Ceiling: number;
}

export interface CriticalConfig {
  chance: number;
  multiplier: number;
}

export const DEFAULT_TAP_CONFIG: TapConfig = {
  energyCost: TAP.ENERGY_COST_PER_TAP,
  regenSeconds: TAP.ENERGY_REGEN_SECONDS,
  maxTapsPerSecond: TAP.MAX_TAPS_PER_SECOND,
  baseCoinPerTap: TAP.BASE_COIN_PER_TAP,
  comboEvery: TAP.COMBO_EVERY_TAPS,
  comboMultipliers: [...TAP.COMBO_MULTIPLIERS],
  comboTimeoutSeconds: TAP.COMBO_TIMEOUT_SECONDS,
  energyCapL1Ceiling: TAP.ENERGY_CAP_L1_CEILING,
};

export const DEFAULT_CRITICAL_CONFIG: CriticalConfig = { chance: 0.02, multiplier: 3 };

export const DEFAULT_PROGRESSION = PROGRESSION;
export const DEFAULT_ADS = ADS;
export const DEFAULT_CONVERSION = CONVERSION;
export const DEFAULT_WITHDRAWAL = WITHDRAWAL;

/** Loads a system_config JSON object merged over a fallback. */
export async function loadMergedConfig<T extends object>(
  db: Db,
  key: string,
  fallback: T,
): Promise<T> {
  const res = await db.query<{ value: Partial<T> }>(
    'SELECT value FROM system_config WHERE key = $1',
    [key],
  );
  if (res.rows.length === 0) return fallback;
  return { ...fallback, ...res.rows[0]!.value };
}

export async function loadTapConfig(db: Db): Promise<TapConfig> {
  return loadMergedConfig(db, 'game.tap', DEFAULT_TAP_CONFIG);
}

export async function loadCriticalConfig(db: Db): Promise<CriticalConfig> {
  return loadMergedConfig(db, 'game.critical', DEFAULT_CRITICAL_CONFIG);
}

export async function getFeatureFlags(db: Db): Promise<Record<string, boolean>> {
  const res = await db.query<{ key: string; enabled: boolean }>(
    'SELECT key, enabled FROM feature_flags',
  );
  return Object.fromEntries(res.rows.map((r) => [r.key, r.enabled]));
}

export async function isFeatureEnabled(db: Db, key: string): Promise<boolean> {
  const res = await db.query<{ enabled: boolean }>(
    'SELECT enabled FROM feature_flags WHERE key = $1',
    [key],
  );
  return res.rows[0]?.enabled ?? false;
}
