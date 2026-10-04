import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAdminAuth } from '../http/middleware/admin-auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';

export function adminRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAdminAuth(db);

  // Apply auth to all admin routes
  router.use(auth);

  /**
   * GET /api/admin/dashboard - Admin dashboard overview
   */
  router.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const [
        usersCount,
        activeUsers,
        totalTaps,
        totalCoin,
        totalBc,
        totalGem,
        pendingWithdrawals,
        dailyGateStats,
        adStats,
      ] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS count FROM users`),
        db.query(`SELECT COUNT(*)::int AS count FROM users WHERE updated_at > now() - INTERVAL '24 hours'`),
        db.query(`SELECT COUNT(*)::int AS count FROM ledger_entries WHERE reason = 'TAP'`),
        db.query(`SELECT SUM(coin)::bigint AS total FROM wallets`),
        db.query(`SELECT SUM(bc_available + bc_locked + bc_withheld)::bigint AS total FROM wallets`),
        db.query(`SELECT SUM(gem)::bigint AS total FROM wallets`),
        db.query(`SELECT COUNT(*)::int AS count FROM withdrawals WHERE status = 'REQUESTED'`),
        db.query(
          `SELECT
             COUNT(*) FILTER (WHERE kind = 'NORMAL' AND status = 'COMPLETED') AS normal_completed,
             COUNT(*) FILTER (WHERE kind = 'FALLBACK' AND status = 'COMPLETED') AS fallback_completed,
             COUNT(*) FILTER (WHERE status = 'CODE_ISSUED') AS codes_pending
           FROM daily_gate_tasks WHERE game_day = CURRENT_DATE`,
        ),
        db.query(
          `SELECT
             provider,
             COUNT(*) FILTER (WHERE status = 'OFFERED') AS offered,
             COUNT(*) FILTER (WHERE status = 'VERIFIED') AS verified,
             COUNT(*) FILTER (WHERE status = 'CREDITED') AS credited,
             COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
           FROM ad_events WHERE created_at > now() - INTERVAL '24 hours'
           GROUP BY provider`,
        ),
      ]);

      res.json({
        users: { total: usersCount.rows[0]?.count ?? 0, active24h: activeUsers.rows[0]?.count ?? 0 },
        taps: { total: totalTaps.rows[0]?.count ?? 0 },
        economy: {
          coin: Number(totalCoin.rows[0]?.total ?? 0),
          bc: Number(totalBc.rows[0]?.total ?? 0),
          gem: Number(totalGem.rows[0]?.total ?? 0),
        },
        withdrawals: { pending: pendingWithdrawals.rows[0]?.count ?? 0 },
        dailyGate: dailyGateStats.rows[0] ?? {},
        ads: adStats.rows,
      });
    }),
  );

  /**
   * GET /api/admin/players - Search players
   */
  router.get(
    '/players',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const { q, limit = '50', offset = '0' } = req.query;
      let query = `SELECT id, telegram_id, username, first_name, is_banned, created_at FROM users`;
      const params: any[] = [];

      if (q) {
        query += ` WHERE telegram_id::text ILIKE $1 OR username ILIKE $1 OR first_name ILIKE $1`;
        params.push(`%${q}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), Number(offset));

      const result = await db.query(query, params);
      res.json({ players: result.rows });
    }),
  );

  /**
   * GET /api/admin/players/:id - Get player detail
   */
  router.get(
    '/players/:id',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');
      const playerId = req.params.id;

      const [user, state, wallet, membership, upgrades, boosts, keys, skins, quests, dailyGate, streak, ads, referrals, withdrawals, risk, tickets] = await Promise.all([
        db.query(`SELECT * FROM users WHERE id = $1`, [playerId]),
        db.query(`SELECT * FROM player_state WHERE user_id = $1`, [playerId]),
        db.query(`SELECT * FROM wallets WHERE user_id = $1`, [playerId]),
        db.query(`SELECT * FROM memberships WHERE user_id = $1`, [playerId]),
        db.query(`SELECT * FROM player_upgrades WHERE user_id = $1`, [playerId]),
        db.query(`SELECT * FROM boosts WHERE user_id = $1 AND expires_at > now()`, [playerId]),
        db.query(`SELECT * FROM miner_keys WHERE user_id = $1 AND expires_at > now()`, [playerId]),
        db.query(
          `SELECT ps.*, s.code, s.name, s.buff_type, s.buff_value
           FROM player_skins ps JOIN skins s ON s.id = ps.skin_id
           WHERE ps.user_id = $1`, [playerId],
        ),
        db.query(
          `SELECT qa.*, qt.type, qt.title FROM quest_assignments qa
           JOIN quest_templates qt ON qt.id = qa.template_id
           WHERE qa.user_id = $1 AND qa.game_day = CURRENT_DATE`, [playerId],
        ),
        db.query(`SELECT * FROM daily_gate_tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [playerId]),
        db.query(`SELECT * FROM streaks WHERE user_id = $1`, [playerId]),
        db.query(`SELECT * FROM ad_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [playerId]),
        db.query(
          `SELECT r.*, u.username AS referee_username FROM referrals r
           JOIN users u ON u.id = r.referee_id
           WHERE r.referrer_id = $1`, [playerId],
        ),
        db.query(`SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 20`, [playerId]),
        db.query(`SELECT * FROM risk_signals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [playerId]),
        db.query(`SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [playerId]),
      ]);

      if (user.rows.length === 0) throw new HttpError(404, 'player_not_found');

      res.json({
        user: user.rows[0],
        state: state.rows[0] ?? {},
        wallet: wallet.rows[0] ?? {},
        membership: membership.rows[0] ?? {},
        upgrades: upgrades.rows,
        boosts: boosts.rows,
        keys: keys.rows,
        skins: skins.rows,
        quests: quests.rows,
        dailyGate: dailyGate.rows,
        streak: streak.rows[0] ?? {},
        ads: ads.rows,
        referrals: referrals.rows,
        withdrawals: withdrawals.rows,
        risk: risk.rows,
        tickets: tickets.rows,
      });
    }),
  );

  /**
   * POST /api/admin/players/:id/action - Admin actions on player
   */
  router.post(
    '/players/:id/action',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');
      const playerId = req.params.id;

      const schema = z.object({
        action: z.enum(['lock_withdrawal', 'unlock_withdrawal', 'ban', 'unban', 'recheck_membership', 'revoke_task', 'adjust_balance', 'add_note']),
        reason: z.string().min(1),
        amount: z.number().int().optional(),
        asset: z.enum(['COIN', 'BOOST_CASH', 'GEM']).optional(),
        bcState: z.enum(['AVAILABLE', 'LOCKED', 'WITHHELD']).optional(),
        taskId: z.string().uuid().optional(),
      }).parse(req.body);

      const user = await db.query(`SELECT id, telegram_id FROM users WHERE id = $1`, [playerId]);
      if (user.rows.length === 0) throw new HttpError(404, 'player_not_found');

      // In a real implementation, each action would be implemented here with audit logging
      // For now, return success
      res.json({ success: true, action: schema.action });
    }),
  );

  /**
   * GET /api/admin/config - Get all system config
   */
  router.get(
    '/config',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const [flags, configs] = await Promise.all([
        db.query(`SELECT * FROM feature_flags`),
        db.query(`SELECT * FROM system_config`),
      ]);

      res.json({ featureFlags: flags.rows, systemConfig: configs.rows });
    }),
  );

  /**
   * POST /api/admin/config/flag - Update feature flag
   */
  router.post(
    '/config/flag',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const schema = z.object({ key: z.string(), enabled: z.boolean(), reason: z.string().optional() });
      const { key, enabled, reason } = schema.parse(req.body);

      await db.query(
        `UPDATE feature_flags SET enabled = $1, updated_at = now() WHERE key = $2`,
        [enabled, key],
      );

      // Audit log
      await db.query(
        `INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, before_state, after_state, reason)
         VALUES ($1, 'UPDATE_FEATURE_FLAG', 'feature_flag', $2, $3, $4, $5)`,
        [req.auth!.userId, key, JSON.stringify({ enabled: !enabled }), JSON.stringify({ enabled }), reason ?? ''],
      );

      res.json({ success: true });
    }),
  );

  /**
   * POST /api/admin/config/game - Update game config
   */
  router.post(
    '/config/game',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const schema = z.object({ key: z.string(), value: z.record(z.unknown()), reason: z.string().optional() });
      const { key, value, reason } = schema.parse(req.body);

      await db.query(
        `INSERT INTO system_config (key, value, version, effective_at, reason)
         VALUES ($1, $2::jsonb, COALESCE((SELECT version + 1 FROM system_config WHERE key = $1), 1), now(), $3)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           version = EXCLUDED.version,
           effective_at = EXCLUDED.effective_at,
           reason = EXCLUDED.reason,
           updated_at = now()`,
        [key, JSON.stringify(value), reason ?? ''],
      );

      await db.query(
        `INSERT INTO system_config_history (key, value, version, reason)
         VALUES ($1, $2::jsonb, COALESCE((SELECT version + 1 FROM system_config WHERE key = $1), 1), $3)`,
        [key, JSON.stringify(value), reason ?? ''],
      );

      await db.query(
        `INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, before_state, after_state, reason)
         VALUES ($1, 'UPDATE_SYSTEM_CONFIG', 'system_config', $2, $3, $4, $5)`,
        [req.auth!.userId, key, '{}', JSON.stringify(value), reason ?? ''],
      );

      res.json({ success: true });
    }),
  );

  /**
   * GET /api/admin/withdrawals - List withdrawals for admin
   */
  router.get(
    '/withdrawals',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const { status, limit = '50', offset = '0' } = req.query;
      let query = `SELECT w.*, u.telegram_id, u.username FROM withdrawals w JOIN users u ON u.id = w.user_id`;
      const params: any[] = [];

      if (status) {
        query += ` WHERE w.status = $1`;
        params.push(status);
      }

      query += ` ORDER BY w.requested_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), Number(offset));

      const result = await db.query(query, params);
      res.json({ withdrawals: result.rows });
    }),
  );

  /**
   * POST /api/admin/withdrawals/:id/action - Admin withdrawal action
   */
  router.post(
    '/withdrawals/:id/action',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');
      const withdrawalId = req.params.id;

      const schema = z.object({
        action: z.enum(['approve', 'reject_violation', 'reject_system_error', 'mark_paid']),
        reason: z.string().optional(),
        txReference: z.string().optional(),
      });
      const { action, reason, txReference } = schema.parse(req.body);

      const withdrawal = await db.query(`SELECT * FROM withdrawals WHERE id = $1`, [withdrawalId]);
      if (withdrawal.rows.length === 0) throw new HttpError(404, 'withdrawal_not_found');

      const w = withdrawal.rows[0];
      if (w.status !== 'REQUESTED' && action !== 'mark_paid') {
        throw new HttpError(400, 'invalid_status', `Cannot ${action} withdrawal in status ${w.status}`);
      }

      await db.transaction(async (tx) => {
        if (action === 'approve') {
          await tx.query(
            `UPDATE withdrawals SET status = 'APPROVED', decided_at = now() WHERE id = $1`,
            [withdrawalId],
          );
        } else if (action === 'reject_violation') {
          await tx.query(
            `UPDATE withdrawals SET status = 'REJECTED', reject_kind = 'VIOLATION', reject_reason = $1, decided_at = now() WHERE id = $2`,
            [reason ?? 'Violation', withdrawalId],
          );
          // BC is forfeited - already locked
        } else if (action === 'reject_system_error') {
          await tx.query(
            `UPDATE withdrawals SET status = 'REJECTED', reject_kind = 'SYSTEM_ERROR', reject_reason = $1, decided_at = now() WHERE id = $2`,
            [reason ?? 'System error', withdrawalId],
          );
          // Restore BC
          await tx.query(
            `INSERT INTO ledger_entries (user_id, asset, bc_state, amount, reason, source, idempotency_key, balance_after)
             SELECT w.user_id, 'BOOST_CASH', 'AVAILABLE', w.amount_bc, 'WITHDRAWAL_RESTORE', 'admin_restore', 'withdrawal_restore:' || w.id, w.amount_bc + COALESCE(wl.bc_available, 0)
             FROM withdrawals w
             JOIN wallets wl ON wl.user_id = w.user_id
             WHERE w.id = $1`,
            [withdrawalId],
          );
          await tx.query(
            `UPDATE wallets SET bc_available = bc_available + $1 WHERE user_id = (SELECT user_id FROM withdrawals WHERE id = $2)`,
            [w.amount_bc, withdrawalId],
          );
        } else if (action === 'mark_paid') {
          await tx.query(
            `UPDATE withdrawals SET status = 'PAID', tx_reference = $1, paid_at = now() WHERE id = $2`,
            [txReference ?? '', withdrawalId],
          );
        }

        // Audit log
        await tx.query(
          `INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, before_state, after_state, reason)
           VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6)`,
          [req.auth!.userId, `WITHDRAWAL_${action.toUpperCase()}`, withdrawalId, JSON.stringify(w), JSON.stringify({ ...w, status: action === 'mark_paid' ? 'PAID' : action.toUpperCase() }), reason ?? ''],
        );
      });

      res.json({ success: true });
    }),
  );

  return router;
}