import type { Db } from '../db/types.js';

export interface SessionRow {
  session_id: string;
  user_id: string;
  telegram_id: string;
  is_banned: boolean;
}

export interface AuthContext {
  userId: string;
  telegramId: string;
}

export async function createSession(
  db: Db,
  params: { userId: string; tokenHash: string; expiresAt: Date; ipHash?: string | null; uaHash?: string | null },
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO sessions (user_id, token_hash, ip_hash, ua_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      params.userId,
      params.tokenHash,
      params.ipHash ?? null,
      params.uaHash ?? null,
      params.expiresAt.toISOString(),
    ],
  );
  return res.rows[0]!.id;
}

/** Resolves a raw session token to its owner. Returns null when invalid/expired/revoked. */
export async function resolveSession(db: Db, tokenHash: string): Promise<SessionRow | null> {
  const res = await db.query<SessionRow>(
    `SELECT s.id AS session_id, u.id AS user_id, u.telegram_id, u.is_banned
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [tokenHash],
  );
  return res.rows[0] ?? null;
}

export async function touchSession(db: Db, sessionId: string): Promise<void> {
  await db.query(`UPDATE sessions SET last_seen_at = now() WHERE id = $1`, [sessionId]);
}
