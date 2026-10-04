import { randomBytes, createHash } from 'node:crypto';

/**
 * Opaque session tokens. The raw token is returned to the client once; only its
 * SHA-256 hash is stored (spec 04 section 6: one-time runtime tokens are
 * server-generated with TTL and stored as a hash).
 */
export const SESSION_TTL_DAYS = 30;

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
