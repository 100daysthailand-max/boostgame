import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadPlayerGameState } from '../repositories/game.js';
import { applyLedgerEntry, InsufficientBalanceError } from '../services/ledger.js';
import { CONVERSION, WITHDRAWAL } from '../config/constants.js';
import { isFeatureEnabled } from '../services/game-config.js';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const convertSchema = z.object({
  coinAmount: z.number().int().positive(),
});

const withdrawalSchema = z.object({
  amountBc: z.number().int().positive(),
  walletAddress: z.string().min(1).max(100),
});

export function walletRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/wallet/conversion-quote - Get conversion quote
   */
  router.get(
    '/wallet/conversion-quote',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const conversionEnabled = await isFeatureEnabled(db, 'CONVERSION');
      if (!conversionEnabled) throw new HttpError(403, 'conversion_disabled');

      const state = await loadPlayerGameState(db, userId);
      if (!state) throw new HttpError(404, 'player_not_found');

      const wallet = await db.query(`SELECT coin, bc_available FROM wallets WHERE user_id = $1`, [userId]);
      const walletRow = wallet.rows[0] ?? { coin: 0, bc_available: 0 };

      const config = await db.query(`SELECT value FROM system_config WHERE key = 'economy.conversion'`);
      const conversionConfig = (config.rows[0]?.value as any) ?? {
        cooldownHours: CONVERSION.COOLDOWN_HOURS,
        referenceCoin: CONVERSION.REFERENCE_COIN,
        referenceTon: CONVERSION.REFERENCE_TON,
        enabled: true,
        emergencyGlobalCap: null,
        emergencyPerUserCap: null,
        soldOut: false,
      };

      if (!conversionConfig.enabled || conversionConfig.soldOut) {
        throw new HttpError(403, 'conversion_unavailable', 'Conversion temporarily unavailable');
      }

      // Check cooldown
      if (state.conversionAvailableAt && new Date(state.conversionAvailableAt) > new Date()) {
        throw new HttpError(429, 'conversion_cooldown', 'Conversion on cooldown');
      }

      // Check emergency caps (simplified)
      // In production, check global and per-user caps

      const rate = conversionConfig.referenceTon / conversionConfig.referenceCoin; // TON per Coin
      const referenceBcPerTon = 1000; // BC per TON (admin configured)
      const bcPerCoin = rate * referenceBcPerTon;

      res.json({
        rateBcPerCoin: bcPerCoin,
        referenceCoin: conversionConfig.referenceCoin,
        referenceTon: conversionConfig.referenceTon,
        cooldownHours: conversionConfig.cooldownHours,
        eligible: true,
        walletCoin: Number(walletRow.coin),
      });
    }),
  );

  /**
   * POST /api/wallet/convert - Convert Coin to BC
   */
  router.post(
    '/wallet/convert',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const conversionEnabled = await isFeatureEnabled(db, 'CONVERSION');
      if (!conversionEnabled) throw new HttpError(403, 'conversion_disabled');

      const { coinAmount } = convertSchema.parse(req.body);

      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const wallet = await db.query(`SELECT coin, bc_available FROM wallets WHERE user_id = $1`, [userId]);
      const walletRow = wallet.rows[0] ?? { coin: 0, bc_available: 0 };

      if (Number(walletRow.coin) < coinAmount) {
        throw new HttpError(400, 'insufficient_coin');
      }

      const config = await db.query(`SELECT value FROM system_config WHERE key = 'economy.conversion'`);
      const conversionConfig = (config.rows[0]?.value as any) ?? {
        cooldownHours: CONVERSION.COOLDOWN_HOURS,
        referenceCoin: CONVERSION.REFERENCE_COIN,
        referenceTon: CONVERSION.REFERENCE_TON,
        enabled: true,
        emergencyGlobalCap: null,
        emergencyPerUserCap: null,
        soldOut: false,
      };

      if (!conversionConfig.enabled || conversionConfig.soldOut) {
        throw new HttpError(403, 'conversion_unavailable', 'Conversion temporarily unavailable');
      }

      if (state.conversionAvailableAt && new Date(state.conversionAvailableAt) > new Date()) {
        throw new HttpError(429, 'conversion_cooldown', 'Conversion on cooldown');
      }

      const rate = conversionConfig.referenceTon / conversionConfig.referenceCoin;
      const referenceBcPerTon = 1000; // Should come from config
      const bcPerCoin = rate * referenceBcPerTon;
      const bcAmount = Math.floor(coinAmount * bcPerCoin);

      if (bcAmount <= 0) {
        throw new HttpError(400, 'invalid_amount', 'Conversion results in zero BC');
      }

      const cooldownUntil = new Date(Date.now() + conversionConfig.cooldownHours * 60 * 60 * 1000);

      await db.transaction(async (tx) => {
        // Debit Coin
        await applyLedgerEntry(tx, {
          userId,
          asset: 'COIN',
          amount: -coinAmount,
          reason: 'CONVERSION_DEBIT',
          source: 'conversion',
          idempotencyKey: `conversion_debit:${userId}:${randomUUID()}`,
          metadata: { bcAmount, rate: bcPerCoin },
        });

        // Credit BC
        await applyLedgerEntry(tx, {
          userId,
          asset: 'BOOST_CASH',
          amount: bcAmount,
          bcState: 'AVAILABLE',
          reason: 'CONVERSION_CREDIT',
          source: 'conversion',
          idempotencyKey: `conversion_credit:${userId}:${randomUUID()}`,
          metadata: { coinAmount, rate: bcPerCoin },
        });

        // Record conversion
        await tx.query(
          `INSERT INTO conversions (user_id, coin_amount, bc_amount, rate_snapshot, idempotency_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, coinAmount, bcAmount, JSON.stringify({ rate: bcPerCoin, referenceBcPerTon }), `conversion:${userId}:${randomUUID()}`],
        );

        // Set cooldown
        await tx.query(
          `UPDATE player_state SET conversion_available_at = $1 WHERE user_id = $2`,
          [cooldownUntil.toISOString(), userId],
        );
      });

      res.json({
        success: true,
        coinAmount,
        bcAmount,
        cooldownUntil: cooldownUntil.toISOString(),
      });
    }),
  );

  /**
   * GET /api/wallet/withdrawal/eligibility - Check withdrawal eligibility
   */
  router.get(
    '/wallet/withdrawal/eligibility',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const withdrawalsEnabled = await isFeatureEnabled(db, 'WITHDRAWALS');
      if (!withdrawalsEnabled) throw new HttpError(403, 'withdrawals_disabled');

      const state = await loadPlayerGameState(db, userId);
      if (!state) throw new HttpError(404, 'player_not_found');

      const wallet = await db.query(`SELECT bc_available, payout_wallet_address FROM wallets WHERE user_id = $1`, [userId]);
      const walletRow = wallet.rows[0] ?? { bc_available: 0, payout_wallet_address: null };

      const user = await db.query(`SELECT created_at FROM users WHERE id = $1`, [userId]);
      const userRow = user.rows[0];
      const accountAgeDays = userRow ? Math.floor((Date.now() - new Date(userRow.created_at as string | number | Date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const referrals = await db.query(
        `SELECT COUNT(*)::int AS count FROM referrals WHERE referrer_id = $1 AND status = 'QUALIFIED'`,
        [userId],
      );
      const qualifiedReferrals = Number(referrals.rows[0]?.count ?? 0);

      const streak = await db.query(`SELECT current_streak FROM streaks WHERE user_id = $1`, [userId]);
      const currentStreak = Number(streak.rows[0]?.current_streak ?? 0);

      const openWithdrawal = await db.query(
        `SELECT 1 FROM withdrawals WHERE user_id = $1 AND status IN ('REQUESTED', 'APPROVED')`,
        [userId],
      );

      const todayWithdrawals = await db.query(
        `SELECT COUNT(*)::int AS count FROM withdrawals
         WHERE user_id = $1 AND requested_at >= CURRENT_DATE AND status IN ('REQUESTED', 'APPROVED', 'PAID')`,
        [userId],
      );

      const optionsMet = [
        state.level >= WITHDRAWAL.OPTIONS.LEVEL_MIN,
        currentStreak >= WITHDRAWAL.OPTIONS.STREAK_MIN,
        qualifiedReferrals >= WITHDRAWAL.OPTIONS.REFERRALS_MIN,
        accountAgeDays >= WITHDRAWAL.OPTIONS.ACCOUNT_AGE_DAYS_MIN,
      ].filter(Boolean).length;

      const eligible = state.verifiedAdsCount >= WITHDRAWAL.VERIFIED_ADS_MIN && optionsMet >= WITHDRAWAL.REQUIRED_OPTIONS;
      const reasons: string[] = [];
      if (state.verifiedAdsCount < WITHDRAWAL.VERIFIED_ADS_MIN) {
        reasons.push(`Need ${WITHDRAWAL.VERIFIED_ADS_MIN} verified ads (have ${state.verifiedAdsCount})`);
      }
      if (optionsMet < WITHDRAWAL.REQUIRED_OPTIONS) {
        reasons.push(`Need ${WITHDRAWAL.REQUIRED_OPTIONS} of: Level≥${WITHDRAWAL.OPTIONS.LEVEL_MIN}, Streak≥${WITHDRAWAL.OPTIONS.STREAK_MIN}, Referrals≥${WITHDRAWAL.OPTIONS.REFERRALS_MIN}, Age≥${WITHDRAWAL.OPTIONS.ACCOUNT_AGE_DAYS_MIN} days`);
      }
      if (openWithdrawal.rows.length > 0) {
        reasons.push('Existing withdrawal pending');
      }
      if (Number(todayWithdrawals.rows[0]?.count ?? 0) >= WITHDRAWAL.MAX_PER_DAY) {
        reasons.push(`Max ${WITHDRAWAL.MAX_PER_DAY} withdrawals per day reached`);
      }

      res.json({
        eligible,
        reasons,
        verifiedAdsCount: state.verifiedAdsCount,
        requiredVerifiedAds: WITHDRAWAL.VERIFIED_ADS_MIN,
        optionsMet,
        requiredOptions: WITHDRAWAL.REQUIRED_OPTIONS,
        optionDetails: {
          level: { met: state.level >= WITHDRAWAL.OPTIONS.LEVEL_MIN, current: state.level, required: WITHDRAWAL.OPTIONS.LEVEL_MIN },
          streak: { met: currentStreak >= WITHDRAWAL.OPTIONS.STREAK_MIN, current: currentStreak, required: WITHDRAWAL.OPTIONS.STREAK_MIN },
          referrals: { met: qualifiedReferrals >= WITHDRAWAL.OPTIONS.REFERRALS_MIN, current: qualifiedReferrals, required: WITHDRAWAL.OPTIONS.REFERRALS_MIN },
          accountAge: { met: accountAgeDays >= WITHDRAWAL.OPTIONS.ACCOUNT_AGE_DAYS_MIN, current: accountAgeDays, required: WITHDRAWAL.OPTIONS.ACCOUNT_AGE_DAYS_MIN },
        },
        walletBcAvailable: Number(walletRow.bc_available),
        minTon: WITHDRAWAL.MIN_TON,
        maxPerDay: WITHDRAWAL.MAX_PER_DAY,
        payoutWalletAddress: walletRow.payout_wallet_address,
      });
    }),
  );

  /**
   * POST /api/wallet/withdrawal - Request withdrawal
   */
  router.post(
    '/wallet/withdrawal',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const withdrawalsEnabled = await isFeatureEnabled(db, 'WITHDRAWALS');
      if (!withdrawalsEnabled) throw new HttpError(403, 'withdrawals_disabled');

      const { amountBc, walletAddress } = withdrawalSchema.parse(req.body);

      const state = await loadPlayerGameState(db, userId, true);
      if (!state) throw new HttpError(404, 'player_not_found');

      const wallet = await db.query(`SELECT bc_available FROM wallets WHERE user_id = $1`, [userId]);
      const walletRow = wallet.rows[0] ?? { bc_available: 0 };

      if (Number(walletRow.bc_available) < amountBc) {
        throw new HttpError(400, 'insufficient_bc');
      }

      const user = await db.query(`SELECT created_at FROM users WHERE id = $1`, [userId]);
      const userRow = user.rows[0];
      const accountAgeDays = userRow ? Math.floor((Date.now() - new Date(userRow.created_at as string | number | Date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const referrals = await db.query(
        `SELECT COUNT(*)::int AS count FROM referrals WHERE referrer_id = $1 AND status = 'QUALIFIED'`,
        [userId],
      );
      const qualifiedReferrals = Number(referrals.rows[0]?.count ?? 0);

      const streak = await db.query(`SELECT current_streak FROM streaks WHERE user_id = $1`, [userId]);
      const currentStreak = Number(streak.rows[0]?.current_streak ?? 0);

      const openWithdrawal = await db.query(
        `SELECT 1 FROM withdrawals WHERE user_id = $1 AND status IN ('REQUESTED', 'APPROVED')`,
        [userId],
      );
      if (openWithdrawal.rows.length > 0) {
        throw new HttpError(400, 'existing_withdrawal', 'Existing withdrawal pending');
      }

      const todayWithdrawals = await db.query(
        `SELECT COUNT(*)::int AS count FROM withdrawals
         WHERE user_id = $1 AND requested_at >= CURRENT_DATE AND status IN ('REQUESTED', 'APPROVED', 'PAID')`,
        [userId],
      );
      if (Number(todayWithdrawals.rows[0]?.count ?? 0) >= WITHDRAWAL.MAX_PER_DAY) {
        throw new HttpError(400, 'daily_limit', `Max ${WITHDRAWAL.MAX_PER_DAY} withdrawals per day`);
      }

      const optionsMet = [
        state.level >= WITHDRAWAL.OPTIONS.LEVEL_MIN,
        currentStreak >= WITHDRAWAL.OPTIONS.STREAK_MIN,
        qualifiedReferrals >= WITHDRAWAL.OPTIONS.REFERRALS_MIN,
        accountAgeDays >= WITHDRAWAL.OPTIONS.ACCOUNT_AGE_DAYS_MIN,
      ].filter(Boolean).length;

      if (state.verifiedAdsCount < WITHDRAWAL.VERIFIED_ADS_MIN || optionsMet < WITHDRAWAL.REQUIRED_OPTIONS) {
        throw new HttpError(403, 'not_eligible', 'Withdrawal requirements not met');
      }

      const config = await db.query(`SELECT value FROM system_config WHERE key = 'economy.withdrawal'`);
      const withdrawalConfig = (config.rows[0]?.value as any) ?? {
        minTon: WITHDRAWAL.MIN_TON,
        fixedFeeTon: 0,
        maxPerDay: WITHDRAWAL.MAX_PER_DAY,
      };

      const bcToTonRate = 0.001 / 1000; // Should come from config: TON per BC
      const tonAmount = amountBc * bcToTonRate;
      const feeTon = withdrawalConfig.fixedFeeTon;
      const netTon = tonAmount - feeTon;

      if (netTon < withdrawalConfig.minTon) {
        throw new HttpError(400, 'below_minimum', `Minimum withdrawal is ${withdrawalConfig.minTon} TON`);
      }

      await db.transaction(async (tx) => {
        // Lock BC
        await applyLedgerEntry(tx, {
          userId,
          asset: 'BOOST_CASH',
          amount: -amountBc,
          bcState: 'LOCKED',
          reason: 'WITHDRAWAL_LOCK',
          source: 'withdrawal',
          idempotencyKey: `withdrawal_lock:${userId}:${randomUUID()}`,
          metadata: { amountBc, walletAddress },
        });

        await tx.query(
          `INSERT INTO withdrawals (user_id, amount_bc, rate_snapshot, fee_ton, ton_amount, net_ton, wallet_address, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED')`,
          [userId, amountBc, JSON.stringify({ bcToTonRate }), feeTon, tonAmount, netTon, walletAddress],
        );
      });

      res.json({
        success: true,
        amountBc,
        tonAmount,
        feeTon,
        netTon,
        walletAddress,
        status: 'REQUESTED',
      });
    }),
  );

  /**
   * GET /api/wallet/withdrawals - List user withdrawals
   */
  router.get(
    '/wallet/withdrawals',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const withdrawals = await db.query(
        `SELECT id, amount_bc, fee_ton, ton_amount, net_ton, wallet_address, status, reject_reason, tx_reference, requested_at, decided_at, paid_at
         FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 50`,
        [userId],
      );

      res.json({ withdrawals: withdrawals.rows });
    }),
  );

  /**
   * POST /api/wallet/save-wallet - Save payout wallet address
   */
  router.post(
    '/wallet/save-wallet',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const schema = z.object({ address: z.string().min(1).max(100) });
      const { address } = schema.parse(req.body);

      await db.query(
        `UPDATE wallets SET payout_wallet_address = $1, payout_wallet_updated_at = now() WHERE user_id = $2`,
        [address, userId],
      );

      res.json({ success: true, address });
    }),
  );

  return router;
}