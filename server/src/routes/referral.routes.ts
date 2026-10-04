import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadPlayerGameState } from '../repositories/game.js';
import { applyLedgerEntry } from '../services/ledger.js';
import { REFERRAL } from '../config/constants.js';
import { isFeatureEnabled } from '../services/game-config.js';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export function referralRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/referral - Get referral info
   */
  router.get(
    '/referral',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const referralEnabled = await isFeatureEnabled(db, 'REFERRAL');
      if (!referralEnabled) throw new HttpError(403, 'referral_disabled');

      const [myReferral, referrals, walletRows] = await Promise.all([
        db.query(
          `SELECT referrer_id, status, qualified_at FROM referrals WHERE referee_id = $1`,
          [userId],
        ),
        db.query(
          `SELECT r.referee_id, r.status, r.qualified_at, u.username, u.first_name
           FROM referrals r
           JOIN users u ON u.id = r.referee_id
           WHERE r.referrer_id = $1
           ORDER BY r.created_at DESC LIMIT 50`,
          [userId],
        ),
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
      ]);

      const wallet = walletRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };
      const myReferrer = myReferral.rows[0] ?? null;

      // Generate deep link
      const botUsername = env.TELEGRAM_BOT_USERNAME;
      const deepLink = `https://t.me/${botUsername}?start=${userId}`;

      res.json({
        deepLink,
        myReferrer: myReferrer ? {
          referrerId: myReferrer.referrer_id,
          status: myReferrer.status,
          qualifiedAt: myReferrer.qualified_at,
        } : null,
        referrals: referrals.rows.map(r => ({
          refereeId: r.referee_id,
          username: r.username,
          firstName: r.first_name,
          status: r.status,
          qualifiedAt: r.qualified_at,
        })),
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/referral/check-qualification - Check if referee qualifies (called after onboarding)
   */
  router.post(
    '/referral/check-qualification',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const referralEnabled = await isFeatureEnabled(db, 'REFERRAL');
      if (!referralEnabled) throw new HttpError(403, 'referral_disabled');

      const myReferral = await db.query(
        `SELECT referrer_id, status FROM referrals WHERE referee_id = $1`,
        [userId],
      );
      if (myReferral.rows.length === 0) {
        res.json({ qualified: false, reason: 'no_referrer' });
        return;
      }

      const referral = myReferral.rows[0] as any;
      if (referral.status !== 'PENDING') {
        res.json({ qualified: false, reason: `already_${String(referral.status).toLowerCase()}` });
        return;
      }

      // Check requirements: 3 memberships + level 1 + first Daily Gate
      const [membership, state, dailyGate] = await Promise.all([
        db.query(`SELECT main_channel, group_chat, payout_channel FROM memberships WHERE user_id = $1`, [userId]),
        loadPlayerGameState(db, userId),
        db.query(
          `SELECT 1 FROM daily_gate_tasks WHERE user_id = $1 AND kind = 'NORMAL' AND status = 'COMPLETED' LIMIT 1`,
          [userId],
        ),
      ]);

      const mem = membership.rows[0];
      const allMemberships = mem?.main_channel && mem?.group_chat && mem?.payout_channel;
      const levelOk = state && state.level >= 1;
      const dailyGateDone = dailyGate.rows.length > 0;

      if (allMemberships && levelOk && dailyGateDone) {
        await db.query(
          `UPDATE referrals SET status = 'QUALIFIED', qualified_at = now() WHERE referee_id = $1`,
          [userId],
        );

        // Grant referrer reward after review delay (handled by background job)
        // For now, grant immediately
        const rewardBc = 1000; // Should come from config
        await db.transaction(async (tx) => {
          await applyLedgerEntry(tx, {
            userId: referral.referrer_id,
            asset: 'BOOST_CASH',
            amount: rewardBc,
            bcState: 'AVAILABLE',
            reason: 'REFERRAL_REWARD',
            source: 'referral',
            idempotencyKey: `referral_reward:${referral.referrer_id}:${userId}`,
            metadata: { refereeId: userId },
          });
        });

        res.json({ qualified: true, rewardBc });
      } else {
        res.json({
          qualified: false,
          reason: 'requirements_not_met',
          requirements: {
            memberships: allMemberships,
            level: levelOk,
            dailyGate: dailyGateDone,
          },
        });
      }
    }),
  );

  return router;
}