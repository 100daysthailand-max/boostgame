import type { RequestHandler } from 'express';
import type { Db } from '../../db/types.js';
import { hashSessionToken } from '../../services/session.js';
import { resolveSession, touchSession } from '../../repositories/sessions.js';
import { HttpError } from './error-handler.js';

/**
 * Bearer-token authentication. Telegram identity is never trusted from the client;
 * the session token was issued only after server-side initData validation.
 */
export interface AuthContext {
  userId: string;
  telegramId: string;
  isOwner?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      sessionId?: string;
    }
  }
}

export function requireAuth(db: Db | null): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!db) throw new HttpError(503, 'database_unavailable');
      const header = req.header('authorization') ?? '';
      const match = /^Bearer\s+(.+)$/i.exec(header.trim());
      if (!match) throw new HttpError(401, 'unauthorized');

      const row = await resolveSession(db, hashSessionToken(match[1]!));
      if (!row) throw new HttpError(401, 'unauthorized');
      if (row.is_banned) throw new HttpError(403, 'banned');

      req.auth = { userId: row.user_id, telegramId: String(row.telegram_id) };
      req.sessionId = row.session_id;
      void touchSession(db, row.session_id).catch(() => undefined);
      next();
    } catch (err) {
      next(err);
    }
  };
}
