# Boost Game — 01 Player Experience Specification

**Status:** Binding specification. **Bot:** `@boostforearnbot`. **Language:** English. **Market:** Global. **Platform:** Telegram Mini App, mobile portrait first.

## Binding URL topology

Boost Game uses two independent Render services. Nested hostnames are forbidden.

```text
Main game/UI/API/admin: https://boostgame.onrender.com
Main API only:          https://boostgame.onrender.com/api/...
Admin only:             https://boostgame.onrender.com/panel/admin/...
Daily Gate website:     https://dailyck.onrender.com
```

Never use `api.boostgame.onrender.com`, `admin.boostgame.onrender.com`, or `daily-gate.boostgame.onrender.com`. The Daily Gate service is a second website: player starts task in Mini App, opens `dailyck`, completes Linkvertise, receives one-time code, returns to Mini App and confirms code.

## 1. Product loop

```text
Tap Energy Core → earn Coin → upgrade / activate Auto Miner → complete quests, Daily Gate and optional ads → earn BC → convert Coin to BC → request TON withdrawal when eligible.
```

The player-visible balances are Coin, Boost Cash (BC), and Gem. TON is payout asset only, not a gameplay balance. Coin is gameplay currency; BC is reward currency used for TON withdrawal; Gem is non-withdrawable utility currency.

## 2. Onboarding

First launch shows Boost Game branding, tagline `Tap, upgrade, and complete tasks to earn rewards.`, welcome reward if enabled, and three required community checks: main official channel, official group chat, payout notification channel. UI must show Join/Joined state and `Check Membership`. Server verification is required before reward-sensitive activity, referral qualification and withdrawal eligibility unlock. No password or manual Telegram ID entry exists.

## 3. Play screen

Bottom navigation: `Play`, `Boost`, `Tasks`, `Rank`, `Wallet`. Header/menu opens Profile, Settings, Help, Rules and Support.

Play shows Coin, BC, Gem, Account Level/XP, Energy, Energy Core, active boost timer, Auto Miner timer, current Coin/tap and combo/critical feedback.

### Binding tap and Energy rules

```text
Starting Energy: 100/100
Base Energy regen: 1 Energy per 5 seconds
Energy cost: exactly 1 Energy per valid tap
Baseline maximum: 1 valid tap per second
Level 1 / Power Tap 1: 1 Coin per valid tap
Level-1 Energy capacity ceiling: 1,000 through Energy Cap progression
```

Power Tap, boosts, combo, critical, level and skins never increase Energy cost. Invalid/rate-limited tap gives no reward and should show `Tap speed limit reached. Try again in a moment.` without accusatory fraud language.

Every 5 valid taps can advance configured combo; allowed configured multipliers are x2/x3/x5 with cap and timeout. Combo grants Coin only. Critical tap is server-random, grants Coin only, and its chance/multiplier are admin-configured for economy safety.

At zero Energy show `Wait for Energy`, eligible `Watch Ad for Energy`, eligible `Use Gem`, and `Open Boost`. Base gameplay never forces ad viewing.

## 4. Account Level, XP and upgrades

Account Level is 1–99 and separate from upgrade levels. XP is earned only from quest claim, configured verified rewarded ads, and qualified referral. Ordinary tap, Daily Gate, and upgrade purchase give no XP. Every 3 Account Levels unlocks the next upgrade tier. Each upgrade has maximum 10 levels inside currently unlocked tier. A locked tier displays `Reach Account Level [X] to unlock the next tier.`

Required upgrade categories: Power Tap, Energy Cap, Energy Regen, Auto Miner, Critical Chance, Offline Capacity. UI always shows current effect, next effect, cost, required Account Level and locked reason.

## 5. Boosts, Auto Miner and skins

Temporary boosts: 2x Coin, 3x production where configured, Energy refill, Auto Miner speed, Critical rate, Double Offline Earnings. Standard duration is 10 minutes. Different types coexist. Same type adds time only up to configured maximum; it never infinitely multiplies effect.

Auto Miner Level 1 base is 20 Coin/minute. Upgrade increases are percentage-based. Online/offline rates may differ. Key expiry stops Auto Miner completely. Key sources: Gem, BC, Daily Gate/Linkvertise, rewarded ad, TON/Stars if enabled. Key presets 2h/3h; custom duration 30 minutes–10 hours, premium price. Offline earning cap maximum is 10 hours. On return player sees production summary and optional verified `Watch Ad to Double Offline Earnings`.

Every player has a default free skin. Other skins come from Gem, BC, streak, season, admin/event. Skin buff must be visibly shown and only be tiny Coin/tap %, Energy Regen %, or Auto Miner %.

## 6. Tasks

Quest count is dynamic: for example 3 today and 5 tomorrow. Allowed templates: tap count, Coin earned, upgrade purchase, rewarded ad, Daily Gate, active time, required membership, share, qualified referral, combo target. Most rewards are XP + Coin; selected quests can grant BC. Completion requires player `Claim`; claim is one-time. Eligible completed quest may offer `Watch Ad to Double Reward`, showing exactly what doubles.

## 7. Daily Gate, streak and New Day Switch

One normal Daily Gate per UTC day; reset 00:00 UTC; reminder target 06:00 UTC; task TTL 10 minutes. Daily Gate is light mandatory: player can tap without it but does not receive daily BC or maintain streak.

Tasks tab shows reward, streak, milestone, reset countdown and `Start Daily Gate`. Flow:

```text
Start Daily Gate → signed task created → dailyck opens → user clicks Continue → Linkvertise completion → dailyck displays one-time code → user returns to Mini App → pastes code → Confirm → BC + streak + quest progress once.
```

Required messages: expired task/code, used code, invalid code, already completed, VPN/proxy unavailable, maintenance. Codes are one-time/user-bound/task-bound/day-bound.

Milestones: Day 3, Day 7, Day 14, Day 30. Day 3 reference is approximately 100 VND equivalent; all rewards are final BC or TON-equivalent configuration snapshots, never a permanent TON promise.

New Day Switch is streak protection, enabled at launch. Limit: 1/day and 30/month. It is a tougher configured link/task route and preserves streak. UI shows remaining daily/monthly usage.

If Linkvertise fails near day-end, fallback code is posted to official channel/group and optionally sent by bot. Fallback reward is at least 50% lower than normal Daily Gate reward but preserves streak.

## 8. Ads

AdsGram is primary rewarded provider; TADS is fallback. All player-facing ads are voluntary. Slots: double Coin, double eligible quest reward, Energy refill, temporary boost, double offline earnings, configured BC reward. Game-level cooldown is at least 30 seconds. Provider cooldown may be longer.

If preferred provider has no fill, game tries eligible fallback. If both fail, configured fallback may be lower Coin, lower BC, alternative quest or no reward; base gameplay remains available. A player needs 20 server-verified rewarded ads since account creation for cashout; verified AdsGram and verified TADS completions both count.

## 9. Referral, rank and season

Referral link is Telegram deep link. One immutable referrer. Referrer qualifies only after invitee joined all 3 communities, reached Level 1 and completed first Daily Gate. Automated check grants configured BC after review delay if not suspicious. Referee receives welcome reward, not separate referral reward.

Weekly global boards can rank Coin/XP/Quest. Default reward is Coin; admin may add skin/configured reward.

Monthly season lasts 30 days and has 10B Coin economy supply. It has three independent boards: Coin, XP, Quest. Each board has exactly one Top 1 season winner, so maximum three winners. Winner reward is BC. Season reset resets season score/rank only; it does not reset account level, permanent upgrades, skins or wallets.

## 10. Wallet, conversion and payout

Coin-to-BC is direct controlled conversion: player sees quote, confirms, Coin is deducted immediately, BC is credited immediately, then a 6-hour cooldown starts. Reference policy: `1,000,000 Coin = BC equivalent of 0.001 TON`; active BC rate is admin-configurable and may vary by level/season. Normal launch has no visible per-user cap, but admin has emergency global/per-user caps. If disabled/sold out UI says conversion temporarily unavailable and official channel is used for notice.

Withdrawal requirements: mandatory 20 verified rewarded ads since account creation, plus any 2 of 4: Account Level ≥3, Daily Gate streak ≥3, qualified referrals ≥2, account age ≥3 days. Minimum withdrawal is 0.01 TON. Fee is fixed/configured and deducted from payout amount.

User saves TON wallet, sees quote/rate snapshot/fee/net TON and confirms. BC locks/debits at request time. Max 3 requests/day; no new request while Requested/Approved exists. States: Requested, Approved, Paid, Rejected. Rejection due to violation does not return BC. Target handling 24–72 hours. Paid/Rejected notification is private.

## 11. Notifications, support and rules

Maximum 5 bot notifications/user/day. Required: Daily Gate reminder target 06:00 UTC, Auto Miner expiry private, withdrawal Paid/Rejected private, season ending and admin announcement official channel. No Energy-full or Daily Gate-expiry notification.

Tickets: Account/VPN, Referral, Bug report, Payment/wallet, Other; title/description required, image optional, ticket ID/status required, response target 24–72 hours. UI exposes Terms, Privacy, Reward/Payout Rules and Community Rules. Rules state no guaranteed income, prohibited VPN/multi-account/bypass/invalid ads/referral abuse, possible hold/withholding, dynamic rates, and user responsibility for wallet address.

## 12. Player acceptance

Implementation is not complete until all above player flows work, reward actions cannot duplicate, Daily Gate code/fallback flow works, verified ads count correctly, conversion instantly applies and blocks 6h, withdrawal checklist and statuses work, and all listed screens/messages are present.
