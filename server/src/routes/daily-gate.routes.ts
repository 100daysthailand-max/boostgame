import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadPlayerGameState } from '../repositories/game.js';
import { applyLedgerEntry } from '../services/ledger.js';
import { DAILY_GATE, DAILY_GATE_TASK_STATES } from '../config/constants.js';
import { createHash, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { isFeatureEnabled } from '../services/game-config.js';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const claimCodeSchema = z.object({
  code: z.string().min(1).max(20),
});

const newDaySwitchSchema = z.object({});

export function dailyGateRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  function hashTaskToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  function generateTaskToken(): string {
    return randomBytes(32).toString('base64url');
  }

  function generateCode(): string {
    // 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function hashCode(code: string): string {
    const pepper = env.CODE_HASH_PEPPER ?? '';
    return createHmac('sha256', pepper).update(code).digest('hex');
  }

  function verifyCode(code: string, hash: string): boolean {
    const provided = Buffer.from(hash, 'hex');
    const expected = Buffer.from(hashCode(code), 'hex');
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  /**
   * GET /api/daily-gate/status - Returns daily gate status for today
   */
  router.get(
    '/daily-gate/status',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const [taskRows, streakRows, ndsRows, walletRows] = await Promise.all([
        db.query(
          `SELECT id, kind, link_variant, status, reward_snapshot, expires_at
           FROM daily_gate_tasks WHERE user_id = $1 AND game_day = $2 ORDER BY created_at DESC`,
          [userId, today.toISOString().split('T')[0]],
        ),
        db.query(
          `SELECT current_streak, longest_streak, last_completed_day FROM streaks WHERE user_id = $1`,
          [userId],
        ),
        db.query(
          `SELECT COUNT(*)::int AS count FROM new_day_switch_uses
           WHERE user_id = $1 AND game_day >= (CURRENT_DATE - INTERVAL '30 days')`,
          [userId],
        ),
        db.query(`SELECT coin, gem, bc_available FROM wallets WHERE user_id = $1`, [userId]),
      ]);

      const streak = streakRows.rows[0] ?? { current_streak: 0, longest_streak: 0, last_completed_day: null };
      const ndsUsedToday = await db.query(
        `SELECT 1 FROM new_day_switch_uses WHERE user_id = $1 AND game_day = $2`,
        [userId, today.toISOString().split('T')[0]],
      );
      const ndsUsedMonth = Number(ndsRows.rows[0]?.count ?? 0);
      const wallet = walletRows.rows[0] ?? { coin: 0, gem: 0, bc_available: 0 };

      const completedToday = taskRows.rows.some(t => t.status === 'COMPLETED');
      const normalTask = taskRows.rows.find(t => t.kind === 'NORMAL');
      const fallbackEnabled = await isFeatureEnabled(db, 'DAILY_GATE_FALLBACK');

      // Calculate next reset (00:00 UTC)
      const nextReset = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      res.json({
        completedToday,
        streak: {
          current: Number(streak.current_streak),
          longest: Number(streak.longest_streak),
          lastCompletedDay: streak.last_completed_day,
        },
        milestones: DAILY_GATE.MILESTONES,
        normalTask: normalTask ? {
          id: normalTask.id,
          status: normalTask.status,
          linkVariant: normalTask.link_variant,
          expiresAt: normalTask.expires_at,
          rewardSnapshot: normalTask.reward_snapshot,
        } : null,
        fallbackEnabled,
        newDaySwitch: {
          usedToday: ndsUsedToday.rows.length > 0,
          usedThisMonth: ndsUsedMonth,
          perDayLimit: DAILY_GATE.NEW_DAY_SWITCH_PER_DAY,
          perMonthLimit: DAILY_GATE.NEW_DAY_SWITCH_PER_MONTH,
        },
        nextResetUtc: nextReset.toISOString(),
        wallet: { coin: Number(wallet.coin), gem: Number(wallet.gem), bcAvailable: Number(wallet.bc_available) },
      });
    }),
  );

  /**
   * POST /api/daily-gate/start - Start a normal daily gate task
   */
  router.post(
    '/daily-gate/start',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const dailyGateEnabled = await isFeatureEnabled(db, 'DAILY_GATE');
      if (!dailyGateEnabled) throw new HttpError(403, 'daily_gate_disabled');

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Check if already completed today
      const existing = await db.query(
        `SELECT 1 FROM daily_gate_tasks WHERE user_id = $1 AND game_day = $2 AND kind = 'NORMAL' AND status = 'COMPLETED'`,
        [userId, today.toISOString().split('T')[0]],
      );
      if (existing.rows.length > 0) {
        throw new HttpError(400, 'already_completed', 'Daily Gate already completed today');
      }

      // Check for existing pending task
      const pending = await db.query(
        `SELECT id FROM daily_gate_tasks WHERE user_id = $1 AND game_day = $2 AND kind = 'NORMAL' AND status NOT IN ('COMPLETED', 'EXPIRED', 'REJECTED', 'CANCELLED')`,
        [userId, today.toISOString().split('T')[0]],
      );
      if (pending.rows.length > 0) {
        throw new HttpError(400, 'task_pending', 'Daily Gate task already in progress');
      }

      // Load reward config
      const config = await db.query(
        `SELECT value FROM system_config WHERE key = 'daily_gate'`,
      );
      const dailyGateConfig = (config.rows[0]?.value as any) ?? {
        resetHourUtc: DAILY_GATE.RESET_HOUR_UTC,
        reminderHourUtc: DAILY_GATE.REMINDER_HOUR_UTC,
        ttlMinutes: DAILY_GATE.TTL_MINUTES,
        milestones: DAILY_GATE.MILESTONES,
      };

      const rewardBc = 1000; // Default, should come from config
      const rewardSnapshot = { bc: rewardBc };

      const token = generateTaskToken();
      const tokenHash = hashTaskToken(token);
      const expiresAt = new Date(Date.now() + (dailyGateConfig.ttlMinutes ?? DAILY_GATE.TTL_MINUTES) * 60 * 1000);
      const linkVariant = Math.random() < 0.5 ? 'A' : 'B';

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO daily_gate_tasks (user_id, game_day, kind, link_variant, status, task_token_hash, reward_snapshot, expires_at)
           VALUES ($1, $2, 'NORMAL', $3, 'CREATED', $4, $5, $6)`,
          [userId, today.toISOString().split('T')[0], linkVariant, tokenHash, JSON.stringify(rewardSnapshot), expiresAt.toISOString()],
        );
      });

      const dailyGateUrl = `${env.DAILY_GATE_URL}/t/${token}`;
      res.json({ taskUrl: dailyGateUrl, expiresAt: expiresAt.toISOString() });
    }),
  );

  /**
   * POST /api/daily-gate/code/claim - Claim daily gate code
   */
  router.post(
    '/daily-gate/code/claim',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { code } = claimCodeSchema.parse(req.body);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const task = await db.query(
        `SELECT id, kind, status, reward_snapshot, expires_at FROM daily_gate_tasks
         WHERE user_id = $1 AND game_day = $2 AND kind = 'NORMAL' AND status = 'CODE_ISSUED'`,
        [userId, today.toISOString().split('T')[0]],
      );
      if (task.rows.length === 0) {
        throw new HttpError(400, 'no_pending_task', 'No pending Daily Gate task');
      }
      const taskRow = task.rows[0] as any;

      if (new Date(taskRow.expires_at) < new Date()) {
        await db.query(
          `UPDATE daily_gate_tasks SET status = 'EXPIRED' WHERE id = $1`,
          [taskRow.id],
        );
        throw new HttpError(400, 'task_expired', 'Daily Gate task expired');
      }

      const codeRow = await db.query(
        `SELECT code_hash, status FROM daily_gate_codes WHERE task_id = $1`,
        [taskRow.id],
      );
      if (codeRow.rows.length === 0) {
        throw new HttpError(400, 'code_not_issued', 'Code not yet issued');
      }
      const codeHash = codeRow.rows[0].code_hash as string;
      if (codeRow.rows[0].status !== 'ISSUED') {
        throw new HttpError(400, 'code_used', 'Code already used');
      }

      if (!verifyCode(code, codeHash)) {
        throw new HttpError(400, 'invalid_code', 'Invalid code');
      }

      const rewardSnapshot = taskRow.reward_snapshot as { bc: number };

      await db.transaction(async (tx) => {
        // Consume code
        await tx.query(
          `UPDATE daily_gate_codes SET status = 'CONSUMED', consumed_at = now() WHERE task_id = $1`,
          [taskRow.id],
        );

        // Complete task
        await tx.query(
          `UPDATE daily_gate_tasks SET status = 'COMPLETED' WHERE id = $1`,
          [taskRow.id],
        );

        // Credit BC
        await applyLedgerEntry(tx, {
          userId,
          asset: 'BOOST_CASH',
          amount: rewardSnapshot.bc,
          bcState: 'AVAILABLE',
          reason: 'DAILY_GATE_REWARD',
          source: 'daily_gate',
          idempotencyKey: `daily_gate_claim:${taskRow.id}`,
          metadata: { kind: 'NORMAL' },
        });

        // Update streak
        await tx.query(
          `INSERT INTO streaks (user_id, current_streak, longest_streak, last_completed_day)
           VALUES ($1, 1, 1, $2)
           ON CONFLICT (user_id) DO UPDATE SET
             current_streak = CASE
               WHEN last_completed_day = $2 - INTERVAL '1 day' THEN streaks.current_streak + 1
               ELSE 1
             END,
             longest_streak = GREATEST(streaks.longest_streak,
               CASE
                 WHEN last_completed_day = $2 - INTERVAL '1 day' THEN streaks.current_streak + 1
                 ELSE 1
               END),
             last_completed_day = $2`,
          [userId, today.toISOString().split('T')[0]],
        );

        // Update quest progress for Daily Gate type
        await tx.query(
          `UPDATE quest_assignments SET progress = target, status = 'ACTIVE'
           WHERE user_id = $1 AND game_day = $2
           AND template_id IN (SELECT id FROM quest_templates WHERE type = 'DAILY_GATE')`,
          [userId, today.toISOString().split('T')[0]],
        );
      });

      res.json({ success: true, reward: rewardSnapshot });
    }),
  );

  /**
   * POST /api/daily-gate/new-day-switch - Use New Day Switch
   */
  router.post(
    '/daily-gate/new-day-switch',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const ndsEnabled = await isFeatureEnabled(db, 'NEW_DAY_SWITCH');
      if (!ndsEnabled) throw new HttpError(403, 'new_day_switch_disabled');

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Check daily limit
      const usedToday = await db.query(
        `SELECT 1 FROM new_day_switch_uses WHERE user_id = $1 AND game_day = $2`,
        [userId, today.toISOString().split('T')[0]],
      );
      if (usedToday.rows.length > 0) {
        throw new HttpError(400, 'daily_limit_reached', 'New Day Switch already used today');
      }

      // Check monthly limit
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const usedMonth = await db.query(
        `SELECT COUNT(*)::int AS count FROM new_day_switch_uses
         WHERE user_id = $1 AND game_day >= $2`,
        [userId, monthStart.toISOString().split('T')[0]],
      );
      if (Number(usedMonth.rows[0]?.count ?? 0) >= DAILY_GATE.NEW_DAY_SWITCH_PER_MONTH) {
        throw new HttpError(400, 'monthly_limit_reached', 'Monthly New Day Switch limit reached');
      }

      // Check if streak was broken yesterday
      const streak = await db.query(
        `SELECT current_streak, last_completed_day FROM streaks WHERE user_id = $1`,
        [userId],
      );
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastCompleted = streak.rows[0]?.last_completed_day ? new Date(streak.rows[0].last_completed_day as string) : null;
      if (lastCompleted && lastCompleted.getTime() === yesterday.getTime()) {
        throw new HttpError(400, 'streak_intact', 'Streak is already intact, New Day Switch not needed');
      }

      // Create NEW_DAY_SWITCH task
      const token = generateTaskToken();
      const tokenHash = hashTaskToken(token);
      const expiresAt = new Date(Date.now() + DAILY_GATE.TTL_MINUTES * 60 * 1000);
      const rewardSnapshot = { bc: 500 }; // Reduced reward

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO daily_gate_tasks (user_id, game_day, kind, status, task_token_hash, reward_snapshot, expires_at)
           VALUES ($1, $2, 'NEW_DAY_SWITCH', 'CREATED', $3, $4, $5)`,
          [userId, today.toISOString().split('T')[0], tokenHash, JSON.stringify(rewardSnapshot), expiresAt.toISOString()],
        );

        await tx.query(
          `INSERT INTO new_day_switch_uses (user_id, game_day) VALUES ($1, $2)`,
          [userId, today.toISOString().split('T')[0]],
        );
      });

      const dailyGateUrl = `${env.DAILY_GATE_URL}/t/${token}`;
      res.json({ taskUrl: dailyGateUrl, expiresAt: expiresAt.toISOString() });
    }),
  );

  return router;
}