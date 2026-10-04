-- Boost Game - launch defaults (spec 01/02/03/04)
-- Idempotent: all statements use ON CONFLICT DO NOTHING.

-- Feature flags (spec 03 section 9 / spec 04 section 8)
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('MAINTENANCE',          FALSE, 'Global maintenance mode'),
  ('REGISTRATIONS',        TRUE,  'Allow new player registration'),
  ('TAP_REWARDS',          TRUE,  'Tap rewards enabled'),
  ('CONVERSION',           TRUE,  'Coin to BC conversion enabled'),
  ('WITHDRAWALS',          TRUE,  'Withdrawal requests enabled'),
  ('DAILY_GATE',           TRUE,  'Daily Gate enabled'),
  ('DAILY_GATE_FALLBACK',  FALSE, 'Daily Gate fallback (provider outage) mode'),
  ('NEW_DAY_SWITCH',       TRUE,  'New Day Switch streak protection'),
  ('ADSGRAM',              TRUE,  'AdsGram rewarded ads (primary)'),
  ('TADS',                 TRUE,  'TADS rewarded ads (fallback)'),
  ('REWARDED_ADS',         TRUE,  'Rewarded ads feature'),
  ('REFERRAL',             TRUE,  'Referral program'),
  ('WEEKLY_REWARD',        TRUE,  'Weekly rank rewards'),
  ('SEASON_REWARD',        TRUE,  'Season rewards'),
  ('GEM_TON_PURCHASE',     FALSE, 'Gem to TON purchase')
ON CONFLICT (key) DO NOTHING;

-- Boost configuration (spec 01 section 5: default 10 minutes)
INSERT INTO boost_config (type, multiplier, duration_seconds, max_stack_seconds) VALUES
  ('COIN_2X',        2.00, 600, 3600),
  ('PRODUCTION_3X',  3.00, 600, 3600),
  ('ENERGY_REFILL',  1.00,   0,    0),
  ('MINER_SPEED',    2.00, 600, 3600),
  ('CRITICAL_RATE',  1.00, 600, 3600),
  ('DOUBLE_OFFLINE', 2.00, 600,  600)
ON CONFLICT (type) DO NOTHING;

-- Default free skin with zero buff (spec 01 section 5)
INSERT INTO skins (code, name, buff_type, buff_value, is_default, enabled) VALUES
  ('default', 'Default Miner', 'COIN_PER_TAP', 0, TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Runtime economy/game configuration (spec 04 section 8)
INSERT INTO system_config (key, value, reason) VALUES
  ('game.tap', '{"energyCost":1,"regenSeconds":5,"maxTapsPerSecond":1,"baseCoinPerTap":1,"comboEvery":5,"comboMultipliers":[2,3,5],"comboTimeoutSeconds":10,"energyCapL1Ceiling":1000}', 'launch defaults (spec 01 s3)'),
  ('game.progression', '{"levelMin":1,"levelMax":99,"tierUnlockEveryLevels":3,"upgradeMaxLevelPerTier":10}', 'launch defaults (spec 01 s4)'),
  ('game.miner', '{"l1CoinPerMinute":20,"offlineCapMaxHours":10}', 'launch defaults (spec 01 s5)'),
  ('economy.conversion', '{"cooldownHours":6,"referenceCoin":1000000,"referenceTon":0.001,"enabled":true,"emergencyGlobalCap":null,"emergencyPerUserCap":null,"soldOut":false}', 'launch defaults (spec 01 s10)'),
  ('economy.withdrawal', '{"minTon":0.01,"fixedFeeTon":0,"maxPerDay":3,"verifiedAdsMin":20,"requiredOptions":2,"levelMin":3,"streakMin":3,"referralsMin":2,"accountAgeDaysMin":3}', 'launch defaults (spec 01 s10)'),
  ('economy.treasury', '{"userRewardPct":60,"adminPct":15,"reservePct":25}', 'treasury split (spec 03 s5)'),
  ('daily_gate', '{"resetHourUtc":0,"reminderHourUtc":6,"ttlMinutes":10,"milestones":[3,7,14,30],"newDaySwitchPerDay":1,"newDaySwitchPerMonth":30,"fallbackMaxRatio":0.5}', 'launch defaults (spec 01 s7)'),
  ('ads', '{"gameCooldownSeconds":30,"primary":"ADSGRAM","fallback":"TADS","lifetimeVerifiedForCashout":20}', 'launch defaults (spec 01 s8)')
ON CONFLICT (key) DO NOTHING;
