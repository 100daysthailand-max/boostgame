import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { applyLedgerEntry } from '../services/ledger.js';

const equipSkinSchema = z.object({
  skinId: z.coerce.number().int().positive(),
});

export function skinsRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/skins - Returns all skins and player's owned skins
   */
  router.get(
    '/skins',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const [allSkins, playerSkins, walletRows] = await Promise.all([
        db.query(`SELECT id, code, name, buff_type, buff_value, is_default, enabled FROM skins WHERE enabled = TRUE ORDER BY is_default DESC, id`),
        db.query(
          `SELECT ps.skin_id, ps.source, ps.acquired_at, ps.equipped, s.code, s.name, s.buff_type, s.buff_value
           FROM player_skins ps
           JOIN skins s ON s.id = ps.skin_id
           WHERE ps.user_id = $1`,
          [userId],
        ),
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
      ]);

      const wallet = walletRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };
      const ownedMap = new Map(playerSkins.rows.map(r => [r.skin_id, r]));

      res.json({
        all: allSkins.rows.map(s => ({
          ...s,
          owned: ownedMap.has(s.id),
          equipped: ownedMap.get(s.id)?.equipped ?? false,
          source: ownedMap.get(s.id)?.source ?? null,
        })),
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/skins/equip - Equip a skin
   */
  router.post(
    '/skins/equip',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { skinId } = equipSkinSchema.parse(req.body);

      const skin = await db.query(
        `SELECT id FROM skins WHERE id = $1 AND enabled = TRUE`,
        [skinId],
      );
      if (skin.rows.length === 0) throw new HttpError(404, 'skin_not_found');

      const owned = await db.query(
        `SELECT 1 FROM player_skins WHERE user_id = $1 AND skin_id = $2`,
        [userId, skinId],
      );
      if (owned.rows.length === 0) throw new HttpError(400, 'skin_not_owned');

      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE player_skins SET equipped = FALSE WHERE user_id = $1`,
          [userId],
        );
        await tx.query(
          `UPDATE player_skins SET equipped = TRUE WHERE user_id = $1 AND skin_id = $2`,
          [userId, skinId],
        );
      });

      res.json({ success: true, skinId });
    }),
  );

  return router;
}