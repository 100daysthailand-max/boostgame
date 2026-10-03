# Boost Game — 02 Backend, Economy, Security & API Specification

**Status:** Binding development specification  
**Implementation style:** Modular monolith  
**Backend stack:** Node.js + TypeScript  
**Database:** PostgreSQL on Neon initially  
**Hosting:** Render initially; reassess/move to VPS around 500 DAU or earlier if reliability requires  
**Game endpoint:** `https://boostgame.onrender.com`  
**API endpoint:** `https://api.boostgame.onrender.com`  
**Daily Gate gateway:** `https://dailyck.onrender.com`  
**Admin route:** `https://boostgame.onrender.com/panel/admin`

---

## 1. Binding system principles

1. The server is authoritative for player identity, balances, Energy, taps, upgrades, quests, ads, Daily Gate, conversion, referral, ranking, and withdrawal.
2. No client request may directly choose Coin amount, BC amount, Gem amount, Energy amount, XP amount, ad completion, Daily Gate completion, conversion rate, or TON payout amount.
3. Telegram raw `initData` must be validated server-side for every authenticated session flow. Never trust `initDataUnsafe`, client-provided Telegram ID, username, account level, or balance.
4. PostgreSQL is the source of truth. Do not store production state in browser local storage, JSON files, SQLite on Render disk, or client cache.
5. Every asset change is recorded as immutable ledger entry. Never operationally edit a player balance directly without a compensating audited ledger entry.
6. Every reward-changing endpoint is idempotent. Repeated request, retry, callback, refresh, or race condition must not issue duplicate reward.
7. All sensitive calculations and provider secrets execute server-side only.
8. Payout wallet private keys are never stored in frontend, repository, typical app environment variables, or admin UI. Payout is manual.
9. Every admin action is auditable.
10. Every reward/revenue/payout control is feature-flagged/configurable without source-code deployment.

---

## 2. Modules

```text
auth/                 Telegram initData validation, sessions, membership checks
player/               user profile, account age, settings, notification preference
play/                 tap validation, Energy, combo, critical calculation
progression/          XP, Account Level, tier unlock table
upgrades/             six upgrade categories and prices
boosts/               temporary boosts and stack-duration rules
miner/                Auto Miner, timed keys, online/offline production
skins/                ownership, equip state, small buffs
quests/               dynamic assignments, progress, claims, reward x2
streak/               Daily Gate streak and New Day Switch
ads/                  provider adapters, ad events, callbacks, cooldowns, fallback
daily-gate/           task gateway, Linkvertise routing, code lifecycle, fallback codes
economy/              Coin/BC/Gem wallets, immutable ledger, conversion
referral/             Telegram deep link, binding, qualification
rank/                 weekly rankings and monthly season rankings
wallet/               TON withdrawal request, rate snapshot, manual payout status
fraud/                VPN/proxy, signals, risk flags, review cases
support/              tickets, messages, attachments metadata
notifications/        bot scheduling and event delivery
admin/                owner auth, config, review, reports, audit
config/               feature flags, dynamic economy, provider and game settings
```

No microservice split is required for initial product. Modules can be separate folders/services inside one deployable backend.

---

## 3. Authentication and authorization

### 3.1 Telegram identity

`POST /auth/telegram` accepts raw Telegram Mini App `initData`.

Backend must:

1. Validate signature with `TELEGRAM_BOT_TOKEN`.
2. Validate `auth_date` freshness with configured maximum age.
3. Extract signed Telegram user object.
4. Create/update user record.
5. Issue secure session/JWT according to implementation choice.
6. Never accept a plain `telegram_user_id` as authentication.

### 3.2 Required membership

The backend checks membership for main official channel, group chat, and payout notification channel using configured Telegram identifiers and bot permissions. Store last verified state/time. Membership-sensitive operations must recheck or require fresh validation according to configuration.

### 3.3 Admin authorization

Admin has one role: `OWNER`.

Owner access requires:

- Admin identity allowlist.
- IP allowlist.
- Telegram confirmation second factor as selected by product owner.
- Secure session expiration.
- Full audit logging.

Telegram confirmation 2FA means sensitive admin login/action requires a confirmation code or approval message sent through the owner’s configured Telegram account/chat. Exact implementation may use short-lived challenge token and Telegram bot confirmation. The challenge must expire quickly and be single-use.

---

## 4. Assets, wallets, and immutable ledger

### 4.1 Assets

Player wallet assets:

- `COIN`
- `BOOST_CASH` (`BC`)
- `GEM`

TON is external payout asset, not player gameplay wallet asset.

### 4.2 Wallet states

BC needs internal accounting states even if UI mainly displays one BC number:

- `available`: eligible for normal use/withdraw request.
- `locked`: held because of withdrawal request or risk review.
- `withheld`: unavailable due to confirmed violation/rejection.

Coin and Gem have available balance. Additional holds may be used only when product rules require.

### 4.3 Ledger table requirements

Each `ledger_entries` row must contain:

```text
id
user_id
asset_type: COIN | BOOST_CASH | GEM
amount_signed: integer minor units, positive or negative
available_delta
locked_delta
reason_code
source_type
source_id
idempotency_key
balance_before optional snapshot
after metadata optional snapshot
created_at
created_by_admin_id nullable
metadata JSONB
```

`idempotency_key` must be unique where operation requires one. Amounts must be integer minor units, never floating point.

### 4.4 Required reason codes

At minimum:

```text
TAP_REWARD
COMBO_REWARD
CRITICAL_REWARD
UPGRADE_PURCHASE
BOOST_PURCHASE
BOOST_REWARD
ENERGY_GEM_REFILL
AUTO_MINER_PRODUCTION
OFFLINE_MINER_PRODUCTION
OFFLINE_X2_REWARD
AUTO_MINER_KEY_PURCHASE
SKIN_PURCHASE
SKIN_REWARD
QUEST_CLAIM
QUEST_X2_REWARD
DAILY_GATE_REWARD
DAILY_GATE_FALLBACK_REWARD
STREAK_MILESTONE
NEW_DAY_SWITCH_USE
AD_REWARD
WELCOME_REWARD
REFERRAL_REWARD
WEEKLY_LEADERBOARD_REWARD
SEASON_LEADERBOARD_REWARD
COIN_TO_BC_CONVERSION_COIN_DEBIT
COIN_TO_BC_CONVERSION_BC_CREDIT
WITHDRAWAL_LOCK
WITHDRAWAL_PAID
WITHDRAWAL_REJECTED_FORFEIT
ADMIN_ADJUSTMENT
```

### 4.5 Database transactions

The following operations must use a transaction and row locking/serializable-safe behavior as appropriate:

- Valid tap finalization.
- Upgrade purchase.
- Boost activation.
- Auto Miner settlement.
- Quest claim.
- Ad reward credit.
- Daily Gate code claim.
- New Day Switch use.
- Referral qualification reward.
- Coin-to-BC conversion.
- Withdrawal request creation.
- Withdrawal rejection/forfeit.
- Season/weekly reward distribution.
- Admin adjustment.

---

## 5. Player and progression state

### 5.1 Core user data

Minimum `users`/`player_state` information:

```text
telegram_user_id TEXT unique
username snapshot
first_name snapshot
language_code
created_at
last_active_at
account_level INTEGER default 1
xp INTEGER
energy_current INTEGER
energy_max INTEGER
energy_last_regen_at
current_combo INTEGER
last_valid_tap_at
current_streak INTEGER
last_daily_gate_day DATE nullable
membership status/timestamps
vpn/proxy status
withdrawal lock status
```

### 5.2 Account level

- Range 1–99.
- XP comes only from quest claim, verified rewarded ad when configured, and qualified referral reward.
- Ordinary tap, Daily Gate reward, and upgrade purchase do not create XP.
- Level threshold table is admin-configured.
- Every three Account Levels unlocks the next upgrade tier according to admin-configured unlock table.
- Unlock table must be queryable by client as public configuration so the player UI can accurately display requirements.

### 5.3 Upgrade tier policy

Each category has up to 10 levels in the currently unlocked tier. Further tier upgrades require Account Level unlock. Backend rejects purchase if level/tier requirement is unmet.

---

## 6. Tap, Energy, combo, and critical engine

### 6.1 Final energy contract

This is binding:

```text
Every valid tap costs exactly 1 Energy.
Energy cost does not scale with Coin/tap, Power Tap, boost, critical, combo, level, or skin.
```

Initial settings:

```text
starting_energy = 100
starting_energy_max = 100
level_1_energy_cap_ceiling = 1000
base_energy_regen = 1 Energy per 5 seconds
base_valid_tap_rate_limit = 1 valid tap per second
base_power_tap_reward = 1 Coin
```

Energy regeneration calculation must be server-side from `energy_last_regen_at`, base rate, upgrades, skin buffs, and active approved effects. Do not rely on a background cron to increment every player individually.

### 6.2 Tap endpoint

`POST /game/tap`

Authenticated request contains no reward amount. Server:

1. Validates session.
2. Loads player state under appropriate lock.
3. Calculates regenerated Energy from trusted timestamps.
4. Rejects if Energy < 1.
5. Rejects if valid-tap rate limit is exceeded.
6. Determines active Power Tap, relevant skins, boosts, combo state, and critical event.
7. Calculates Coin reward from versioned config table/formula.
8. Decrements Energy by exactly 1.
9. Creates ledger entry/aggregated authoritative event as chosen by implementation.
10. Updates combo and timestamp state.
11. Returns authoritative reward, Energy, combo, critical, and balances.

The backend can aggregate low-value tap ledger writes for performance only if balance calculation remains exact and audit-capable. It must still preserve reliable anti-duplicate behavior.

### 6.3 Combo

- Base combo checkpoint: every 5 valid taps.
- Multipliers x2/x3/x5 are configuration-driven.
- Combo has a configured cap.
- Timeout/timing rule is configuration-driven.
- Combo grants Coin only.
- Combo behavior and formula version must be logged in metadata for audit where a reward is produced.

### 6.4 Critical

Base critical chance, multiplier, and upgrade increments are admin-configured economy values chosen to preserve profitability. Critical grants Coin only. The critical random source must be server-side and cryptographically appropriate/random enough for game integrity.

---

## 7. Upgrades, boosts, keys, miner, and skins

### 7.1 Upgrade configuration

Admin-configured table per upgrade/tier/level must include:

```text
upgrade_type
tier
level
required_account_level
coin_cost
gem_cost optional
bc_cost optional
effect_type
effect_value
enabled
```

Allowed upgrade types: `POWER_TAP`, `ENERGY_CAP`, `ENERGY_REGEN`, `AUTO_MINER`, `CRITICAL_CHANCE`, `OFFLINE_CAPACITY`.

### 7.2 Buy upgrade endpoint

`POST /upgrades/:upgradeType/buy`

Server checks:

- Upgrade enabled.
- Current level/tier.
- Account Level requirement.
- Cost balance.
- Max level for tier.
- Any Gem/BC requirement.

Server transaction debits assets, updates player upgrade state, logs ledger, and returns new effect values.

### 7.3 Boosts

Boost config must include type, effect, duration, maximum stack duration, cost/reward source, and eligibility.

Same boost type:

```text
Reactivation adds duration up to maximum_stack_duration.
It does not multiply the numerical effect again.
```

Different boost types may coexist.

Standard default duration is 10 minutes. No boost must be granted solely from an unverified client claim.

### 7.4 Auto Miner keys

`miner_keys` require:

```text
id
user_id
key_type
starts_at
ends_at
purchase_source
purchase_cost metadata
active
created_at
```

Key duration constraints:

- Presets 2h and 3h.
- Custom duration minimum 30 minutes.
- Custom duration maximum 10 hours.
- Custom key price uses admin-configured premium formula.

Key acquisition sources accepted by product:

- Gem.
- BC.
- Daily Gate/Linkvertise reward.
- Rewarded ad reward.
- TON/Stars purchase when enabled.

When key expires, Auto Miner stops completely online and offline.

### 7.5 Miner settlement

Auto Miner Level 1 base production is 20 Coin/minute. Upgrade increases are percentage-based and config-driven. Online and offline rates can differ via separate configured multiplier.

Server calculates production based on:

```text
last_settlement_at
active key overlap interval
miner level/effects
active boosts
skin buff
online/offline policy
offline capacity cap
```

Maximum offline earning duration defaults to 10 hours/configuration. Client cannot submit earned amount.

### 7.6 Offline x2 ad

An offline x2 opportunity creates an ad event bound to a settled offline earning amount. On verified completion, backend credits only the additional amount, not the full amount again. The same settlement can be x2 claimed once only.

### 7.7 Skins

Skin entity includes ownership, equip state, acquisition source, and small buff definitions. Approved buff families are Coin/tap %, Energy Regen %, Auto Miner %. Only one equipped skin applies unless future explicit design changes. Default skin is granted at account creation.

---

## 8. Dynamic quests and XP

### 8.1 Quest templates

Allowed template types:

```text
TAP_COUNT
COIN_EARNED
UPGRADE_PURCHASE
REWARDED_AD_COMPLETE
DAILY_GATE_COMPLETE
ACTIVE_TIME
TELEGRAM_MEMBERSHIP
GAME_SHARE
QUALIFIED_REFERRAL
COMBO_TARGET
```

Quest template config includes availability, target, reward assets, XP, BC rule, weight, date/level eligibility, and x2-ad eligibility.

### 8.2 Assignment

At daily/game-cycle generation, system selects dynamic quest count and templates based on admin configuration. It may assign 3 today and 5 tomorrow. Assignment is deterministic/stored after creation; refresh must not reroll the player’s assigned quests unless an explicit reroll system is later added.

### 8.3 Completion and claim

Progress updates from authoritative events. `POST /quests/:id/claim` locks assignment and verifies:

- Assignment belongs to user.
- Completion target reached.
- Not claimed.
- Not expired.

Transaction grants configured XP/Coin/BC/Gem and marks claim. Idempotency key is `quest_claim:{assignment_id}`.

### 8.4 Quest x2

If enabled, x2 flow creates ad event before ad display. The configuration determines exactly which reward assets can double. It must never accidentally double a prior reward twice.

---

## 9. Daily Gate, Linkvertise, code system, streak, and fallback

### 9.1 Time rules

- Game day is UTC date.
- Reset at 00:00 UTC.
- One normal Daily Gate completion per user per game day.
- Normal task TTL after start: 10 minutes.
- Reminder target: 06:00 UTC.

### 9.2 Daily Gate task states

```text
CREATED
OPENED
REDIRECTED
VERIFYING
CODE_ISSUED
COMPLETED
EXPIRED
REJECTED
CANCELLED
```

Task contains user, game day, expiry, reward snapshot, link chosen, signed token ID, risk data references, and completion context.

### 9.3 Start flow

`POST /daily-gate/start`

Server:

1. Validates Telegram session.
2. Checks feature flag and maintenance state.
3. Checks membership requirement if configured.
4. Checks VPN/proxy restriction.
5. Checks already completed today.
6. Returns existing non-expired task if one exists; otherwise creates one task with 10-minute expiry.
7. Selects active Linkvertise target A/B via health/priority config.
8. Returns signed gateway URL.

### 9.4 Gateway

Gateway is separate website `dailyck.onrender.com` initially. It validates signed task token and task state. It does not ask for new account login. It presents branding, reward, expiry countdown, and Continue action.

`POST /gateway/task/:token/go` marks REDIRECTED and redirects to selected Linkvertise target. Use POST/action rather than a passive GET redirect to reduce accidental browser prefetch behavior.

### 9.5 Linkvertise verification and code issuance

Where anti-bypass hash/verification is available, server verifies it with publisher secret server-side. The secret never reaches browser.

After valid completion, system creates one-time code record:

```text
code hashed at rest
user_id bound
task_id bound
game_day bound
expiry
reward snapshot
status: ACTIVE | CONSUMED | EXPIRED | REVOKED
```

Code is shown to user through gateway. It is not a generic shared code. Code issuance must happen only after completion verification or allowed manual fallback process.

### 9.6 Claim code

`POST /daily-gate/code/claim`

Server validates user session, locks code/task, checks:

- Code exists.
- Code active.
- Bound to this user.
- Bound to this game day.
- Not expired.
- Task not completed.
- Risk/VPN policy.

Transaction:

- Marks code consumed.
- Marks task completed.
- Credits BC with `daily_gate_claim:{task_id}` idempotency key.
- Updates streak/last daily day.
- Updates Daily Gate quest progress.
- Records risk/audit event.

### 9.7 Streak

Streak is based on valid Daily Gate completion. Missed day resets streak to zero unless New Day Switch is used validly.

Milestones: 3, 7, 14, 30 days. Day 3 reference is ~100 VND equivalent; all milestone rewards are admin-configured in BC or TON-equivalent mode. System snapshots final BC reward at task/reward time.

### 9.8 New Day Switch

New Day Switch is streak protection.

Rules:

- Enabled at launch.
- Maximum one use per user per UTC day.
- Maximum 30 uses per user per calendar month.
- May use configured tougher link/task route.
- Must be represented by separate state/event and ledger/audit record.
- Must preserve streak according to configured rule without improperly granting normal Daily Gate reward unless explicitly configured.

### 9.9 Fallback mode

If Linkvertise/verification is unhealthy and repair cannot complete before day end, owner can enable fallback code mode.

Fallback code requirements:

- Scoped to UTC game day.
- One claim per eligible user.
- Expiry at end of game day.
- Reward at least 50% lower than normal Daily Gate reward.
- Preserves streak.
- Can be published to official channel/group and sent by bot.
- Has full claim/audit logging.

Fallback is not used for individual bypass failures by default. Individual invalid verification leads to reject/review.

---

## 10. Ads provider adapter and rewarded events

### 10.1 Providers

Initial adapters:

- AdsGram.
- Monetag.
- Adsterra.

Provider documentation and policies must be reviewed before production placement. Only placements allowed by each provider policy may be enabled. Do not assume every provider permits every incentivized/reward type.

### 10.2 Ad event states

```text
OFFERED
STARTED
CALLBACK_RECEIVED
VERIFIED
CREDITED
FAILED
EXPIRED
REJECTED
```

`ad_events` include user, provider, placement, reward snapshot, event token, created/expiry times, completion data, callback verification, and credited ledger ID.

### 10.3 Offer routing

`POST /ads/offer`

Input is an allowed reward slot, not a client-chosen amount. Server evaluates:

1. Feature/provider enabled.
2. Game-level 30-second cooldown.
3. Provider cooldown, including 15-minute requirement where applicable.
4. Provider/user/session/total caps.
5. User risk restrictions.
6. Slot-provider mapping.
7. Provider priority and eligible fallback.
8. Current no-fill/sold-out status.

It creates one ad event and returns provider-specific safe client configuration.

### 10.4 Verification

Preferred path is server-to-server postback/callback with provider signature/token. Match callback to `ad_event_id`. Verify event is valid, provider matches, event unexpired, and not already credited.

Client-only completion cannot credit high-value BC without configured review/delay. All completed fallback-provider rewarded ads count toward lifetime 20-ad withdrawal requirement if server-verified.

### 10.5 Credit

Verified event produces one reward according to event reward snapshot. Use idempotency key `ad_reward:{ad_event_id}`. Never recompute potentially changed reward config after event creation; use snapshot.

### 10.6 Retry/failure

Allowed verification retries are maximum two attempts when provider protocol/network condition warrants retry. If primary provider fails before verified completion, system may create/offer eligible fallback provider event. It must not grant two rewards for one player intent.

### 10.7 No-fill

If all provider paths fail/no-fill, base gameplay remains available. Per placement admin config can select one fallback outcome:

- lower Coin reward;
- lower BC reward;
- alternative quest;
- no reward.

No-fill cannot fabricate an ad completion or increase user’s verified ad count.

---

## 11. Coin-to-BC conversion

### 11.1 Binding conversion behavior

- Model: direct conversion.
- Conversion completes immediately after valid confirmation.
- Coin is debited immediately.
- BC is credited immediately.
- User cooldown: one conversion every 6 hours.
- No normal visible per-user conversion cap at launch.
- Admin emergency global cap and optional per-user cap exist and can be activated.
- Conversion can be disabled/sold out by owner.

### 11.2 Quote

`GET /wallet/conversion-quote`

Returns active rate, required Coin, BC output, cooldown state, eligibility, global availability, and quote expiry/version. Client displays quote; it does not calculate authoritative output.

Reference starting policy:

```text
1,000,000 Coin = BC equivalent of 0.001 TON.
```

BC rate is admin-configurable and may vary by Account Level and/or season. Rate must be versioned and quoted before confirmation.

### 11.3 Execute

`POST /wallet/convert`

Server checks session, conversion enabled, 6-hour cooldown, quote validity, user balance, eligibility, global/per-user emergency caps, and risk lock. Transaction:

- Debits Coin.
- Credits BC.
- Records conversion record/history.
- Updates cooldown timestamp.
- Writes two ledger entries with shared conversion ID.

The converted Coin is removed from user balance. It is accounted as treasury/economy retention internally, but player only sees it deducted and history entry.

---

## 12. Withdrawal and payout

### 12.1 Eligibility

Mandatory:

```text
verified_rewarded_ad_count_lifetime >= 20
```

Plus any two of:

```text
account_level >= 3
current_daily_gate_streak >= 3
qualified_referral_count >= 2
account_age >= 3 days
```

All ad completions from verified primary/fallback providers count. No client-only reported ad counts count.

### 12.2 Rate snapshot

Backend calculates withdrawal quote from current BC-to-value configuration and TON rate source/manual rate. The request stores:

```text
bc_amount
rate_version
bc_vnd_value or configured equivalent
ton_rate_snapshot
fixed_fee_snapshot
net_ton_amount
quote_created_at
```

Minimum net/gross rule must enforce 0.01 TON according to admin-configured fee handling. Fixed fee is deducted from requested payout amount, not separately charged.

### 12.3 Request

`POST /withdrawals`

Server checks:

- Eligibility.
- BC available.
- Minimum 0.01 TON.
- Stored/validated TON wallet format.
- No currently unprocessed `REQUESTED` or `APPROVED` withdrawal.
- Maximum 3 withdrawal requests per user per day.
- Risk lock status.

Transaction immediately moves/debits requested BC from available balance into locked/withdrawal state and creates `REQUESTED` withdrawal.

### 12.4 Statuses

```text
REQUESTED
APPROVED
PAID
REJECTED
```

Owner marks Paid after manual TON transfer. Optional transaction reference can be stored. No automatic on-chain transfer is implemented.

### 12.5 Rejection

If request is rejected for confirmed violation, BC is not returned. Backend records `WITHDRAWAL_REJECTED_FORFEIT` ledger/audit reason. This policy must be public in Reward/Payout Rules.

If rejection is caused by an owner/system error rather than violation, admin may use an audited recovery/manual adjustment path. This distinction must be explicitly selected in admin UI.

---

## 13. Referral

### 13.1 Bind

Referral source arrives through Telegram bot deep link. A user can bind exactly one referrer, normally at first authenticated launch. Referrer cannot be changed after binding.

### 13.2 Qualification worker/check

An automated eligibility check runs after relevant events and periodically. A referee qualifies only when all are true:

- Membership verified for main channel, group chat, payout notification channel.
- Account Level >= 1.
- First Daily Gate completed.
- Not flagged as self-referral/multi-account under configured risk rules.

After qualification, grant referrer configured BC reference reward using idempotency key `referral_reward:{referee_user_id}`. Allow configurable review delay. Suspicious cases go to review rather than automatic grant.

---

## 14. Weekly and season ranking

### 14.1 Weekly leaderboard

Global weekly leaderboard supports configured categories. Default reward is Coin; optional occasional skin/configured reward can be issued. Ranking data must use server-authoritative events only.

### 14.2 Monthly season

- Duration 30 days.
- Season economy reference supply: 10 billion Coin for player earning/economy during season.
- Three independent leaderboards: Coin, XP, Quest.
- Exactly one Top 1 winner per leaderboard.
- At most three season winners.
- Leader rewards are BC, configured separately from 10B Coin economy supply.
- Season Coin reward follows normal controlled conversion rules; it does not bypass conversion caps/cooldown/risk controls.

Season scoring formula, weight/cap/benchmark, eligibility, review requirement, and BC reward must be admin-configured and publicly shown before season promotion. No reward may exceed configured cap. Undistributed internal Coin/economy supply stays in treasury.

### 14.3 Resets

Season reset affects season scores/ranks only. It does not reset Account Level, permanent upgrades, skins, normal wallet balances, or other core progression.

---

## 15. Fraud, VPN, security, support, notifications

### 15.1 Risk signals

Store and use proportionately:

- Telegram identity snapshot.
- Hashed IP.
- Hashed user-agent.
- Light device/browser signals.
- Timezone/language.
- Tap timing behavior.
- Referral graph/binding.
- Wallet reuse signals.
- Ad event IDs/callback state.
- Daily Gate task/code history.
- VPN/proxy detection result.

### 15.2 Actions

- VPN/proxy: restrict Daily Gate/reward-sensitive flow according to config; base game can remain available.
- Suspected multi-account: lock cashout and create review case.
- Invalid/replayed code/callback: reject operation and log.
- Referral fraud: do not qualify/reward.
- High payout risk: lock BC/withdrawal until owner review.
- Severe repeated abuse: owner may ban.

### 15.3 Notifications

Maximum 5 notifications per user per day. Required notifications: Auto Miner key about to expire, withdrawal paid, withdrawal rejected, season ending, official announcements, Daily Gate reminder target 06:00 UTC subject to cap. No Energy-full or Daily Gate-expiry notification required.

### 15.4 Support

Ticket categories: Account/VPN, Referral, Bug report, Payment/wallet, Other. Ticket response target 24–72 hours. Ticket attachment storage must avoid exposing files publicly without authorization.

---

## 16. API groups

Essential endpoints:

```text
POST /auth/telegram
GET  /me
GET  /game/state
POST /game/tap
GET  /upgrades
POST /upgrades/:type/buy
GET  /boosts
POST /boosts/:id/activate
GET  /miner/state
POST /miner/keys/purchase
POST /miner/offline-x2/offer
POST /miner/offline-x2/claim
GET  /skins
POST /skins/:id/equip
POST /skins/:id/purchase
GET  /quests/today
POST /quests/:id/claim
POST /quests/:id/x2/offer
POST /daily-gate/start
GET  /daily-gate/status
POST /daily-gate/code/claim
POST /new-day-switch/start
POST /new-day-switch/claim
POST /ads/offer
POST /ads/complete-client-hint
POST /wallet/conversion-quote
POST /wallet/convert
GET  /wallet
POST /withdrawals
GET  /withdrawals
GET  /rank/weekly
GET  /season/current
GET  /referral
POST /referral/bind
POST /support/tickets
GET  /notifications
GET  /config/public
GET  /health
```

Provider callbacks and gateway routes are separate protected endpoints. Admin API routes are separately authenticated and owner-only.

---

## 17. Required acceptance tests

- Telegram identity cannot be forged by edited client request.
- A valid tap costs exactly 1 Energy and respects 1 tap/second rule.
- Power Tap raises Coin without raising Energy cost.
- Combo/critical cannot duplicate/replay rewards.
- Upgrade tier cannot bypass Account Level requirement.
- Auto Miner cannot claim more than valid active-key/time interval.
- Offline x2 credits additional amount once only.
- Quest claim cannot repeat.
- Daily Gate task/code cannot be used by another user, twice, after expiry, or on wrong day.
- Fallback Daily Gate code gives reduced reward and preserves streak exactly once.
- Verified ad event credits once; fallback provider completion counts to lifetime 20.
- No-fill never blocks base game.
- Conversion executes immediately, debits Coin, credits BC, and locks next conversion for 6 hours.
- Conversion disabled/global emergency cap prevents debit/credit safely.
- Withdrawal locks BC at request, blocks second pending request, respects 3/day, and rejects under minimum/eligibility/risk.
- Violation rejection forfeits BC only when explicitly marked violation.
- Referral grants once after all qualification conditions.
- Monthly season produces one Top 1 per Coin/XP/Quest board.
- All admin actions and balance changes have audit records.
