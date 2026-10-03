# Boost Game — 03 Admin Panel & Operations Specification

**Status:** Binding specification. **Role:** one OWNER. **Admin path:** `https://boostgame.onrender.com/panel/admin`.

## Binding URL topology

Boost Game uses two independent Render services. Nested hostnames are forbidden.

```text
Main game/UI/API/admin: https://boostgame.onrender.com
Main API only:          https://boostgame.onrender.com/api/...
Admin only:             https://boostgame.onrender.com/panel/admin/...
Daily Gate website:     https://dailyck.onrender.com
```

Never use `api.boostgame.onrender.com`, `admin.boostgame.onrender.com`, or `daily-gate.boostgame.onrender.com`. The Daily Gate service is a second website: player starts task in Mini App, opens `dailyck`, completes Linkvertise, receives one-time code, returns to Mini App and confirms code.

## 1. Security

Owner access requires owner allowlist, IP allowlist and Telegram confirmation 2FA. Sensitive action can request fresh Telegram confirmation. No provider secret, database password, bot token or payout private key is displayed in panel. Every write validates server-side and creates append-only audit record with owner, time, action, target, before/after state and reason.

## 2. Required navigation

```text
Dashboard | Players | Economy | Game Configuration | Ads | Daily Gate & Streak | Quests |
Auto Miner / Keys / Boosts / Skins | Referral | Weekly Rank & Season | Withdrawals |
Fraud & Reviews | Support Tickets | Notifications | Feature Flags | Reports & Exports | Audit Logs | Settings
```

## 3. Dashboard

Show registrations/active users/taps/upgrades/miner/quest/streak; Daily Gate task/code/link A/B/fallback/verification metrics; AdsGram/TADS offer/verified/no-fill/error and reward by provider/geo/slot; Coin/BC/Gem issuance/spend/conversion/liability; withdrawals; VPN/risk/tickets; database/API/dailyck/provider health.

## 4. Players

Search Telegram ID/username/wallet/referral/ticket/internal ID. Player view includes identity, creation, 3 memberships, level/XP/Energy/assets, upgrades/boost/key/skin, quests, Daily Gate/streak/New Day Switch, ads/lifetime verified count, conversion cooldown/history, referral, ranks, wallet/withdrawals, risk, tickets, notes/audit.

Owner actions: lock/unlock withdrawal/reward, ban/unban, membership recheck, risk review, revoke unsafe task/code, safe reset with reason, audited Coin/BC/Gem adjustment, notes. Direct DB balance edit is forbidden.

## 5. Economy and game configuration

Admin controls welcome/Gem/Daily Gate/milestone/referral/quest/ad/weekly/season rewards, BC-to-TON rate/version, fixed withdrawal fee, 0.01 TON minimum, 60% user reward/15% admin/25% reserve target.

Conversion controls: enabled, rate/version, reference 1,000,000 Coin = BC equivalent 0.001 TON, level/season overrides, fixed 6h cooldown, emergency global/per-user cap, sold-out, eligibility, effective time/reason. Existing withdrawal snapshot never changes after rate edit.

Game config: Energy cost fixed 1, base regen 1/5 sec, tap limit 1/sec, base Coin 1, combo x2/x3/x5 cap, profitable critical table, level 1–99 thresholds, every 3 levels tier unlock, 6 upgrade tables, boost duration/max stack, miner 20 Coin/min L1, key 2h/3h/custom 30m–10h, offline cap 10h, skin tiny buffs. All changes versioned/audited.

## 6. Ads panel

Only AdsGram and TADS exist. AdsGram is primary; TADS fallback. Per provider config: enabled, public block/widget reference, secure provider settings reference, allowed slots, priority/fallback, cooldown, daily/session cap, geo eligibility, risk restrictions, test mode, callback health/error.

Reward mapping is mandatory by provider + geo + slot. Slots: double Coin, double quest, Energy, boost, offline x2, BC, configured key. Global game cooldown 30 sec. Per slot no-fill chooses lower Coin, lower BC, alternative quest or none. No-fill is never a verified ad.

## 7. Daily Gate and streak panel

Manage Linkvertise A/B, priority/health, server verification config, reset UTC 00:00, TTL 10m, reminder 06:00, VPN rule. Reward mode direct BC or TON-equivalent → final BC snapshot. Configure Day 3/7/14/30 rewards.

Task view filters states and displays user/link/expiry/code/anti-bypass/VPN/risk/reward. Fallback manager enables outage mode, creates day-bound one-use code, reduced reward ≤50% normal, expiry day-end, publishes/sends via bot, revokes/rotates and audits claims. New Day Switch enforces 1/day and 30/month.

## 8. Quests, referral, rank and season

Manage dynamic quest templates/count/weights/targets/rewards/x2 eligibility. Referral requirements are 3 memberships + level 1 + first Daily Gate; manage reward, delayed automated check and review.

Weekly ranks manage categories/reward. Season: 30d, 10,000,000,000 Coin economy supply, Coin/XP/Quest independent boards, exactly one Top 1 each, BC reward each, score/cap/review/announcement configuration.

## 9. Withdrawals, fraud, support, flags

Withdrawal queue displays eligibility 20 verified ads + 2/4, locked BC, quote/fee/net TON/wallet/risk/history. Actions Approve, reject violation/forfeit, reject system error/restoration, Mark Paid with transaction reference, lock/review. Limits: 3/day and no open Requested/Approved.

Fraud displays VPN/IP/device/referral/wallet/callback/code/tap signals; actions no action, restrict, lock cashout, review, ban/unban, audited restore.

Tickets: Account/VPN, Referral, Bug, Payment/wallet, Other; reply/status/evidence/close/reopen, 24–72h target. Notifications templates respect max 5/user/day.

Required feature flags: maintenance, registrations, tap rewards, conversion, withdrawals, Daily Gate, fallback, New Day Switch, AdsGram, TADS, rewarded ads, referral, weekly, season, Gem TON purchase.

## 10. Reports and acceptance

CSV export users, ledger, conversion, AdsGram/TADS events, Daily Gate tasks/codes, referral, withdrawals, tickets, ranks, audits. Backups/restore documented/tested. Health monitoring alerts owner for DB/API/dailyck/providers.

Panel is accepted only when owner can operate every listed system without direct SQL, turn each risky subsystem off in one action, inspect every reward/payout, and all changes are auditable.
