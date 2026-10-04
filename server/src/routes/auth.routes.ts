import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { validateInitData } from '../services/telegram.js';
import { provisionPlayer, upsertUserFromTelegram } from '../repositories/player.js';
import { createSession } from '../repositories/sessions.js';
import { generateSessionToken, hashSessionToken, sessionExpiry } from '../services/session.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';

const bodySchema = z.object({ initData: z.string().min(1) });

/**
 * POST /api/auth/telegram (spec 02 section 3)
 * Validates raw initData with the bot token and auth-date freshness, then
 * creates/updates the user + session. A plain Telegram ID is never authentication.
 */
export function authRouter(db: Db | null, botToken: string | undefined): Router {
  const router = Router();

  router.post(
    '/auth/telegram',
    asyncHandler(async (req, res) => {
      if (!db) throw new HttpError(503, 'database_unavailable');

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'invalid_body');

      const result = validateInitData(parsed.data.initData, botToken ?? '');
      if (!result.ok) throw new HttpError(401, 'invalid_init_data');

      const user = await db.transaction(async (tx) => {
        const row = await upsertUserFromTelegram(tx, result.user);
        await provisionPlayer(tx, row.id);
        return row;
      });

      if (user.is_banned) throw new HttpError(403, 'banned');

      const token = generateSessionToken();
      const expiresAt = sessionExpiry();
      await createSession(db, {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt,
      });

      res.json({
        token,
        expiresAt: expiresAt.toISOString(),
        user: { telegramId: String(user.telegram_id) },
      });
    }),
  );

  return router;
}
