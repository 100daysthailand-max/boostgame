import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadTapConfig, isFeatureEnabled } from '../services/game-config.js';
import { applyLedgerEntry, InsufficientBalanceError } from '../services/ledger.js';
import { loadPlayerGameState } from '../repositories/game.js';
import { MINER, UPGRADE_CATEGORIES } from '../config/constants.js';

const purchaseKeySchema = z.object({
  durationHours: z.number().min(0.5).max(10),
  source: z.string().min(1),
});

export function minerRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/miner - Returns miner status and key info
   */
  router.get(
    '/miner',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const state = await loadPlayerGameState(db, userId);
      if (!state) throw new HttpError(404, 'player_not_found');

      const [configRows, upgradeRows, keyRows, walletRows] = await Promise.all([
        db.query(`SELECT l1_coin_per_minute, offline_cap_max_hours FROM system_config WHERE key = 'game.miner'`),
        db.query(
          `SELECT uc.category, uc.effect_value FROM player_upgrades pu
           JOIN upgrade_config uc ON uc.category = pu.category AND uc.tier = pu.tier AND uc.level = pu.level
           WHERE pu.user_id = $1 AND pu.category IN ('AUTO_MINER', 'OFFLINE_CAPACITY')`,
          [userId],
        ),
        db.query(
          `SELECT id, expires_at FROM miner_keys WHERE user_id = $1 AND expires_at > now() ORDER BY expires_at DESC LIMIT 1`,
          [userId],
        ),
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
      ]);

      const minerConfig = (configRows.rows[0] as any) ?? { l1_coin_per_minute: MINER.L1_COIN_PER_MINUTE, offline_cap_max_hours: MINER.OFFLINE_CAP_MAX_HOURS };
      const baseRate = Number(minerConfig.l1_coin_per_minute);
      const offlineCapHours = Number(minerConfig.offline_cap_max_hours);

      let autoMinerMultiplier = 1;
      let offlineCapacityHours = 0;
      for (const row of upgradeRows.rows) {
        if ((row as any).category === 'AUTO_MINER') {
          autoMinerMultiplier *= (1 + Number((row as any).effect_value) / 100);
        }
        if ((row as any).category === 'OFFLINE_CAPACITY') {
          offlineCapacityHours += Number((row as any).effect_value);
        }
      }
      offlineCapacityHours = Math.min(offlineCapacityHours, offlineCapHours);

      const onlineRatePerMin = baseRate * autoMinerMultiplier;
      const offlineRatePerMin = onlineRatePerMin; // Can be configured differently

      const activeKey = keyRows.rows[0] ?? null;
      const wallet = walletRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };

      res.json({
        baseRate: baseRate,
        onlineRatePerMinute: onlineRatePerMin,
        offlineRatePerMinute: offlineRatePerMin,
        offlineCapacityHours,
        activeKey: activeKey ? { id: activeKey.id, expiresAt: activeKey.expires_at } : null,
        standardDurationsHours: [2, 3],
        customMinMinutes: 30,
        customMaxHours: 10,
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/miner/purchase-key - Purchase a miner key
   */
  router.post(
    '/miner/purchase-key',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { durationHours, source } = purchaseKeySchema.parse(req.body);

      if (durationHours < 0.5 || durationHours > 10) {
        throw new HttpError(400, 'invalid_duration', 'Duration must be between 0.5 and 10 hours');
      }

      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      // Check if there's already an active key
      const existingKey = await db.query(
        `SELECT id FROM miner_keys WHERE user_id = $1 AND expires_at > now() LIMIT 1`,
        [userId],
      );
      if (existingKey.rows.length > 0) {
        throw new HttpError(400, 'key_active', 'An active miner key already exists');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO miner_keys (user_id, source, started_at, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [userId, source, now.toISOString(), expiresAt.toISOString()],
        );

        await applyLedgerEntry(tx, {
          userId,
          asset: 'COIN',
          amount: 0,
          reason: 'MINER_KEY_PURCHASE',
          source,
          idempotencyKey: `miner_key:${userId}:${Date.now()}`,
          metadata: { durationHours, source },
        });
      });

      res.json({ success: true, expiresAt: expiresAt.toISOString() });
    }),
  );

  /**
   * POST /api/miner/claim-offline - Claim offline earnings
   */
  router.post(
    '/miner/claim-offline',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const key = await db.query(
        `SELECT id, started_at, expires_at FROM miner_keys WHERE user_id = $1 AND expires_at > now() ORDER BY expires_at DESC LIMIT 1`,
        [userId],
      );
      if (key.rows.length === 0) {
        throw new HttpError(400, 'no_active_key', 'No active miner key');
      }
      const keyRow = key.rows[0] as any;

      const [configRows, upgradeRows] = await Promise.all([
        db.query(`SELECT l1_coin_per_minute, offline_cap_max_hours FROM system_config WHERE key = 'game.miner'`),
        db.query(
          `SELECT uc.category, uc.effect_value FROM player_upgrades pu
           JOIN upgrade_config uc ON uc.category = pu.category AND uc.tier = pu.tier AND uc.level = pu.level
           WHERE pu.user_id = $1 AND pu.category IN ('AUTO_MINER', 'OFFLINE_CAPACITY')`,
          [userId],
        ),
      ]);

      const minerConfig = (configRows.rows[0] as any) ?? { l1_coin_per_minute: MINER.L1_COIN_PER_MINUTE, offline_cap_max_hours: MINER.OFFLINE_CAP_MAX_HOURS };
      const baseRate = Number(minerConfig.l1_coin_per_minute);
      const offlineCapHours = Number(minerConfig.offline_cap_max_hours);

      let autoMinerMultiplier = 1;
      let offlineCapacityHours = 0;
      for (const row of upgradeRows.rows) {
        if ((row as any).category === 'AUTO_MINER') {
          autoMinerMultiplier *= (1 + Number((row as any).effect_value) / 100);
        }
        if ((row as any).category === 'OFFLINE_CAPACITY') {
          offlineCapacityHours += Number((row as any).effect_value);
        }
      }
      offlineCapacityHours = Math.min(offlineCapacityHours, offlineCapHours);

      const offlineRatePerMin = baseRate * autoMinerMultiplier;
      const keyStartedAt = new Date(keyRow.started_at);
      const now = new Date();
      const offlineMinutes = Math.max(0, Math.floor((now.getTime() - keyStartedAt.getTime()) / 60000));
      const cappedMinutes = Math.min(offlineMinutes, offlineCapacityHours * 60);

      let offlineEarnings = Math.floor(offlineRatePerMin * cappedMinutes);

      await db.transaction(async (tx) => {
        await applyLedgerEntry(tx, {
          userId,
          asset: 'COIN',
          amount: offlineEarnings,
          reason: 'MINER_EARNING',
          source: 'miner_offline',
          idempotencyKey: `miner_claim_offline:${userId}:${keyRow.id}`,
          metadata: { offlineMinutes: cappedMinutes, ratePerMin: offlineRatePerMin },
        });

        // Update key started_at to now for next offline period
        await tx.query(
          `UPDATE miner_keys SET started_at = $1 WHERE id = $2`,
          [now.toISOString(), keyRow.id],
        );
      });

      res.json({
        success: true,
        offlineEarnings,
        offlineMinutes: cappedMinutes,
        ratePerMinute: offlineRatePerMin,
      });
    }),
  );

  return router;
}