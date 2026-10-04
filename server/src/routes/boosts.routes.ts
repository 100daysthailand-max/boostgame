import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadTapConfig, isFeatureEnabled } from '../services/game-config.js';
import { applyLedgerEntry, InsufficientBalanceError } from '../services/ledger.js';
import { BOOST_TYPES, BOOST } from '../config/constants.js';

const activateBoostSchema = z.object({
  type: z.enum(BOOST_TYPES),
  source: z.string().min(1),
});

const purchaseKeySchema = z.object({
  durationHours: z.number().min(0.5).max(10),
  source: z.string().min(1),
});

export function boostsRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/boosts - Returns active boosts and available boost configs
   */
  router.get(
    '/boosts',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const [configRows, activeRows, playerRows] = await Promise.all([
        db.query(`SELECT type, multiplier, duration_seconds, max_stack_seconds, enabled FROM boost_config WHERE enabled = TRUE`),
        db.query(
          `SELECT id, type, multiplier, expires_at FROM boosts WHERE user_id = $1 AND expires_at > now() ORDER BY expires_at`,
          [userId],
        ),
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
      ]);

      const wallet = playerRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };

      res.json({
        configs: configRows.rows,
        active: activeRows.rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          multiplier: r.multiplier,
          expiresAt: r.expires_at,
        })),
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/boosts/activate - Activate a temporary boost
   */
  router.post(
    '/boosts/activate',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { type, source } = activateBoostSchema.parse(req.body);

      const config = await db.query(
        `SELECT multiplier, duration_seconds, max_stack_seconds FROM boost_config WHERE type = $1 AND enabled = TRUE`,
        [type],
      );
      if (config.rows.length === 0) throw new HttpError(400, 'boost_not_available');

      const { multiplier, duration_seconds, max_stack_seconds } = config.rows[0] as any;

      const existing = await db.query(
        `SELECT SUM(EXTRACT(EPOCH FROM (expires_at - now()))) AS remaining_seconds
         FROM boosts WHERE user_id = $1 AND type = $2 AND expires_at > now()`,
        [userId, type],
      );
      const currentRemaining = Number(existing.rows[0]?.remaining_seconds ?? 0);
      const newTotal = currentRemaining + duration_seconds;
      if (newTotal > max_stack_seconds && max_stack_seconds > 0) {
        throw new HttpError(400, 'max_stack_reached', `Maximum stack time reached for ${type}`);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + duration_seconds * 1000);

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO boosts (user_id, type, multiplier, source, started_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, type, multiplier, source, now.toISOString(), expiresAt.toISOString()],
        );

        await applyLedgerEntry(tx, {
          userId,
          asset: 'COIN',
          amount: 0,
          reason: 'BOOST_ACTIVATION',
          source,
          idempotencyKey: `boost_activate:${userId}:${type}:${Date.now()}`,
          metadata: { type, multiplier, durationSeconds: duration_seconds },
        });
      });

      res.json({ success: true, type, multiplier, expiresAt: expiresAt.toISOString() });
    }),
  );

  return router;
}