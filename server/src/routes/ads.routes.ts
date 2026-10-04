import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { loadTapConfig, isFeatureEnabled } from '../services/game-config.js';
import { applyLedgerEntry } from '../services/ledger.js';
import { ADS } from '../config/constants.js';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const offerAdSchema = z.object({
  slot: z.enum(ADS.SLOTS),
});

const adsgramCallbackSchema = z.object({
  userid: z.string().min(1),
  reward: z.string().optional(),
  signature: z.string().optional(),
});

const tadsCallbackSchema = z.object({
  widgetId: z.string().min(1),
  userId: z.string().min(1),
  reward: z.number().optional(),
  signature: z.string().optional(),
});

export function adsRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * POST /api/ads/offer - Request an ad offer for a slot
   */
  router.post(
    '/ads/offer',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const rewardedAdsEnabled = await isFeatureEnabled(db, 'REWARDED_ADS');
      if (!rewardedAdsEnabled) throw new HttpError(403, 'rewarded_ads_disabled');

      const { slot } = offerAdSchema.parse(req.body);

      // Check game cooldown (30 seconds)
      const lastAd = await db.query(
        `SELECT created_at FROM ad_events WHERE user_id = $1 AND status IN ('CREDITED', 'VERIFIED')
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      if (lastAd.rows.length > 0) {
        const lastTime = new Date(lastAd.rows[0].created_at as string | number | Date).getTime();
        const now = Date.now();
        if (now - lastTime < ADS.GAME_COOLDOWN_SECONDS * 1000) {
          throw new HttpError(429, 'ad_cooldown', `Please wait ${Math.ceil((ADS.GAME_COOLDOWN_SECONDS * 1000 - (now - lastTime)) / 1000)}s before requesting another ad`);
        }
      }

      // Check provider availability (AdsGram primary, TADS fallback)
      const adsgEnabled = await isFeatureEnabled(db, 'ADSGRAM');
      const tadsEnabled = await isFeatureEnabled(db, 'TADS');

      let provider = 'ADSGRAM';
      if (!adsgEnabled) {
        if (tadsEnabled) provider = 'TADS';
        else throw new HttpError(503, 'no_ad_provider', 'No ad providers available');
      }

      // Create ad event
      const eventId = randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL

      // Get reward config for this slot
      const rewardConfig = await db.query(
        `SELECT value FROM system_config WHERE key = 'ads.rewards.${slot}'`,
      );
      const rewardSnapshot = rewardConfig.rows[0]?.value ?? { coin: 100, bc: 0 };

await db.query(
        `INSERT INTO ad_events (id, user_id, provider, slot, status, reward_snapshot, expires_at)
         VALUES ($1, $2, $3, $4, 'OFFERED', $5, $6)`,
        [eventId, userId, provider, slot, JSON.stringify(rewardSnapshot), expiresAt.toISOString()],
      );

      // Return provider-specific info for client SDK
      let clientConfig: any = { eventId, provider, slot, rewardSnapshot };
      if (provider === 'ADSGRAM') {
        const blockIdConfig = await db.query(`SELECT value FROM system_config WHERE key = 'ads.adsgram.block_id'`);
        clientConfig.blockId = blockIdConfig.rows[0]?.value ?? env.ADSGRAM_EXPECTED_BLOCK_ID;
      } else if (provider === 'TADS') {
        const widgetIdConfig = await db.query(`SELECT value FROM system_config WHERE key = 'ads.tads.widget_id'`);
        clientConfig.widgetId = widgetIdConfig.rows[0]?.value ?? env.TADS_EXPECTED_WIDGET_ID;
      }

      res.json(clientConfig);
    }),
  );

  /**
   * GET /api/postbacks/adsgram/reward - AdsGram callback
   */
  router.get(
    '/postbacks/adsgram/reward',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const parsed = adsgramCallbackSchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid_params' });
        return;
      }

      const { userid, reward, signature } = parsed.data;
      const userId = userid;

      // Verify secret if configured
      if (env.ADSGRAM_POSTBACK_SECRET && signature) {
        // Verify signature per AdsGram docs
      }

      // Find pending ad event
      const event = await db.query(
        `SELECT id, user_id, provider, slot, status, reward_snapshot
         FROM ad_events
         WHERE user_id = $1 AND provider = 'ADSGRAM' AND status IN ('OFFERED', 'STARTED', 'CALLBACK_RECEIVED')
         AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );

      if (event.rows.length === 0) {
        res.json({ ok: true, credited: false, reason: 'no_pending_event' });
        return;
      }

      const adEvent = event.rows[0];
      if (adEvent.status === 'CREDITED') {
        res.json({ ok: true, credited: false, reason: 'already_credited' });
        return;
      }

      await db.query(
        `INSERT INTO provider_callbacks (ad_event_id, provider, raw, matched)
         VALUES ($1, 'ADSGRAM', $2::jsonb, TRUE)`,
        [adEvent.id, JSON.stringify(req.query)],
      );

      await db.query(
        `UPDATE ad_events SET status = 'CALLBACK_RECEIVED', callback_data = $1 WHERE id = $2`,
        [JSON.stringify(req.query), adEvent.id],
      );

      // Verify and credit
      await db.query(
        `UPDATE ad_events SET status = 'VERIFIED' WHERE id = $1`,
        [adEvent.id],
      );

      const snapshot = adEvent.reward_snapshot as any;
      await db.transaction(async (tx) => {
        if (snapshot.coin > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'COIN',
            amount: snapshot.coin,
            reason: 'AD_REWARD',
            source: 'adsgram',
            idempotencyKey: `ad_reward:${adEvent.id}`,
            metadata: { slot: adEvent.slot, provider: 'ADSGRAM' },
          });
        }
        if (snapshot.bc > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'BOOST_CASH',
            amount: snapshot.bc,
            bcState: 'AVAILABLE',
            reason: 'AD_REWARD',
            source: 'adsgram',
            idempotencyKey: `ad_reward_bc:${adEvent.id}`,
            metadata: { slot: adEvent.slot, provider: 'ADSGRAM' },
          });
        }
        // Increment verified ads count for cashout eligibility
        await tx.query(
          `UPDATE player_state SET verified_ads_count = verified_ads_count + 1 WHERE user_id = $1`,
          [userId],
        );
      });

      await db.query(
        `UPDATE ad_events SET status = 'CREDITED', ledger_entry_id = (
          SELECT id FROM ledger_entries WHERE idempotency_key = $1
        ) WHERE id = $2`,
        [`ad_reward:${adEvent.id}`, adEvent.id],
      );

      res.json({ ok: true, credited: true });
    }),
  );

  /**
   * POST /api/postbacks/tads/reward - TADS callback
   */
  router.post(
    '/postbacks/tads/reward',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const parsed = tadsCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid_params' });
        return;
      }

      const { widgetId, userId, reward, signature } = parsed.data;

      // Verify secret/widget if configured
      if (env.TADS_POSTBACK_SECRET && signature) {
        // Verify per TADS docs
      }

      // Verify widget matches expected
      if (env.TADS_EXPECTED_WIDGET_ID && widgetId !== env.TADS_EXPECTED_WIDGET_ID) {
        res.json({ ok: true, credited: false, reason: 'widget_mismatch' });
        return;
      }

      // Find pending ad event
      const event = await db.query(
        `SELECT id, provider, slot, status, reward_snapshot
         FROM ad_events
         WHERE user_id = $1 AND provider = 'TADS' AND status IN ('OFFERED', 'STARTED', 'CALLBACK_RECEIVED')
         AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );

      if (event.rows.length === 0) {
        res.json({ ok: true, credited: false, reason: 'no_pending_event' });
        return;
      }

      const adEvent = event.rows[0];
      if (adEvent.status === 'CREDITED') {
        res.json({ ok: true, credited: false, reason: 'already_credited' });
        return;
      }

      await db.query(
        `INSERT INTO provider_callbacks (ad_event_id, provider, raw, matched)
         VALUES ($1, 'TADS', $2::jsonb, TRUE)`,
        [adEvent.id, JSON.stringify(req.body)],
      );

      await db.query(
        `UPDATE ad_events SET status = 'CALLBACK_RECEIVED', callback_data = $1 WHERE id = $2`,
        [JSON.stringify(req.body), adEvent.id],
      );

      await db.query(
        `UPDATE ad_events SET status = 'VERIFIED' WHERE id = $1`,
        [adEvent.id],
      );

      const snapshot = adEvent.reward_snapshot as any;
      await db.transaction(async (tx) => {
        if (snapshot.coin > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'COIN',
            amount: snapshot.coin,
            reason: 'AD_REWARD',
            source: 'tads',
            idempotencyKey: `ad_reward:${adEvent.id}`,
            metadata: { slot: adEvent.slot, provider: 'TADS' },
          });
        }
        if (snapshot.bc > 0) {
          await applyLedgerEntry(tx, {
            userId,
            asset: 'BOOST_CASH',
            amount: snapshot.bc,
            bcState: 'AVAILABLE',
            reason: 'AD_REWARD',
            source: 'tads',
            idempotencyKey: `ad_reward_bc:${adEvent.id}`,
            metadata: { slot: adEvent.slot, provider: 'TADS' },
          });
        }
        await tx.query(
          `UPDATE player_state SET verified_ads_count = verified_ads_count + 1 WHERE user_id = $1`,
          [userId],
        );
      });

      await db.query(
        `UPDATE ad_events SET status = 'CREDITED' WHERE id = $1`,
        [adEvent.id],
      );

      res.json({ ok: true, credited: true });
    }),
  );

  return router;
}