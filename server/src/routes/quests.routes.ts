import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadPlayerGameState } from '../repositories/game.js';
import { applyLedgerEntry } from '../services/ledger.js';
import { randomUUID } from 'node:crypto';
import { isFeatureEnabled } from '../services/game-config.js';

const claimQuestSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  x2: z.boolean().optional().default(false),
});

export function questsRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/quests - Returns active quest assignments for today
   */
  router.get(
    '/quests',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const assignments = await db.query(
        `SELECT qa.id, qa.template_id, qa.target, qa.reward_xp, qa.reward_coin, qa.reward_bc, qa.reward_gem,
                qa.x2_eligible, qa.progress, qa.status, qt.type, qt.title, qt.description
         FROM quest_assignments qa
         JOIN quest_templates qt ON qt.id = qa.template_id
         WHERE qa.user_id = $1 AND qa.game_day = $2
         ORDER BY qa.id`,
        [userId, today.toISOString().split('T')[0]],
      );

      const [walletRows, state] = await Promise.all([
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
        loadPlayerGameState(db, userId),
      ]);

      const wallet = walletRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };

      res.json({
        assignments: assignments.rows.map(r => ({
          id: r.id,
          templateId: r.template_id,
          type: r.type,
          title: r.title,
          description: r.description,
          target: Number(r.target),
          rewardXp: Number(r.reward_xp),
          rewardCoin: Number(r.reward_coin),
          rewardBc: Number(r.reward_bc),
          rewardGem: Number(r.reward_gem),
          x2Eligible: r.x2_eligible,
          progress: Number(r.progress),
          status: r.status,
        })),
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/quests/claim - Claim a completed quest
   */
  router.post(
    '/quests/claim',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { assignmentId, x2 } = claimQuestSchema.parse(req.body);

      const questEnabled = await isFeatureEnabled(db, 'REWARDED_ADS');
      if (x2 && !questEnabled) {
        throw new HttpError(403, 'rewarded_ads_disabled');
      }

      const assignment = await db.query(
        `SELECT qa.*, qt.type, qt.x2_eligible
         FROM quest_assignments qa
         JOIN quest_templates qt ON qt.id = qa.template_id
         WHERE qa.id = $1 AND qa.user_id = $2`,
        [assignmentId, userId],
      );
      if (assignment.rows.length === 0) throw new HttpError(404, 'quest_not_found');

      const q = assignment.rows[0];
      if (q.status !== 'ACTIVE') throw new HttpError(400, 'quest_not_claimable', 'Quest already claimed or expired');
      if (Number(q.progress) < Number(q.target)) throw new HttpError(400, 'quest_not_complete', 'Quest not yet complete');

      const adEventId = x2 ? randomUUID() : null;
      const rewardSnapshot = {
        xp: Number(q.reward_xp),
        coin: Number(q.reward_coin),
        bc: Number(q.reward_bc),
        gem: Number(q.reward_gem),
        x2: x2,
      };

      await db.transaction(async (tx) => {
        // Mark assignment as claimed
        await tx.query(
          `UPDATE quest_assignments SET status = 'CLAIMED', claimed_at = now() WHERE id = $1`,
          [assignmentId],
        );

        // Create claim record
        await tx.query(
          `INSERT INTO quest_claims (assignment_id, user_id, idempotency_key, reward_snapshot)
           VALUES ($1, $2, $3, $4)`,
          [assignmentId, userId, `quest_claim:${userId}:${assignmentId}:${Date.now()}`, JSON.stringify(rewardSnapshot)],
        );

        // Credit rewards
        if (rewardSnapshot.xp > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'COIN',
            amount: 0,
            reason: 'QUEST_CLAIM',
            source: 'quest',
            idempotencyKey: `quest_xp:${userId}:${assignmentId}:${Date.now()}`,
            metadata: { xp: rewardSnapshot.xp, assignmentId },
          });
          // XP is tracked in player_state
          await tx.query(
            `UPDATE player_state SET xp = xp + $1 WHERE user_id = $2`,
            [rewardSnapshot.xp, userId],
          );
        }
        if (rewardSnapshot.coin > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'COIN',
            amount: rewardSnapshot.coin,
            reason: 'QUEST_CLAIM',
            source: 'quest',
            idempotencyKey: `quest_coin:${userId}:${assignmentId}:${Date.now()}`,
            metadata: { assignmentId },
          });
        }
        if (rewardSnapshot.bc > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'BOOST_CASH',
            amount: rewardSnapshot.bc,
            bcState: 'AVAILABLE',
            reason: 'QUEST_CLAIM',
            source: 'quest',
            idempotencyKey: `quest_bc:${userId}:${assignmentId}:${Date.now()}`,
            metadata: { assignmentId },
          });
        }
        if (rewardSnapshot.gem > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'GEM',
            amount: rewardSnapshot.gem,
            reason: 'QUEST_CLAIM',
            source: 'quest',
            idempotencyKey: `quest_gem:${userId}:${assignmentId}:${Date.now()}`,
            metadata: { assignmentId },
          });
        }

        // If x2, create ad event for tracking
        if (x2 && q.x2_eligible) {
          await tx.query(
            `INSERT INTO ad_events (id, user_id, provider, slot, status, reward_snapshot, expires_at)
             VALUES ($1, $2, 'ADSGRAM', 'DOUBLE_QUEST', 'OFFERED', $3, now() + interval '1 hour')`,
            [adEventId, userId, JSON.stringify(rewardSnapshot)],
          );
        }
      });

      res.json({ success: true, reward: rewardSnapshot });
    }),
  );

  return router;
}