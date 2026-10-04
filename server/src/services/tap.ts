import type { TapConfig } from './game-config.js';

/**
 * Pure tap/energy math (spec 01 section 3 / spec 02 section 5). Kept free of I/O so
 * the binding rules are easy to verify and cannot drift from the spec.
 */

export interface TapStateInput {
  energy: number;
  energyUpdatedAt: Date;
  comboCount: number;
  lastTapAt: Date | null;
}

export interface TapParams {
  state: TapStateInput;
  energyCap: number;
  config: TapConfig;
  boostMultiplier: number;
  critical: { chance: number; multiplier: number };
  now: Date;
  /** Injectable RNG in [0,1); defaults to Math.random in the route. */
  random: () => number;
}

export type TapResult =
  | {
      ok: true;
      coin: number;
      coinPerTap: number;
      energy: number;
      comboCount: number;
      comboMultiplier: number;
      critical: boolean;
      energyCap: number;
    }
  | { ok: false; reason: 'rate_limited'; retryAfterMs: number }
  | { ok: false; reason: 'no_energy' };

/** Energy regenerates 1 per `regenSeconds`, capped at the current cap. */
export function regenerateEnergy(
  state: TapStateInput,
  config: TapConfig,
  cap: number,
  now: Date,
): number {
  const elapsedMs = Math.max(0, now.getTime() - state.energyUpdatedAt.getTime());
  const gained = elapsedMs / (config.regenSeconds * 1000);
  return Math.min(cap, state.energy + gained);
}

export function resolveTap(params: TapParams): TapResult {
  const { state, config, energyCap, now } = params;
  const energyAfterRegen = regenerateEnergy(state, config, energyCap, now);

  if (state.lastTapAt) {
    const since = now.getTime() - state.lastTapAt.getTime();
    const minGapMs = 1000 / config.maxTapsPerSecond;
    if (since < minGapMs) {
      return { ok: false, reason: 'rate_limited', retryAfterMs: Math.ceil(minGapMs - since) };
    }
  }

  if (energyAfterRegen < config.energyCost) {
    return { ok: false, reason: 'no_energy' };
  }

  let comboCount = state.comboCount;
  if (state.lastTapAt && now.getTime() - state.lastTapAt.getTime() > config.comboTimeoutSeconds * 1000) {
    comboCount = 0;
  }
  comboCount += 1;

  const tiers = config.comboMultipliers;
  const tier = Math.min(Math.floor(comboCount / config.comboEvery), tiers.length);
  const comboMultiplier = tier === 0 ? 1 : (tiers[tier - 1] ?? 1);

  const critical = params.random() < params.critical.chance;
  const criticalMultiplier = critical ? params.critical.multiplier : 1;

  const coinPerTap = Math.floor(config.baseCoinPerTap * params.boostMultiplier * criticalMultiplier);
  const coin = Math.floor(coinPerTap * comboMultiplier);

  return {
    ok: true,
    coin,
    coinPerTap,
    energy: energyAfterRegen - config.energyCost,
    comboCount,
    comboMultiplier,
    critical,
    energyCap,
  };
}
