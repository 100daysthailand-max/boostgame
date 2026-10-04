import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadTapConfig, getFeatureFlags, isFeatureEnabled } from '../services/game-config.js';
import { loadPlayerGameState, computeEnergyCap } from '../repositories/game.js';
import { applyLedgerEntry, InsufficientBalanceError } from '../services/ledger.js';
import { PROGRESSION, UPGRADE_CATEGORIES } from '../config/constants.js';

const upgradeBodySchema = z.object({
  category: z.enum(UPGRADE_CATEGORIES),
});

export function upgradesRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/upgrades - Returns upgrade config and player's current levels
   */
  router.get(
    '/upgrades',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const tapConfig = await loadTapConfig(db);
      const state = await loadPlayerGameState(db, userId);
      if (!state) throw new HttpError(404, 'player_not_found');

      const [configRows, playerRows] = await Promise.all([
        db.query(
          `SELECT category, tier, level, required_account_level, cost_coin, cost_gem, cost_bc, effect_value, enabled
           FROM upgrade_config WHERE enabled = TRUE ORDER BY category, tier, level`,
        ),
        db.query(
          `SELECT category, tier, level FROM player_upgrades WHERE user_id = $1`,
          [userId],
        ),
      ]);

      const playerUpgrades = new Map<string, { tier: number; level: number }>();
      for (const row of playerRows.rows) {
        playerUpgrades.set(row.category as string, { tier: row.tier as number, level: row.level as number });
      }

      const energyCap = await computeEnergyCap(db, userId, tapConfig.energyCapL1Ceiling);
      const nextTierUnlockLevel = Math.min(99, Math.floor((state.level - 1) / PROGRESSION.TIER_UNLOCK_EVERY_LEVELS) * PROGRESSION.TIER_UNLOCK_EVERY_LEVELS + PROGRESSION.TIER_UNLOCK_EVERY_LEVELS + 1);

      const categories = configRows.rows.reduce((acc: Record<string, any>, row: any) => {
        const current = playerUpgrades.get(row.category) ?? { tier: 1, level: 0 };
        const isUnlocked = state.level >= row.required_account_level;
        const canUpgrade = isUnlocked && current.level < PROGRESSION.UPGRADE_MAX_LEVEL_PER_TIER && row.tier === current.tier && row.level === current.level + 1;
        const nextConfig = configRows.rows.find(r => r.category === row.category && r.tier === current.tier && r.level === current.level + 1);

        if (!acc[row.category]) {
          acc[row.category] = {
            category: row.category,
            currentTier: current.tier,
            currentLevel: current.level,
            maxLevelPerTier: PROGRESSION.UPGRADE_MAX_LEVEL_PER_TIER,
            requiredAccountLevel: row.required_account_level,
            isUnlocked,
            nextTierUnlockLevel: isUnlocked ? null : nextTierUnlockLevel,
            levels: [],
          };
        }

        acc[(row.category as string)].levels.push({
          tier: row.tier as number,
          level: row.level as number,
          costCoin: row.cost_coin as number,
          costGem: row.cost_gem as number,
          costBc: row.cost_bc as number,
          effectValue: row.effect_value as number,
          enabled: row.enabled as boolean,
          isCurrent: row.tier === current.tier && row.level === current.level,
          isNext: canUpgrade,
        });

        return acc;
      }, {} as Record<string, any>);

      res.json({
        playerLevel: state.level,
        energyCap,
        categories: Object.values(categories),
      });
    }),
  );

  /**
   * POST /api/upgrades/purchase - Purchase an upgrade level
   */
  router.post(
    '/upgrades/purchase',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { category } = upgradeBodySchema.parse(req.body);

      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const currentUpgrade = await db.query(
        `SELECT tier, level FROM player_upgrades WHERE user_id = $1 AND category = $2`,
        [userId, category],
      );
      const current = currentUpgrade.rows[0] as { tier: number; level: number } ?? { tier: 1, level: 0 };

      const nextConfig = await db.query(
        `SELECT tier, level, required_account_level, cost_coin, cost_gem, cost_bc, effect_value, enabled
         FROM upgrade_config
         WHERE category = $1 AND tier = $2 AND level = $3 AND enabled = TRUE`,
        [category, current.tier, current.level + 1],
      );
      if (nextConfig.rows.length === 0) {
        throw new HttpError(400, 'upgrade_not_available', 'Upgrade not available or max level reached');
      }
      const config = nextConfig.rows[0] as any;

      if (state.level < config.required_account_level) {
        throw new HttpError(400, 'level_requirement_not_met', `Reach Account Level ${config.required_account_level} to unlock the next tier.`);
      }

      if (current.level >= PROGRESSION.UPGRADE_MAX_LEVEL_PER_TIER) {
        throw new HttpError(400, 'max_level_reached', 'Maximum level for this tier reached');
      }

      let asset: 'COIN' | 'GEM' | 'BOOST_CASH' = 'COIN';
      let cost = Number(config.cost_coin);
      if (config.cost_gem > 0) {
        asset = 'GEM';
        cost = Number(config.cost_gem);
      } else if (config.cost_bc > 0) {
        asset = 'BOOST_CASH';
        cost = Number(config.cost_bc);
      }

      await db.transaction(async (tx) => {
        await applyLedgerEntry(tx, {
          userId,
          asset,
          amount: -cost,
          reason: 'UPGRADE_PURCHASE',
          source: 'upgrade',
          idempotencyKey: `upgrade_purchase:${userId}:${category}:${config.tier}:${config.level}:${Date.now()}`,
          metadata: { category, tier: config.tier, level: config.level },
        });

        await tx.query(
          `INSERT INTO player_upgrades (user_id, category, tier, level, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (user_id, category) DO UPDATE SET
             tier = EXCLUDED.tier,
             level = EXCLUDED.level,
             updated_at = now()`,
          [userId, category, config.tier, config.level],
        );
      });

      res.json({ success: true, category, tier: config.tier, level: config.level });
    }),
  );

  return router;
}