/**
 * Binding constants derived from the Boost Game specifications
 * (boost-game-01 player experience, 02 backend/economy, 03 admin, 04 env).
 *
 * These are the launch reference values. Runtime economy values live in
 * PostgreSQL (system_config / feature_flags) and are edited via the admin panel.
 */

export const URL_TOPOLOGY = {
  MAIN: 'https://boostgame.onrender.com',
  MAIN_API: 'https://boostgame.onrender.com/api',
  ADMIN: 'https://boostgame.onrender.com/panel/admin',
  DAILY_GATE: 'https://dailyck.onrender.com',
  ADSGRAM_POSTBACK: 'https://boostgame.onrender.com/api/postbacks/adsgram/reward',
  TADS_POSTBACK: 'https://boostgame.onrender.com/api/postbacks/tads/reward',
} as const;

/** spec 01 section 3 - binding tap and Energy rules */
export const TAP = {
  START_ENERGY: 100,
  ENERGY_REGEN_SECONDS: 5,
  ENERGY_COST_PER_TAP: 1,
  MAX_TAPS_PER_SECOND: 1,
  BASE_COIN_PER_TAP: 1,
  ENERGY_CAP_L1_CEILING: 1000,
  COMBO_EVERY_TAPS: 5,
  COMBO_MULTIPLIERS: [2, 3, 5] as const,
  COMBO_TIMEOUT_SECONDS: 10,
} as const;

/** spec 01 section 4 / spec 02 section 6 */
export const PROGRESSION = {
  LEVEL_MIN: 1,
  LEVEL_MAX: 99,
  TIER_UNLOCK_EVERY_LEVELS: 3,
  UPGRADE_MAX_LEVEL_PER_TIER: 10,
} as const;

export const UPGRADE_CATEGORIES = [
  'POWER_TAP',
  'ENERGY_CAP',
  'ENERGY_REGEN',
  'AUTO_MINER',
  'CRITICAL_CHANCE',
  'OFFLINE_CAPACITY',
] as const;
export type UpgradeCategory = (typeof UPGRADE_CATEGORIES)[number];

/** spec 01 section 5 */
export const BOOST_TYPES = [
  'COIN_2X',
  'PRODUCTION_3X',
  'ENERGY_REFILL',
  'MINER_SPEED',
  'CRITICAL_RATE',
  'DOUBLE_OFFLINE',
] as const;
export type BoostType = (typeof BOOST_TYPES)[number];

export const BOOST = {
  DEFAULT_SECONDS: 600,
} as const;

export const MINER = {
  L1_COIN_PER_MINUTE: 20,
  OFFLINE_CAP_MAX_HOURS: 10,
  STANDARD_KEY_HOURS: [2, 3] as const,
  CUSTOM_KEY_MIN_MINUTES: 30,
  CUSTOM_KEY_MAX_HOURS: 10,
} as const;

/** spec 01 section 8 / spec 02 section 9 / spec 04 section 7 */
export const ADS = {
  PRIMARY: 'ADSGRAM',
  FALLBACK: 'TADS',
  PROVIDERS: ['ADSGRAM', 'TADS'] as const,
  GAME_COOLDOWN_SECONDS: 30,
  LIFETIME_VERIFIED_FOR_CASHOUT: 20,
  SLOTS: [
    'DOUBLE_COIN',
    'DOUBLE_QUEST',
    'ENERGY_REFILL',
    'BOOST',
    'DOUBLE_OFFLINE',
    'BC_REWARD',
    'MINER_KEY',
  ] as const,
} as const;
export type AdProvider = (typeof ADS.PROVIDERS)[number];
export type AdSlot = (typeof ADS.SLOTS)[number];

export const AD_EVENT_STATES = [
  'OFFERED',
  'STARTED',
  'CALLBACK_RECEIVED',
  'VERIFIED',
  'CREDITED',
  'FAILED',
  'EXPIRED',
  'REJECTED',
] as const;
export type AdEventState = (typeof AD_EVENT_STATES)[number];

/** spec 01 section 7 / spec 02 section 8 */
export const DAILY_GATE = {
  TTL_MINUTES: 10,
  RESET_HOUR_UTC: 0,
  REMINDER_HOUR_UTC: 6,
  MILESTONES: [3, 7, 14, 30] as const,
  NEW_DAY_SWITCH_PER_DAY: 1,
  NEW_DAY_SWITCH_PER_MONTH: 30,
  /** fallback reward must be at least 50% lower than normal */
  FALLBACK_MAX_RATIO: 0.5,
} as const;

export const DAILY_GATE_TASK_STATES = [
  'CREATED',
  'OPENED',
  'REDIRECTED',
  'VERIFYING',
  'CODE_ISSUED',
  'COMPLETED',
  'EXPIRED',
  'REJECTED',
  'CANCELLED',
] as const;
export type DailyGateTaskState = (typeof DAILY_GATE_TASK_STATES)[number];

/** spec 01 section 10 / spec 02 section 10 */
export const CONVERSION = {
  COOLDOWN_HOURS: 6,
  /** reference policy: 1,000,000 Coin = BC equivalent of 0.001 TON */
  REFERENCE_COIN: 1_000_000,
  REFERENCE_TON: 0.001,
} as const;

export const WITHDRAWAL = {
  MIN_TON: 0.01,
  MAX_PER_DAY: 3,
  VERIFIED_ADS_MIN: 20,
  REQUIRED_OPTIONS: 2,
  OPTIONS: {
    LEVEL_MIN: 3,
    STREAK_MIN: 3,
    REFERRALS_MIN: 2,
    ACCOUNT_AGE_DAYS_MIN: 3,
  },
  STATES: ['REQUESTED', 'APPROVED', 'PAID', 'REJECTED'] as const,
} as const;
export type WithdrawalState = (typeof WITHDRAWAL.STATES)[number];

export const NOTIFICATIONS = {
  MAX_PER_DAY: 5,
} as const;

export const REFERRAL = {
  REVIEW_DELAY_HOURS: 24,
} as const;

export const SEASON = {
  DURATION_DAYS: 30,
  ECONOMY_SUPPLY_COIN: 10_000_000_000,
  BOARDS: ['COIN', 'XP', 'QUEST'] as const,
} as const;
export type SeasonBoard = (typeof SEASON.BOARDS)[number];

/** spec 02 section 1 & 4 */
export const ASSETS = ['COIN', 'BOOST_CASH', 'GEM'] as const;
export type Asset = (typeof ASSETS)[number];

/** Boost Cash internal states (spec 02 section 4). */
export const BC_STATES = ['AVAILABLE', 'LOCKED', 'WITHHELD'] as const;
export type BcState = (typeof BC_STATES)[number];

/** spec 02 section 4 - required ledger reasons */
export const LEDGER_REASONS = [
  'TAP',
  'COMBO',
  'CRITICAL',
  'UPGRADE_PURCHASE',
  'BOOST_ACTIVATION',
  'MINER_KEY_PURCHASE',
  'SKIN_PURCHASE',
  'MINER_EARNING',
  'QUEST_CLAIM',
  'DAILY_GATE_REWARD',
  'DAILY_GATE_FALLBACK',
  'AD_REWARD',
  'STREAK_MILESTONE',
  'REFERRAL_REWARD',
  'WEEKLY_REWARD',
  'SEASON_REWARD',
  'CONVERSION_DEBIT',
  'CONVERSION_CREDIT',
  'WITHDRAWAL_LOCK',
  'WITHDRAWAL_PAID',
  'WITHDRAWAL_REJECT_FORFEIT',
  'WITHDRAWAL_RESTORE',
  'ADMIN_ADJUSTMENT',
] as const;
export type LedgerReason = (typeof LEDGER_REASONS)[number];

/** spec 03 section 9 / spec 04 section 8 - required feature flags */
export const FEATURE_FLAGS = [
  'MAINTENANCE',
  'REGISTRATIONS',
  'TAP_REWARDS',
  'CONVERSION',
  'WITHDRAWALS',
  'DAILY_GATE',
  'DAILY_GATE_FALLBACK',
  'NEW_DAY_SWITCH',
  'ADSGRAM',
  'TADS',
  'REWARDED_ADS',
  'REFERRAL',
  'WEEKLY_REWARD',
  'SEASON_REWARD',
  'GEM_TON_PURCHASE',
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];
