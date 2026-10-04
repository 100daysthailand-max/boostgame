import type { RequestHandler } from 'express';
import type { Db } from '../../db/types.js';
import { hashSessionToken } from '../../services/session.js';
import { resolveSession } from '../../repositories/sessions.js';
import { HttpError } from './error-handler.js';
import { env } from '../../config/env.js';

export function requireAdminAuth(db: Db | null): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!db) throw new HttpError(503, 'database_unavailable');
      const header = req.header('authorization') ?? '';
      const match = /^Bearer\s+(.+)$/i.exec(header.trim());
      if (!match) throw new HttpError(401, 'unauthorized');

      const row = await resolveSession(db, hashSessionToken(match[1]!));
      if (!row) throw new HttpError(401, 'unauthorized');
      if (row.is_banned) throw new HttpError(403, 'banned');

      // Check if owner
      const ownerIds = env.TELEGRAM_OWNER_ID?.split(',').map(s => s.trim()) ?? [];
      const isOwner = ownerIds.includes(String(row.telegram_id));

      if (!isOwner) throw new HttpError(403, 'admin_required');

      req.auth = { userId: row.user_id, telegramId: String(row.telegram_id), isOwner: true };
      req.sessionId = row.session_id;
      next();
    } catch (err) {
      next(err);
    }
  };
}