import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Server-side Telegram Web App `initData` validation (spec 02 section 3:
 * "Raw Telegram initData is validated server-side"; plain Telegram ID is never
 * authentication).
 *
 * Algorithm (https://core.telegram.org/bots/webapps):
 *   secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
 *   hash       = HMAC_SHA256(key=secret_key, data=data_check_string)
 * where data_check_string is every field except `hash`, "key=value", newline
 * separated, sorted alphabetically.
 */
export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: number; startParam?: string }
  | { ok: false; reason: string };

export interface ValidateOptions {
  /** Maximum accepted age of `auth_date` in seconds. Default 24h. */
  maxAgeSeconds?: number;
  now?: Date;
}

export const DEFAULT_INITDATA_MAX_AGE_SECONDS = 24 * 60 * 60;

export function validateInitData(
  rawInitData: string,
  botToken: string,
  options: ValidateOptions = {},
): InitDataResult {
  if (!rawInitData) return { ok: false, reason: 'missing_init_data' };
  if (!botToken) return { ok: false, reason: 'server_bot_token_missing' };

  const params = new URLSearchParams(rawInitData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'missing_hash' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const provided = Buffer.from(hash, 'hex');
  const expected = Buffer.from(computed, 'hex');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'bad_hash' };
  }

  const authDate = Number(params.get('auth_date') ?? '0');
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: 'missing_auth_date' };
  }

  const maxAge = options.maxAgeSeconds ?? DEFAULT_INITDATA_MAX_AGE_SECONDS;
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (nowSeconds - authDate > maxAge) {
    return { ok: false, reason: 'expired_auth_date' };
  }

  const userJson = params.get('user');
  if (!userJson) return { ok: false, reason: 'missing_user' };

  let user: TelegramUser;
  try {
    user = JSON.parse(userJson) as TelegramUser;
  } catch {
    return { ok: false, reason: 'bad_user_json' };
  }
  if (!user || typeof user.id !== 'number') {
    return { ok: false, reason: 'bad_user' };
  }

  const startParam = params.get('start_param') ?? undefined;
  return { ok: true, user, authDate, startParam };
}

/** Builds the data_check_string + hash for a payload. Used by tests and internal tooling. */
export function signInitData(
  fields: Record<string, string>,
  botToken: string,
): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}
