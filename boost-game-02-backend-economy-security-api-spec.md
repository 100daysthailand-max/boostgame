# Boost Game — 02 Backend, Economy, Security & API Specification

**Status:** Binding specification. **Stack:** Node.js + TypeScript modular monolith; PostgreSQL Neon initially; Render initially, reassess VPS around 500 DAU or earlier for reliability.

## Binding URL topology

Boost Game uses two independent Render services. Nested hostnames are forbidden.

```text
Main game/UI/API/admin: https://boostgame.onrender.com
Main API only:          https://boostgame.onrender.com/api/...
Admin only:             https://boostgame.onrender.com/panel/admin/...
Daily Gate website:     https://dailyck.onrender.com
```

Never use `api.boostgame.onrender.com`, `admin.boostgame.onrender.com`, or `daily-gate.boostgame.onrender.com`. The Daily Gate service is a second website: player starts task in Mini App, opens `dailyck`, completes Linkvertise, receives one-time code, returns to Mini App and confirms code.

## 1. Non-negotiable server rules

- Server is authoritative for identity, balances, Energy, tap, XP, upgrades, ad rewards, Daily Gate, conversion, referral, rank and withdrawal.
- Never trust client amount, Telegram ID, completion state, rate or balance. Raw Telegram `initData` is validated server-side.
- PostgreSQL is source of truth. No production state in local JSON, browser storage or Render filesystem.
- Every Coin/BC/Gem change writes immutable ledger record. No direct operational balance edits.
- Every reward operation has unique idempotency key and DB transaction/locking.
- Provider secrets and Linkvertise secrets are server-only. Payout private key is never stored in source/frontend/standard app env; payout is manual.
- All economy/provider/payout functions are feature-flagged.

## 2. Modules

```text
auth, player, play, progression, upgrades, boosts, miner, skins, quests, streak, ads,
daily-gate, economy, referral, rank, wallet, fraud, support, notifications, admin, config
```

## 3. Identity, membership, admin

`POST /api/auth/telegram` validates raw `initData` using bot token and auth-date freshness, creates/updates user and session. Plain Telegram ID is never authentication. Membership checks use configured main channel/group/payout-channel and store last verification.

Owner admin requires owner allowlist, IP allowlist and Telegram confirmation 2FA challenge. Every write creates append-only audit event.

## 4. Data model and ledger

Required conceptual tables: users, player_state, wallets, ledger_entries, player_upgrades, boosts, miner_keys, skins/player_skins, quest_templates/assignments/claims, ad_events/provider_callbacks, daily_gate_tasks/codes, streaks, referrals, weekly_scores, seasons/season_scores/rewards, withdrawals, risk_signals/cases, tickets, feature_flags, system_config, admin_audit_logs.

Assets: COIN, BOOST_CASH, GEM. BC has available/locked/withheld internal states. Ledger row requires user, asset, signed integer amount, reason, source, idempotency key, timestamp and metadata. Required reasons cover tap/combo/critical, upgrade/boost/key/skin, miner, quest, Daily Gate/fallback, ad, streak, referral, weekly/season, conversion debit/credit, withdrawal lock/paid/rejected-forfeit, admin adjustment.

## 5. Tap engine

Binding calculation: valid tap costs 1 Energy; starting 100; base regen 1/5 seconds; baseline rate ≤1 valid tap/sec; base Power Tap 1 Coin. Server calculates regen from timestamp and effects, checks Energy and rate, calculates configured Power Tap × active boosts × critical × combo, decrements exactly 1 Energy, credits Coin transactionally, updates combo/timestamp, returns authoritative state. Combo every 5 valid taps with configured x2/x3/x5 cap/timeout. Critical is server-side random and Coin-only.

## 6. Progression, upgrades, boosts, miner, skins

XP only from quest claim, configured verified ad, qualified referral. Level 1–99. Every 3 levels unlocks next upgrade tier. Each upgrade category has max 10 levels per tier. Config table carries tier, level, required account level, Coin/Gem/BC cost, effect and enabled state.

Boost same-type activation adds duration up to max stack, never multiplies effect; different types coexist; default 10 min.

Miner key has user/start/end/source. Standard 2h/3h; custom 30m–10h. Key expiry stops miner entirely. Level 1 base 20 Coin/min; percentage upgrade curve; online/offline multiplier can differ; offline cap ≤10h. Server settles trusted time interval; client never submits amount. Offline x2 ad credits only extra amount once. Skin applies only equipped tiny configured Coin/tap, Regen or Miner modifier.

## 7. Quests

Templates: tap count, Coin earned, upgrade, rewarded ad, Daily Gate, active time, membership, share, qualified referral, combo target. Assignment stores dynamic 3–5/etc selection permanently for that user/day. Progress comes only from authoritative events. Claim locks assignment, verifies complete/unclaimed/unexpired, grants configured XP/Coin/BC/Gem once. Quest x2 creates ad event and only doubles configured snapshot reward once.

## 8. Daily Gate system

UTC game day; reset 00:00; one normal completion/day; TTL 10m. Task states: CREATED, OPENED, REDIRECTED, VERIFYING, CODE_ISSUED, COMPLETED, EXPIRED, REJECTED, CANCELLED.

`POST /api/daily-gate/start`: validate auth, flag, membership/VPN rules, existing completion/task; create task with user/day/expiry/reward snapshot/signed token; return `https://dailyck.onrender.com/t/{token}`.

`dailyck` validates signed token/state, shows page, then POST redirect action sends user to Linkvertise A/B. Verification uses provider anti-bypass server-side where available. Valid completion issues code hashed at rest and bound to user/task/day/expiry/status.

`POST /api/daily-gate/code/claim`: validate auth, lock code/task, check owner/day/expiry/unconsumed, then consume code, complete task, credit snapshot BC exactly once, update streak and quest. Code idempotency: `daily_gate_claim:{task_id}`.

Streak milestones 3/7/14/30 configured as BC or TON-equivalent snapshot. New Day Switch: separate task/event, max 1/day and 30/month, preserves streak per config.

Fallback mode: admin enables only provider outage path; game-day code, one use/eligible player, expiry day-end, reward ≤50% normal, preserves streak, full audit. Individual bypass/invalid verification is rejected/reviewed, not fallback.

## 9. Ads: AdsGram primary, TADS fallback

No Monetag/Adsterra module exists. Event states: OFFERED, STARTED, CALLBACK_RECEIVED, VERIFIED, CREDITED, FAILED, EXPIRED, REJECTED. Event stores provider, user, configured reward snapshot, block/widget, expiry, callback data and ledger.

`POST /api/ads/offer` receives allowed slot, not amount. It checks AdsGram/TADS enabled, 30-second game cooldown, provider cooldown/cap/session cap, risk, provider+geo+slot mapping, priority/fallback/no-fill.

AdsGram callback route: `GET /api/postbacks/adsgram/reward?userid=[userId]`. TADS callback route: `POST|GET /api/postbacks/tads/reward` according to approved TADS widget documentation. Callback must match pending short-TTL event, expected provider, user, expected block/widget, event type, uncredited state and optional secret/signature. Telegram ID alone never credits reward.

Verified callback credits snapshot once with `ad_reward:{event_id}`. Both verified providers count toward lifetime 20 ads. Client SDK callback is UI hint only, never high-value authoritative BC credit. Retry verification maximum 2 attempts where protocol allows. No-fill gives configured lower Coin/lower BC/alternative quest/no reward; no-fill never increments ad count.

## 10. Conversion and withdrawal

Conversion is direct and instant. `GET /api/wallet/conversion-quote` returns server quote/version/eligibility/cooldown/availability. `POST /api/wallet/convert` checks enabled, valid quote, balance, risk, 6h cooldown, emergency caps; transaction debits Coin, credits BC, logs conversion, starts cooldown. Reference configuration is 1,000,000 Coin = BC equivalent 0.001 TON. Admin may level/season override. No normal visible cap at launch; global/per-user emergency caps exist.

Withdrawal eligibility: verified ads lifetime ≥20 AND any two: level≥3, streak≥3, qualified refs≥2, account age≥3 days. Minimum 0.01 TON, fixed fee deducted from amount. `POST /api/withdrawals` checks eligibility, balance, wallet, no Requested/Approved existing, max 3/day, risk; locks/debits BC and creates REQUESTED with rate/fee/TON snapshot. States REQUESTED, APPROVED, PAID, REJECTED. Violation rejection forfeits BC; system/admin error rejection uses audited restoration path.

## 11. Referral, rank, risk, notifications

One immutable referral binding via bot deep link. Qualification checks all three memberships, level≥1, first Daily Gate complete, and risk. Grant referrer once using `referral_reward:{referee}`; suspicious goes review.

Weekly scoring server-authoritative. Season is 30d, 10B Coin economy supply, separate Coin/XP/Quest boards, exactly one Top 1 per board, BC leader reward separately configured; reset scores only.

Risk signals include Telegram snapshot, hashed IP/UA, device signals, timezone, taps, referral links, wallet reuse, provider event, Daily Gate task/code, VPN. VPN restricts reward-sensitive path per config; multi-account locks withdrawal; invalid callback/code rejects; severe repeat abuse may ban. Notifications max 5/day.

## 12. Core APIs and acceptance tests

Required routes include `/api/auth/telegram`, `/api/me`, `/api/game/state`, `/api/game/tap`, upgrades/boost/miner/skins/quests routes, Daily Gate start/status/code claim, New Day Switch, ads offer/callback, wallet quote/convert, withdrawals, rank/season, referral, tickets, config/public and health.

Acceptance: forged identity fails; tap costs 1 and cannot exceed rate; rewards cannot replay; tier cannot bypass; miner/offline x2 cannot forge; code cannot transfer/reuse/expire; fallback credits lower once; callback without matching event credits nothing; provider replay credits once; conversion is instant+6h; withdrawal locks BC/limits request; season has exactly three possible winners; every balance/admin change audit/ledger exists.
