import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema (spec 04 section 4 - main service).
 *
 * Secrets are optional at parse time so the service can boot in development and
 * report readiness through /api/health. `missingProductionSecrets()` surfaces the
 * ones that must be present before a real launch (spec 04 section 9).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(10000),

  // URLs: public runtime configuration
  APP_URL: z.string().default('https://boostgame.onrender.com'),
  API_BASE_URL: z.string().default('https://boostgame.onrender.com/api'),
  ADMIN_URL: z.string().default('https://boostgame.onrender.com/panel/admin'),
  GAME_ORIGIN: z.string().default('https://boostgame.onrender.com'),
  DAILY_GATE_URL: z.string().default('https://dailyck.onrender.com'),

  // Database - SECRET
  DATABASE_URL: z.string().min(1).optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_BOT_USERNAME: z.string().default('boostforearnbot'),
  TELEGRAM_OWNER_ID: z.string().optional(),
  TELEGRAM_OWNER_CHAT_ID: z.string().optional(),

  // Cryptography - SECRET
  SESSION_SECRET: z.string().min(1).optional(),
  TASK_TOKEN_SECRET: z.string().min(1).optional(),
  CODE_HASH_PEPPER: z.string().min(1).optional(),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  ADMIN_TELEGRAM_2FA_SECRET: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(1).optional(),

  // Main <-> Daily Gate internal auth - SECRET
  DAILY_GATE_SHARED_SECRET: z.string().min(1).optional(),

  // Linkvertise
  LINKVERTISE_TARGET_URL_A: z.string().optional(),
  LINKVERTISE_TARGET_URL_B: z.string().optional(),
  LINKVERTISE_ANTI_BYPASS_TOKEN: z.string().min(1).optional(),
  LINKVERTISE_VERIFY_URL: z.string().optional(),
  LINKVERTISE_CALLBACK_SECRET: z.string().min(1).optional(),

  // AdsGram
  ADSGRAM_POSTBACK_SECRET: z.string().min(1).optional(),
  ADSGRAM_EXPECTED_BLOCK_ID: z.string().optional(),

  // TADS
  TADS_POSTBACK_SECRET: z.string().min(1).optional(),
  TADS_EXPECTED_WIDGET_ID: z.string().optional(),

  // Optional
  VPN_DETECTION_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = load();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * Secrets that must be configured for a real launch (spec 04 sections 4 & 9).
 * Returns the list of names that are still missing.
 */
export function missingProductionSecrets(): string[] {
  const required: Array<keyof Env> = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'SESSION_SECRET',
    'TASK_TOKEN_SECRET',
    'CODE_HASH_PEPPER',
    'WEBHOOK_SECRET',
    'ADMIN_TELEGRAM_2FA_SECRET',
    'ENCRYPTION_KEY',
    'DAILY_GATE_SHARED_SECRET',
    'LINKVERTISE_ANTI_BYPASS_TOKEN',
    'LINKVERTISE_CALLBACK_SECRET',
    'TADS_POSTBACK_SECRET',
  ];
  return required.filter((key) => !env[key]);
}
