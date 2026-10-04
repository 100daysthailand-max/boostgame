import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadTapConfig, loadCriticalConfig, getFeatureFlags, isFeatureEnabled } from '../services/game-config.js';
import { resolveTap, regenerateEnergy } from '../services/tap.js';
import { loadPlayerGameState, computeEnergyCap, activeCoinBoostMultiplier, updatePlayerAfterTap, listActiveBoosts, activeMinerKey } from '../repositories/game.js';
import { applyLedgerEntry, InsufficientBalanceError } from '../services/ledger.js';
import { TAP, ASSETS, LEDGER_REASONS, UPGRADE_CATEGORIES } from '../config/constants.js';
import { randomUUID } from 'node:crypto';

const tapBodySchema = z.object({});

export function gameRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/game/state - Returns authoritative game state with regenerated energy
   * (spec 01 section 3, spec 02 section 5, spec 02 section 12)
   */
  router.get(
    '/game/state',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const tapConfig = await loadTapConfig(db);
      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const energyCap = await computeEnergyCap(db, userId, tapConfig.energyCapL1Ceiling);
      const energy = regenerateEnergy(state, tapConfig, energyCap, new Date());

      const boostMultiplier = await activeCoinBoostMultiplier(db, userId, new Date());
      const activeBoosts = await listActiveBoosts(db, userId, new Date());
      const minerKey = await activeMinerKey(db, userId, new Date());

      const flags = await getFeatureFlags(db);

      res.json({
        energy: Math.floor(energy),
        energyCap,
        energyRegenSeconds: tapConfig.regenSeconds,
        coinPerTap: tapConfig.baseCoinPerTap,
        boostMultiplier,
        comboCount: state.comboCount,
        comboEvery: tapConfig.comboEvery,
        comboMultipliers: tapConfig.comboMultipliers,
        comboTimeoutSeconds: tapConfig.comboTimeoutSeconds,
        level: state.level,
        xp: state.xp,
        verifiedAdsCount: state.verifiedAdsCount,
        conversionAvailableAt: state.conversionAvailableAt?.toISOString() ?? null,
        activeBoosts: activeBoosts.map((b: any) => ({
          type: b.type,
          multiplier: b.multiplier,
          expiresAt: b.expires_at,
        })),
        minerKey: minerKey ? { expiresAt: (minerKey as any).expires_at } : null,
        features: flags,
      });
    }),
  );

  /**
   * POST /api/game/tap - Processes a single tap (spec 01 section 3, spec 02 section 5)
   * Server-authoritative: validates energy, rate limit, calculates combo/critical, credits Coin.
   */
  router.post(
    '/game/tap',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const tapEnabled = await isFeatureEnabled(db, 'TAP_REWARDS');
      if (!tapEnabled) throw new HttpError(403, 'tap_rewards_disabled');

      tapBodySchema.parse(req.body);

      const tapConfig = await loadTapConfig(db);
      const criticalConfig = await loadCriticalConfig(db);
      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const energyCap = await computeEnergyCap(db, userId, tapConfig.energyCapL1Ceiling);
      const boostMultiplier = await activeCoinBoostMultiplier(db, userId, new Date());

      const result = resolveTap({
        state,
        energyCap,
        config: tapConfig,
        boostMultiplier,
        critical: criticalConfig,
        now: new Date(),
        random: Math.random,
      });

      if (!result.ok) {
        if (result.reason === 'rate_limited') {
          throw new HttpError(429, 'rate_limited', `Tap speed limit reached. Try again in a moment. Retry after ${result.retryAfterMs}ms`);
        }
        if (result.reason === 'no_energy') {
          throw new HttpError(400, 'no_energy', 'Wait for Energy');
        }
      }

      const { coin, coinPerTap, energy, comboCount, comboMultiplier, critical } = result;

      await db.transaction(async (tx) => {
        await applyLedgerEntry(tx, {
          userId,
          asset: 'COIN',
          amount: coin,
          reason: 'TAP',
          source: 'tap',
          idempotencyKey: `tap:${userId}:${randomUUID()}`,
          metadata: { coinPerTap, comboCount, comboMultiplier, critical },
        });

        if (comboMultiplier > 1) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'COIN',
            amount: Math.floor(coinPerTap * (comboMultiplier - 1)),
            reason: 'COMBO',
            source: 'tap',
            idempotencyKey: `combo:${userId}:${randomUUID()}`,
            metadata: { comboCount, comboMultiplier },
          });
        }

        if (critical) {
          const baseCoin = Math.floor(tapConfig.baseCoinPerTap * boostMultiplier);
          const criticalBonus = Math.floor(baseCoin * (criticalConfig.multiplier - 1));
          if (criticalBonus > 0) {
            await applyLedgerEntry(tx, {
              userId,
              asset: 'COIN',
              amount: criticalBonus,
              reason: 'CRITICAL',
              source: 'tap',
              idempotencyKey: `critical:${userId}:${randomUUID()}`,
              metadata: { multiplier: criticalConfig.multiplier },
            });
          }
        }

        await updatePlayerAfterTap(tx, userId, { energy, comboCount, now: new Date() });
      });

      res.json({
        coin,
        coinPerTap,
        energy: Math.floor(energy),
        energyCap,
        comboCount,
        comboMultiplier,
        critical,
      });
    }),
  );

  return router;
}