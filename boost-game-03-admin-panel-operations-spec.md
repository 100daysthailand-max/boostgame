# Boost Game — 03 Admin Panel & Operations Specification

**Status:** Binding development and operations specification  
**Admin role:** One `OWNER` role only  
**Admin URL:** `https://boostgame.onrender.com/panel/admin`  
**Security:** Owner allowlist + IP allowlist + Telegram confirmation 2FA + audit logging

---

## 1. Admin operating rule

The admin panel is the operational control center for Boost Game. It must allow the owner to run a game with ads, Linkvertise, BC, Coin conversion, manual TON payout, and fraud review without editing the database directly.

Every write action must:

1. Require owner session, IP allowlist, and required Telegram confirmation where configured.
2. Validate input server-side.
3. Create an audit log with before/after state when relevant.
4. Use a transaction for balance/state changes.
5. Show clear success/error state.

The panel must never reveal provider secrets, bot token, database password, or payout-wallet private key.

---

## 2. Admin access and security

### 2.1 Login

Owner login flow:

1. Owner opens admin URL from allowed IP.
2. Backend checks owner account allowlist.
3. Backend creates short-lived Telegram confirmation challenge.
4. Bot sends confirmation request/code to configured owner Telegram account.
5. Owner confirms in Telegram.
6. Backend creates short-lived secure owner session.

Required protections:

- IP not allowlisted: deny before full panel access.
- Telegram challenge expires quickly and is one-time.
- Sensitive actions may require step-up Telegram confirmation again.
- Session expiry and logout.
- Login/action failures logged.

### 2.2 Audit log

Audit log must store:

```text
id
owner_id
ip hash/raw security log policy
action type
target entity type
target entity id
before state JSON
after state JSON
reason/note
request id
created_at
```

Examples:

- Changed BC conversion rate.
- Disabled AdsGram.
- Generated Daily Gate fallback code.
- Locked player withdrawal.
- Approved/rejected/paid withdrawal.
- Issued manual BC adjustment.
- Changed season reward.

Audit records are append-only.

---

## 3. Navigation

Required admin menu:

```text
Dashboard
Players
Economy
Game Configuration
Ads
Daily Gate & Streak
Quests
Auto Miner / Keys / Boosts / Skins
Referral
Weekly Rank & Season
Withdrawals
Fraud & Reviews
Support Tickets
Notifications
Feature Flags
Reports & Exports
Audit Logs
Settings
```

---

## 4. Dashboard

Dashboard must show current operational status without needing raw database queries.

### 4.1 User and gameplay metrics

- New registrations today/week/month.
- Active users today/week/month.
- Taps/valid tap rate.
- Average gameplay session duration if tracked.
- Energy-empty events.
- Upgrade purchases by type.
- Auto Miner active keys/expiry count.
- Quest assigned/completed/claimed.
- Current streak distribution.

### 4.2 Daily Gate metrics

- Tasks created/opened/redirected.
- Codes issued/claimed.
- Completed/expired/rejected count.
- Link A and Link B success/failure rates.
- Anti-bypass verification failures.
- Fallback code claims.
- Current Daily Gate on/off state.

### 4.3 Ads metrics

- Offer/start/verified/credited count per provider.
- No-fill count/rate.
- Callback verification failures.
- Reward issued by provider/placement/geo when data available.
- Provider status and last error.
- Current provider and global cap states.

### 4.4 Economy and payout metrics

- Coin issued/spent/conversion volume.
- BC issued, available, locked, withheld.
- Gem issued/spent.
- Conversion count and disabled/sold-out state.
- Withdrawal requested/approved/paid/rejected.
- Estimated payout liability.
- Current reserve inputs/manual revenue figures.

### 4.5 Fraud and operations metrics

- VPN/proxy flags.
- Multi-account/risk cases.
- Locked withdrawals.
- Referral review queue.
- Open support tickets.
- Database/API/gateway/provider health alerts.

---

## 5. Players

### 5.1 Player search and profile

Search by Telegram ID, username, wallet, referral ID, ticket ID, or internal user ID.

Player page must show:

```text
Telegram identity and account creation date
Membership status for all 3 required destinations
Account Level, XP, Energy, Coin, BC available/locked/withheld, Gem
Upgrade levels and unlocked tiers
Active boosts, key history, Auto Miner state
Skin ownership/equipped skin/buff
Quest assignment/claim history
Daily Gate/streak/New Day Switch history
Ad event and verified-ad count
Conversion history and 6h cooldown state
Referral parent/children/qualification state
Weekly/season ranking
TON wallet history and withdrawal history
Risk signals/VPN state/review cases
Support tickets
Admin notes and audit history
```

### 5.2 Player actions

Owner can:

- Lock/unlock withdrawal.
- Lock/unlock reward-sensitive actions.
- Ban/unban user.
- Recheck membership.
- Recalculate/review risk signals.
- Revoke invalid Daily Gate code/task.
- Reset only safe/reviewable task state with reason.
- Create manual Coin/BC/Gem adjustment through ledger only.
- Add admin note.
- Open relevant support/review case.

Direct balance field editing is forbidden. Manual adjustment form requires asset, amount, reason, target, and confirmation.

---

## 6. Economy panel

### 6.1 Asset configuration

Admin can configure Coin, BC, Gem behavior without deployment where permitted by product rules.

Required settings:

- Welcome reward amount/source.
- Gem reward amounts/sources.
- Gem purchase availability and TON pricing.
- Daily Gate BC/TON-equivalent reward mode.
- Streak milestone rewards (Day 3/7/14/30).
- Referral BC reward.
- Quest reward templates.
- Ad reward mapping by provider/geo/slot.
- Weekly reward configuration.
- Season leader BC reward configuration.
- BC-to-TON rate/manual value configuration.
- Fixed withdrawal fee.
- Minimum withdrawal: 0.01 TON.
- User reward allocation target 60%.
- Admin profit target 15%.
- Reserve/referral/fraud target 25%.

### 6.2 Coin-to-BC conversion controls

Required controls:

```text
Conversion enabled ON/OFF
Current conversion rate/version
Reference display: 1,000,000 Coin = BC equivalent of 0.001 TON
Account-Level-specific rate overrides optional
Season-specific rate overrides optional
6-hour user cooldown fixed/config visible
Global daily emergency cap optional
Per-user emergency cap optional
Global sold-out state
Eligibility rules
Effective time
Reason for change
```

Default launch policy: no normal visible per-user cap. Emergency caps must still exist.

When owner disables conversion or marks sold-out, player UI receives unavailable status. Owner can publish official-channel message from notification panel.

### 6.3 BC-to-TON payout configuration

Owner can set:

- BC valuation mode.
- TON/VND rate source or manual current rate.
- Rate effective timestamp/version.
- Fixed withdrawal fee.
- Withdrawal availability.
- Minimum 0.01 TON enforcement.

Every withdrawal must store a rate snapshot. Changing rate must not retroactively alter existing request snapshot.

### 6.4 Revenue/reserve tracking

Panel must allow manual entry or imported records for:

- Estimated provider revenue.
- Confirmed provider revenue.
- Held/delayed revenue.
- Chargeback/invalid adjustment.
- Payout reserve.

Panel must calculate/display:

```text
Estimated revenue
Confirmed revenue
BC reward liability estimate
BC locked for withdrawals
Paid TON equivalent
Available reserve estimate
```

These values are operational decision support; they do not automatically credit users unless explicitly configured.

---

## 7. Game configuration

### 7.1 Tap and Energy

Owner can edit versioned configuration table for:

- Starting Energy 100.
- Base Energy regen 1 per 5 seconds.
- Level-1 Energy cap ceiling 1,000.
- Energy cost fixed 1 per valid tap; this rule must not be editable into Coin-linked cost without explicit future product change.
- Valid tap limit 1/sec baseline.
- Base Coin/tap 1.
- Combo checkpoint 5 taps.
- Combo multiplier table x2/x3/x5 and cap.
- Critical chance/multiplier/upgrade increments, selected to preserve profitability.

Changes need effective time and audit reason. Existing player state is not silently corrupted by config edits.

### 7.2 Account Level

Admin configures Level 1–99 XP threshold table and unlock table.

Binding product rule:

```text
Every 3 Account Levels unlocks next upgrade tier.
```

Admin can configure exact unlocked upgrades/skins/Daily Gate tier effects per level, but cannot present contradictory requirements to client.

### 7.3 Upgrades

For each approved category—Power Tap, Energy Cap, Energy Regen, Auto Miner, Critical Chance, Offline Capacity—owner manages table with tier, upgrade level 1–10, required Account Level, cost, effect, enabled state.

### 7.4 Boosts, keys, and skins

Owner manages:

- Boost types, effects, default 10-minute duration, max stack duration, cost/reward path.
- Auto Miner key presets 2h/3h.
- Custom key duration min 30m/max 10h and premium pricing formula.
- Auto Miner base 20 Coin/min Level 1, upgrade percentage curve, online/offline multiplier.
- Offline cap max 10h.
- Skin list, acquisition source, price, tiny buff, enable/disable.

---

## 8. Ads panel

### 8.1 Provider management

Providers: AdsGram, Monetag, Adsterra.

For every provider, owner can configure:

```text
enabled state
placement/ad unit identifiers stored securely
provider API/postback settings reference (secrets not displayed)
allowed reward slots
provider priority
fallback order
provider cooldown
provider daily cap
provider session cap
geo eligibility
risk restrictions
test mode
last callback/error health
```

### 8.2 Reward mapping

Owner configures provider + geo + reward-slot mapping. This is mandatory because reward must not be one global value regardless of provider/geo.

Allowed reward slots:

- Double Coin.
- Double Quest.
- Energy refill.
- Temporary boost.
- Double offline earnings.
- BC reward.
- Auto Miner key reward where enabled.

### 8.3 Global rules

- Game-level ad cooldown: 30 seconds.
- Provider-specific cooldown may be 15 minutes or provider-required value.
- Configurable per-provider/user/day/session caps.
- Verified completion only credits reward and lifetime ad count.
- Maximum callback verification retry: 2 when appropriate.

### 8.4 No-fill setup

Per placement, owner chooses fallback:

- lower Coin reward;
- lower BC reward;
- alternative quest;
- no reward with gameplay continuing.

Owner can switch no-fill behavior without deployment. No-fill is not a verified ad and never increases 20-ad withdrawal count.

---

## 9. Daily Gate and streak panel

### 9.1 Linkvertise settings

Owner configures:

- Link A target URL and enabled state.
- Link B target URL and enabled state.
- Priority/health-based routing.
- Anti-bypass verification endpoint/reference configuration.
- Publisher secret stored outside displayed UI.
- UTC reset 00:00.
- Task TTL 10 minutes.
- Reminder 06:00 UTC.
- VPN/proxy restriction behavior.

### 9.2 Reward settings

Owner can choose Daily Gate reward entry mode:

- Direct BC amount.
- TON-equivalent amount converted to BC using active configured rate.

Both modes must produce a final BC reward snapshot at task creation/claim. The panel shows preview before save.

Milestone table: Day 3, Day 7, Day 14, Day 30. Day 3 reference starts around 100 VND equivalent but final configured BC/TON-equivalent is owner controlled.

### 9.3 Operational task view

View/filter tasks by created/opened/redirected/verifying/code issued/completed/expired/rejected. Show user, link selected, expiry, code state, anti-bypass result, VPN/risk signals, reward snapshot, and support/review link.

### 9.4 Fallback code manager

Owner can:

- Enable fallback mode.
- Generate game-day-bound fallback code.
- Set reduced reward at least 50% below normal reward.
- Set expiry at UTC day end.
- Restrict one claim per eligible user.
- Publish to official channel/group.
- Send by bot to eligible users.
- Revoke/rotate code.
- View claim list and audit events.

### 9.5 New Day Switch

Owner configures eligibility/task route. System enforces maximum one use/day and 30 uses/month. Panel shows user usage and allows manual review/revocation only with audit reason.

---

## 10. Quests, referral, weekly rank, and season panel

### 10.1 Quest management

Owner manages quest templates, daily dynamic count range, weights, target values, level/date eligibility, XP/Coin/BC/Gem reward, x2-ad eligibility, enabled state, and expiration. No fixed daily quest count is required; configuration can generate 3 one day and 5 another.

### 10.2 Referral management

Owner configures:

- Referral reward BC.
- Qualification requirements: all three memberships, Level 1, first Daily Gate.
- Automated qualification delay/check schedule.
- Review required flag.
- Referral reward on/off.

Panel shows pending, qualified, rejected, and suspicious referrals. It supports manual approve/reject only with audit reason. No multi-level referral settings exist.

### 10.3 Weekly leaderboard

Owner configures enabled categories, reset schedule, Coin default reward, occasional skin/configured reward, and anti-cheat review requirement. Panel shows provisional and finalized rankings.

### 10.4 Monthly season

Owner configures:

```text
season start/end (30 days)
season Coin economy supply reference: 10,000,000,000 Coin
three independent boards: Coin / XP / Quest
exactly one Top 1 winner per board
BC reward for each board winner
score weights/formula/benchmark where applicable
reward cap
review state
announcement text
```

The 10B Coin is not automatically granted as BC. Leader reward is separate BC configuration. No more than one winner per season board is paid unless product owner later changes this written rule.

---

## 11. Withdrawals panel

### 11.1 Queue

Filters: Requested, Approved, Paid, Rejected, locked/review. Each request displays:

```text
user identity
account age/level/streak
verified rewarded-ad count
2-of-4 eligibility result
BC amount locked
rate snapshot
fee snapshot
gross/net TON
TON wallet address
wallet reuse/risk signals
membership/referral/ad/Daily Gate history
request timestamp
admin notes
```

### 11.2 Actions

Owner can:

- Approve.
- Reject as violation (forfeit BC).
- Reject as system/admin error (use audited restoration path).
- Mark Paid after manual transfer.
- Add optional transaction reference.
- Lock user / open review case.

Rules:

- Request limit 3/day/user.
- No new request if existing Requested or Approved.
- BC locks/debits at request time.
- Violation rejection does not return BC.
- Paid action is manual; no automatic transfer.

---

## 12. Fraud, support, notifications, and feature flags

### 12.1 Fraud/review

Panel shows VPN/proxy detections, IP/device clusters, referral graph, wallet reuse, invalid callbacks, code replay, suspicious tap behavior, risk flags, locked BC, and withdrawal review queue.

Actions: no action, restrict reward, lock cashout, manual review, ban, unban, restore only through audited adjustment.

### 12.2 Support

Ticket categories: Account/VPN, Referral, Bug report, Payment/wallet, Other. Owner can assign status, respond, request evidence, close/reopen. SLA target 24–72 hours. Attachments must be access-controlled.

### 12.3 Notifications

Owner can send official-channel announcement and manage templates for Daily Gate reminder, Auto Miner expiry, withdrawal Paid/Rejected, season end. Hard maximum is 5 notifications/player/day. Support replies are not broadcast.

### 12.4 Feature flags

Required one-click toggles:

```text
maintenance mode
new registrations
base tap rewards
Coin-to-BC conversion
withdrawals
Daily Gate
Daily Gate fallback code mode
New Day Switch
AdsGram
Monetag
Adsterra
rewarded ads
referral rewards
weekly rewards
season rewards
Gem TON purchase
```

Toggle changes must be audited and take effect predictably. Maintenance mode must preserve data and show player-friendly notice.

---

## 13. Reports, export, backups, and reliability

### 13.1 Reports/exports

Owner can export CSV for:

- Users.
- Ledger entries.
- Conversions.
- Ad events/callbacks.
- Daily Gate tasks/codes.
- Referrals.
- Withdrawals/payouts.
- Tickets.
- Rankings/season results.
- Audit logs.

### 13.2 Backups

- Neon/PostgreSQL backup process must be documented.
- Restore procedure must be tested before meaningful public payout volume.
- Owner controls database credentials.
- Never test destructive migrations against live data without backup.

### 13.3 Monitoring

Owner receives operational alert for database/API/gateway/provider failure. Health endpoint required. Monitor Daily Gate verification, ad callbacks, conversion errors, withdrawal queue, and feature flag state.

### 13.4 Hosting

Initial deployment uses Render. Separate game/API/gateway surfaces are maintained as specified. Reassess VPS migration around 500 DAU or earlier if cold starts, callback reliability, uptime, or payout operations are impacted.

---

## 14. Admin acceptance checklist

Admin panel is complete only when:

- Owner can log in with IP allowlist and Telegram confirmation.
- Every administrative write has audit record.
- Owner can manage players without direct SQL balance edits.
- Owner can configure Coin/BC/Gem/reward/fee/rate safely.
- Owner can disable conversion, payout, Daily Gate, or any provider immediately.
- Owner can configure provider+geo+slot reward mapping and no-fill fallback.
- Owner can manage Link A/B, verify Daily Gate health, and generate fallback codes.
- Owner can review/approve/reject/manual-mark-paid withdrawal with full eligibility/risk context.
- Owner can manage 3 weekly/season category boards and one Top 1 per season board.
- Owner can inspect fraud signals and support tickets.
- Owner can export ledger/payout/task data and verify backups.
