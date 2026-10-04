-- Boost Game - initial schema (spec 02 section 4: data model and ledger)
-- PostgreSQL (Neon). All monetary/asset amounts are signed integers; Energy is
-- numeric because regeneration is time-based and fractional.

-- ===========================================================================
-- Identity
-- ===========================================================================

CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  telegram_id     BIGINT NOT NULL UNIQUE,
  username        TEXT,
  first_name      TEXT,
  last_name       TEXT,
  language_code   TEXT,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side sessions created after Telegram initData validation.
CREATE TABLE sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  ip_hash       TEXT,
  ua_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- Three required community checks (spec 01 section 2).
CREATE TABLE memberships (
  user_id          BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  main_channel     BOOLEAN NOT NULL DEFAULT FALSE,
  group_chat       BOOLEAN NOT NULL DEFAULT FALSE,
  payout_channel   BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Player state and wallets
-- ===========================================================================

CREATE TABLE player_state (
  user_id                 BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level                   INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 99),
  xp                      BIGINT  NOT NULL DEFAULT 0 CHECK (xp >= 0),
  energy                  NUMERIC(12,3) NOT NULL DEFAULT 100 CHECK (energy >= 0),
  energy_updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  combo_count             INTEGER NOT NULL DEFAULT 0 CHECK (combo_count >= 0),
  last_tap_at             TIMESTAMPTZ,
  verified_ads_count      INTEGER NOT NULL DEFAULT 0 CHECK (verified_ads_count >= 0),
  conversion_available_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coin/Boost Cash/Gem balances. Boost Cash has available/locked/withheld states.
CREATE TABLE wallets (
  user_id                BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  coin                   BIGINT NOT NULL DEFAULT 0 CHECK (coin >= 0),
  gem                    BIGINT NOT NULL DEFAULT 0 CHECK (gem >= 0),
  bc_available           BIGINT NOT NULL DEFAULT 0 CHECK (bc_available >= 0),
  bc_locked              BIGINT NOT NULL DEFAULT 0 CHECK (bc_locked >= 0),
  bc_withheld            BIGINT NOT NULL DEFAULT 0 CHECK (bc_withheld >= 0),
  payout_wallet_address  TEXT,
  payout_wallet_updated_at TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Immutable ledger (spec 02 section 4)
-- ===========================================================================

CREATE TABLE ledger_entries (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset           TEXT NOT NULL CHECK (asset IN ('COIN', 'BOOST_CASH', 'GEM')),
  bc_state        TEXT CHECK (bc_state IN ('AVAILABLE', 'LOCKED', 'WITHHELD')),
  amount          BIGINT NOT NULL,
  reason          TEXT NOT NULL CHECK (reason IN (
    'TAP','COMBO','CRITICAL','UPGRADE_PURCHASE','BOOST_ACTIVATION','MINER_KEY_PURCHASE',
    'SKIN_PURCHASE','MINER_EARNING','QUEST_CLAIM','DAILY_GATE_REWARD','DAILY_GATE_FALLBACK',
    'AD_REWARD','STREAK_MILESTONE','REFERRAL_REWARD','WEEKLY_REWARD','SEASON_REWARD',
    'CONVERSION_DEBIT','CONVERSION_CREDIT','WITHDRAWAL_LOCK','WITHDRAWAL_PAID',
    'WITHDRAWAL_REJECT_FORFEIT','WITHDRAWAL_RESTORE','ADMIN_ADJUSTMENT'
  )),
  source          TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  balance_after   BIGINT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_user_idx ON ledger_entries (user_id, id DESC);
CREATE INDEX ledger_entries_reason_idx ON ledger_entries (reason);
CREATE INDEX ledger_entries_asset_idx ON ledger_entries (asset);

-- ===========================================================================
-- Upgrades, boosts, miner, skins
-- ===========================================================================

CREATE TABLE upgrade_config (
  id                     BIGSERIAL PRIMARY KEY,
  category               TEXT NOT NULL CHECK (category IN (
    'POWER_TAP','ENERGY_CAP','ENERGY_REGEN','AUTO_MINER','CRITICAL_CHANCE','OFFLINE_CAPACITY'
  )),
  tier                   INTEGER NOT NULL CHECK (tier >= 1),
  level                  INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
  required_account_level INTEGER NOT NULL CHECK (required_account_level BETWEEN 1 AND 99),
  cost_coin              BIGINT NOT NULL DEFAULT 0 CHECK (cost_coin >= 0),
  cost_gem               BIGINT NOT NULL DEFAULT 0 CHECK (cost_gem >= 0),
  cost_bc                BIGINT NOT NULL DEFAULT 0 CHECK (cost_bc >= 0),
  effect_value           NUMERIC(18,4) NOT NULL,
  enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, tier, level)
);

CREATE TABLE player_upgrades (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  tier       INTEGER NOT NULL DEFAULT 1,
  level      INTEGER NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 10),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

CREATE TABLE boost_config (
  type              TEXT PRIMARY KEY,
  multiplier        NUMERIC(6,2) NOT NULL DEFAULT 1,
  duration_seconds  INTEGER NOT NULL DEFAULT 600,
  max_stack_seconds INTEGER NOT NULL DEFAULT 3600,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE boosts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  multiplier NUMERIC(6,2) NOT NULL DEFAULT 1,
  source     TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX boosts_active_idx ON boosts (user_id, expires_at);

CREATE TABLE miner_keys (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX miner_keys_active_idx ON miner_keys (user_id, expires_at);

CREATE TABLE skins (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  buff_type  TEXT NOT NULL CHECK (buff_type IN ('COIN_PER_TAP', 'ENERGY_REGEN', 'AUTO_MINER')),
  buff_value NUMERIC(8,4) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_skins (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_id     BIGINT NOT NULL REFERENCES skins(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, skin_id)
);
CREATE UNIQUE INDEX player_skins_equipped_idx ON player_skins (user_id) WHERE equipped;

-- ===========================================================================
-- Quests
-- ===========================================================================

CREATE TABLE quest_templates (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN (
    'TAP_COUNT','COIN_EARNED','UPGRADE_PURCHASE','REWARDED_AD','DAILY_GATE','ACTIVE_TIME',
    'MEMBERSHIP','SHARE','QUALIFIED_REFERRAL','COMBO_TARGET'
  )),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target      NUMERIC(18,2) NOT NULL DEFAULT 1 CHECK (target > 0),
  reward_xp   BIGINT NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  reward_coin BIGINT NOT NULL DEFAULT 0 CHECK (reward_coin >= 0),
  reward_bc   BIGINT NOT NULL DEFAULT 0 CHECK (reward_bc >= 0),
  reward_gem  BIGINT NOT NULL DEFAULT 0 CHECK (reward_gem >= 0),
  x2_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  weight      INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dynamic daily assignment: 3-5 quests selected per user per UTC day and stored.
CREATE TABLE quest_assignments (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id BIGINT NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
  game_day    DATE NOT NULL,
  target      NUMERIC(18,2) NOT NULL,
  reward_xp   BIGINT NOT NULL DEFAULT 0,
  reward_coin BIGINT NOT NULL DEFAULT 0,
  reward_bc   BIGINT NOT NULL DEFAULT 0,
  reward_gem  BIGINT NOT NULL DEFAULT 0,
  x2_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  progress    NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (progress >= 0),
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLAIMED','EXPIRED')),
  claimed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id, game_day)
);
CREATE INDEX quest_assignments_user_day_idx ON quest_assignments (user_id, game_day);

CREATE TABLE quest_claims (
  id              BIGSERIAL PRIMARY KEY,
  assignment_id   BIGINT NOT NULL UNIQUE REFERENCES quest_assignments(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  reward_snapshot JSONB NOT NULL,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Ads (AdsGram primary, TADS fallback)
-- ===========================================================================

CREATE TABLE ad_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('ADSGRAM','TADS')),
  slot            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'OFFERED' CHECK (status IN (
    'OFFERED','STARTED','CALLBACK_RECEIVED','VERIFIED','CREDITED','FAILED','EXPIRED','REJECTED')),
  reward_snapshot JSONB NOT NULL,
  block_widget    TEXT,
  callback_data   JSONB,
  ledger_entry_id BIGINT REFERENCES ledger_entries(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ad_events_pending_idx ON ad_events (user_id, provider, status);
CREATE INDEX ad_events_verified_idx ON ad_events (user_id, status);

CREATE TABLE provider_callbacks (
  id          BIGSERIAL PRIMARY KEY,
  ad_event_id UUID REFERENCES ad_events(id) ON DELETE SET NULL,
  provider    TEXT NOT NULL,
  raw         JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched     BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Daily Gate, streak, New Day Switch
-- ===========================================================================

CREATE TABLE daily_gate_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_day        DATE NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'NORMAL' CHECK (kind IN ('NORMAL','FALLBACK','NEW_DAY_SWITCH')),
  link_variant    TEXT CHECK (link_variant IN ('A','B')),
  status          TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED','OPENED','REDIRECTED','VERIFYING','CODE_ISSUED','COMPLETED','EXPIRED','REJECTED','CANCELLED')),
  task_token_hash TEXT NOT NULL UNIQUE,
  reward_snapshot JSONB NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX daily_gate_tasks_user_day_idx ON daily_gate_tasks (user_id, game_day, kind);

CREATE TABLE daily_gate_codes (
  id          BIGSERIAL PRIMARY KEY,
  task_id     UUID NOT NULL UNIQUE REFERENCES daily_gate_tasks(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_day    DATE NOT NULL,
  code_hash   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','CONSUMED','EXPIRED','REVOKED')),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX daily_gate_codes_user_day_idx ON daily_gate_codes (user_id, game_day);

CREATE TABLE streaks (
  user_id            BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak     INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak     INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_completed_day DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE new_day_switch_uses (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_day DATE NOT NULL,
  used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_day)
);

-- ===========================================================================
-- Referral
-- ===========================================================================

CREATE TABLE referrals (
  id           BIGSERIAL PRIMARY KEY,
  referrer_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id   BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','QUALIFIED','REVIEW','REJECTED')),
  qualified_at TIMESTAMPTZ,
  reward_key   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referrals_referrer_idx ON referrals (referrer_id, status);

-- ===========================================================================
-- Weekly rank and season
-- ===========================================================================

CREATE TABLE weekly_scores (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  board      TEXT NOT NULL CHECK (board IN ('COIN','XP','QUEST')),
  score      NUMERIC(30,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, board)
);
CREATE INDEX weekly_scores_board_idx ON weekly_scores (week_start, board, score DESC);

CREATE TABLE weekly_rewards (
  id              BIGSERIAL PRIMARY KEY,
  week_start      DATE NOT NULL,
  board           TEXT NOT NULL CHECK (board IN ('COIN','XP','QUEST')),
  rank            INTEGER NOT NULL CHECK (rank >= 1),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_snapshot JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, board, rank)
);

CREATE TABLE seasons (
  id             BIGSERIAL PRIMARY KEY,
  number         INTEGER NOT NULL UNIQUE,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  economy_supply NUMERIC(30,0) NOT NULL DEFAULT 10000000000,
  status         TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE season_scores (
  id         BIGSERIAL PRIMARY KEY,
  season_id  BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board      TEXT NOT NULL CHECK (board IN ('COIN','XP','QUEST')),
  score      NUMERIC(30,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id, board)
);
CREATE INDEX season_scores_board_idx ON season_scores (season_id, board, score DESC);

-- Exactly one Top 1 per board => maximum three season winners (enforced by UNIQUE).
CREATE TABLE season_rewards (
  id              BIGSERIAL PRIMARY KEY,
  season_id       BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  board           TEXT NOT NULL CHECK (board IN ('COIN','XP','QUEST')),
  rank            INTEGER NOT NULL CHECK (rank >= 1),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_snapshot JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, board, rank)
);

-- ===========================================================================
-- Conversion and withdrawal
-- ===========================================================================

CREATE TABLE conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_amount     BIGINT NOT NULL CHECK (coin_amount > 0),
  bc_amount       BIGINT NOT NULL CHECK (bc_amount >= 0),
  rate_snapshot   JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversions_user_idx ON conversions (user_id, created_at DESC);

CREATE TABLE withdrawals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_bc      BIGINT NOT NULL CHECK (amount_bc > 0),
  rate_snapshot  JSONB NOT NULL,
  fee_ton        NUMERIC(18,8) NOT NULL DEFAULT 0,
  ton_amount     NUMERIC(18,8) NOT NULL,
  net_ton        NUMERIC(18,8) NOT NULL,
  wallet_address TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','PAID','REJECTED')),
  reject_reason  TEXT,
  reject_kind    TEXT CHECK (reject_kind IN ('VIOLATION','SYSTEM_ERROR')),
  tx_reference   TEXT,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX withdrawals_user_idx ON withdrawals (user_id, status);
CREATE INDEX withdrawals_status_idx ON withdrawals (status, requested_at);

-- ===========================================================================
-- Risk, support, notifications
-- ===========================================================================

CREATE TABLE risk_signals (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  severity   INTEGER NOT NULL DEFAULT 1,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX risk_signals_user_idx ON risk_signals (user_id, created_at DESC);

CREATE TABLE risk_cases (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REVIEW','RESOLVED')),
  reason     TEXT NOT NULL,
  resolution TEXT,
  opened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at  TIMESTAMPTZ
);
CREATE INDEX risk_cases_user_idx ON risk_cases (user_id, status);

CREATE TABLE tickets (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('ACCOUNT_VPN','REFERRAL','BUG','PAYMENT_WALLET','OTHER')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tickets_user_idx ON tickets (user_id, created_at DESC);
CREATE INDEX tickets_status_idx ON tickets (status, created_at);

CREATE TABLE ticket_messages (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('PLAYER','ADMIN')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL,
  title    TEXT NOT NULL,
  body     TEXT NOT NULL DEFAULT '',
  game_day DATE NOT NULL,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_day_idx ON notifications (user_id, game_day);

-- ===========================================================================
-- Configuration, feature flags, audit
-- ===========================================================================

CREATE TABLE feature_flags (
  key         TEXT PRIMARY KEY CHECK (key IN (
    'MAINTENANCE','REGISTRATIONS','TAP_REWARDS','CONVERSION','WITHDRAWALS','DAILY_GATE',
    'DAILY_GATE_FALLBACK','NEW_DAY_SWITCH','ADSGRAM','TADS','REWARDED_ADS','REFERRAL',
    'WEEKLY_REWARD','SEASON_REWARD','GEM_TON_PURCHASE'
  )),
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_config (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason       TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_config_history (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  version    INTEGER NOT NULL,
  reason     TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX system_config_history_key_idx ON system_config_history (key, version);

CREATE TABLE admin_audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     TEXT,
  action       TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  target_id    TEXT,
  before_state JSONB,
  after_state  JSONB,
  reason       TEXT,
  ip_hash      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_logs_target_idx ON admin_audit_logs (target_type, target_id);






