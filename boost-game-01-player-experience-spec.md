# Boost Game — 01 Player Experience Specification

**Status:** Binding development specification  
**Product name:** Boost Game  
**Telegram bot:** `@boostforearnbot`  
**Primary UI language:** English  
**Market:** Global  
**Platform:** Telegram Mini App, mobile portrait first  
**Currency shown to players:** Coin, Boost Cash (BC), Gem  
**Payout asset:** TON only

---

## 1. Scope and non-negotiable rules

This document defines exactly what a player sees, can do, cannot do, and is told when an action fails. The game is intentionally simple at its core:

```text
Tap Energy Core → earn Coin → upgrade and run Auto Miner
→ complete quests / Daily Gate / rewarded ads → earn BC
→ convert eligible Coin to BC → request TON withdrawal when eligible.
```

The UI must not expose backend-only concepts such as database rows, risk scores, provider routing, IP hashes, anti-bypass hashes, raw revenue, or internal ledger identifiers.

The following features are in scope and must not be omitted from the product implementation:

- Telegram onboarding and required-community membership.
- Energy Core tapping, Energy, combo, critical tap, Coin rewards.
- Account Level, XP, upgrade tiers, six upgrade categories.
- Auto Miner with timed keys, online/offline Coin production, offline x2 reward option.
- Temporary boosts.
- Skins with small buffs.
- Dynamic quests.
- Daily Gate through a separate Linkvertise gateway, copyable one-time code, and fallback code mode.
- Daily streak and New Day Switch streak protection.
- Rewarded ads using available provider inventory.
- Coin, BC, Gem wallet.
- Coin-to-BC conversion with 6-hour cooldown.
- TON withdrawal request and history.
- Referral.
- Weekly leaderboards and monthly season leaderboards.
- Bot notifications.
- Support tickets.
- Terms, Privacy, and Reward/Payout Rules.

The following are explicitly not part of Boost Game unless a later written change is made: NFT, separate blockchain token, PvP, clan/guild, marketplace, in-game chat, extra mini-games, CPA offerwall, battle pass, prestige, loot box/lottery, complex skin rarity, auto payout, KYC, and multi-level referral.

---

## 2. Player-visible assets

### 2.1 Coin

Coin is the main gameplay currency. It is earned from tapping, Auto Miner, offline earnings, gameplay rewards, selected quests, weekly ranking rewards, and configured events. Coin is used for gameplay progression and can be converted into BC only when conversion is enabled and the player is eligible.

### 2.2 Boost Cash (BC)

BC is the reward currency. It is earned from Daily Gate, verified rewarded ads, selected quests, streak milestones, qualified referrals, season leadership rewards, configured events, admin grants, and controlled Coin-to-BC conversion.

BC is the only in-game balance used to create a TON withdrawal request. The player does not hold TON inside gameplay; TON is sent only after manual payout.

### 2.3 Gem

Gem is a non-withdrawable utility currency. Gem can be earned from welcome rewards, streak milestones, quests, skins/events, TON purchase, and admin grants. Gem is used for Energy refill, Auto Miner keys, New Day Switch streak protection, boosts, skins, and opening upgrade tiers where configured.

### 2.4 TON

TON is not a gameplay balance. It is the external asset used for withdrawal payout. The player sees TON estimates, TON withdrawal fee, minimum withdrawal, and payout history only in Wallet.

---

## 3. Onboarding and required membership

### 3.1 First launch

A user opens `@boostforearnbot`, presses the game launch button, and enters the Mini App. The game automatically identifies the user through Telegram; the player is not asked to create a password or manually enter a Telegram ID.

The first-time screen must show:

- Boost Game name/logo.
- Short tagline: `Tap, upgrade, and complete tasks to earn rewards.`
- Welcome reward, if enabled.
- Required community tasks.
- Button to enter the game after requirements are checked.

### 3.2 Required community destinations

Before a player can unlock reward-sensitive activity, the player must join all three configured Telegram destinations:

1. Main official channel.
2. Official group chat.
3. Payout notification channel.

The player sees one line per destination:

```text
[Join] Official Channel       Status: Not joined / Joined
[Join] Community Chat         Status: Not joined / Joined
[Join] Payout Announcements   Status: Not joined / Joined
[Check Membership]
```

The game must not claim that a player joined until server verification succeeds. The player can still see the game shell, but reward-sensitive tasks, referral qualification, and withdrawal eligibility remain locked until required membership is verified.

### 3.3 Welcome reward

If enabled, the player receives a welcome reward with a reference value configured by admin. The welcome reward is intended to help progression; it does not bypass cashout eligibility. The UI must say that withdrawals require separate eligibility conditions.

---

## 4. Main navigation and Play screen

### 4.1 Bottom navigation

The default mobile navigation is:

```text
[Play] [Boost] [Tasks] [Rank] [Wallet]
```

Profile, Settings, Help, Rules, and Support are opened from a header/menu button.

### 4.2 Play screen layout

The Play screen must show:

- Coin balance.
- BC balance.
- Gem balance when Gem is enabled.
- Account Level and XP progress.
- Current Energy and maximum Energy.
- Energy Core as the primary tap target.
- Current Coin-per-tap information.
- Current combo/critical feedback when applicable.
- Active boosts and remaining time.
- Auto Miner state and active key time when applicable.

Example concept:

```text
Coin: 12,450        BC: 380        Gem: 12
Level 2             XP: 240 / 500
Energy: 86 / 100

              [ ENERGY CORE ]
                TAP TO EARN

              +1 Coin
          Combo x2 · Critical!

Active: 2x Coin — 08:32
Auto Miner: 01:44:20 remaining
```

### 4.3 Valid tap behavior

A player taps the Energy Core. For every server-valid tap:

- The player spends exactly **1 Energy**.
- The player receives Coin according to current server-approved tap formula.
- The UI responds immediately with animation, sound/haptic if enabled, and floating reward text.
- The authoritative server response determines the final balance.

The initial gameplay value is:

```text
Account Level 1, Power Tap Level 1: 1 valid tap = 1 Coin.
```

The player must never be told or led to believe that higher Coin-per-tap increases Energy cost. Energy cost remains 1 per valid tap.

### 4.4 Energy rules shown to the player

- Starting Energy: `100 / 100`.
- Level-1 Energy capacity can be increased through Energy Cap progression, up to the configured Level-1 ceiling of 1,000.
- Base regeneration: `1 Energy every 5 seconds` before Energy Regen upgrades/effects.
- Energy cost: exactly `1 Energy` per valid tap.
- When Energy reaches 0, the player cannot receive tap rewards until Energy becomes available.

When empty, the UI presents available choices:

```text
Energy Empty
[Wait for Energy]
[Watch Ad for Energy]       shown only if an eligible ad is available
[Use Gem]                   shown only if player has enough Gem and the feature is enabled
[Open Boost]
```

The player can always leave the screen or wait. Base gameplay must not force an advertisement merely because Energy is empty.

### 4.5 Tap rate and invalid taps

The normal maximum is **1 valid tap per second**. The UI may animate client taps, but only valid server-approved taps change balances.

If the player taps too quickly, the game must not show an accusatory fraud message. It should show a soft message such as:

```text
Tap speed limit reached. Try again in a moment.
```

Invalid taps do not consume Energy and do not grant Coin.

### 4.6 Combo

Combo is a simple gameplay bonus.

- Every configured sequence of 5 valid taps can advance the combo.
- Combo multipliers can reach x2, x3, and x5 according to current admin configuration.
- Combo bonus applies to Coin only, not direct BC or TON.
- Combo must have a visible cap configured by admin.
- If the player fails the timing requirement or stops beyond configured timing, combo resets.

The player sees a clear indicator such as:

```text
Combo x3
5-tap bonus active
```

### 4.7 Critical tap

Critical tap is a random Coin bonus. Base chance, multiplier, and upgrade effect are controlled by admin to remain profitable and safe. The player sees a short animation/message, for example:

```text
CRITICAL! +5 Coin
```

Critical tap never directly creates BC or TON.

---

## 5. Account Level, XP, and upgrade tiers

### 5.1 Account Level

Account Level ranges from 1 to 99. It is separate from individual upgrade levels.

The player earns XP from:

- Quest completion.
- Verified rewarded-ad completion when that reward is configured.
- Qualified referral completion.

The player does not earn XP from ordinary tapping, Daily Gate, or simply buying an upgrade.

### 5.2 Unlock logic

The player sees a Level progress bar and unlock notices. Every three Account Levels unlock a new upgrade tier according to an admin-configured level table.

Example player-facing message:

```text
Level 3 reached!
New upgrade tier unlocked.
```

Account Level can also unlock skins, stronger Daily Gate reward tiers, and cashout eligibility. Exact unlock contents must be shown in the level/unlock UI; the player must not need to guess.

### 5.3 Upgrade tier lock

Each upgrade has up to 10 levels within the currently unlocked tier. When the player has reached the allowed tier limit, the button is locked and says:

```text
Upgrade tier locked
Reach Account Level [X] to unlock the next tier.
```

---

## 6. Boost screen: upgrades, boosts, keys, skins

### 6.1 Upgrade categories

The Boost screen includes six required upgrade categories:

| Upgrade | Player-facing purpose |
|---|---|
| Power Tap | Earn more Coin per valid tap |
| Energy Cap | Hold more Energy |
| Energy Regen | Restore Energy faster |
| Auto Miner | Produce Coin automatically while key is active |
| Critical Chance | Increase chance of a critical tap |
| Offline Capacity | Increase offline-production capacity/time |

Upgrade prices and requirements are shown before purchase. A purchase must show a confirmation when it spends BC, Gem, TON, or a large amount of Coin.

### 6.2 Power Tap

Power Tap starts at 1 Coin per valid tap. Its full curve is an admin-configured table, not a hardcoded formula. The UI always shows the current and next value before purchase.

Example:

```text
Power Tap Lv. 1
Current: 1 Coin/tap
Next: 2 Coin/tap
Cost: 100 Coin
[Upgrade]
```

### 6.3 Temporary boosts

Available boost categories may include:

- 2x Coin per tap.
- 3x tap production where configured.
- Energy refill.
- Auto Miner speed boost.
- Critical-rate boost.
- Double offline earnings.

The standard duration is 10 minutes unless a specific boost configuration says otherwise. Different boost types can coexist. The same boost type does not multiply infinitely; buying or earning the same type extends duration up to its configured maximum.

Example:

```text
2x Coin Boost
Remaining: 04:15
[Add 10 minutes]
Maximum stack time: 30 minutes
```

### 6.4 Auto Miner and keys

Auto Miner produces Coin only while an active key exists.

Player-visible rules:

- Auto Miner Level 1 base rate: `20 Coin/minute`.
- Each Auto Miner upgrade increases production by a configured percentage.
- Online and offline production rates are not necessarily identical.
- When the key expires, Auto Miner stops completely, both online and offline.
- Offline collection is capped at a maximum configured duration of 10 hours.

Keys can be acquired through configured sources:

- Gem purchase.
- BC purchase.
- Daily Gate/Linkvertise reward.
- Rewarded ad reward.
- TON/Stars purchase when enabled.

Key durations:

- Standard 2-hour key.
- Standard 3-hour key.
- Custom duration from 30 minutes to 10 hours.

Custom duration must show price before confirmation. Longer duration is priced at a premium according to admin configuration.

When returning after an absence, player sees:

```text
Auto Miner Report
Offline time counted: 4h 20m
Coin earned: 5,200
[Watch Ad to Double Offline Earnings]   optional and subject to ad availability
[Collect]
```

The system may add earned Coin automatically, but the result/summary must still be visible when the player returns.

### 6.5 Skins

Every player starts with one default free skin. Additional skins may be obtained using:

- Gem.
- BC.
- Daily Gate streak milestones.
- Season rewards.
- Admin grants/events.

Skins may include small buffs only. Approved buff families are:

- Small Coin-per-tap percentage bonus.
- Small Energy Regen percentage bonus.
- Small Auto Miner percentage bonus.

The exact buff must be displayed before a player obtains/equips a skin. Skin buffs must remain small enough that they do not materially create pay-to-win behavior.

---

## 7. Tasks and quests

### 7.1 Dynamic quest count

Quest count is dynamic. The player may receive 3 quests one day and 5 quests another day. There is no promise of a fixed number.

The Tasks screen groups quests into clear categories and shows reward, progress, and claim state.

Examples:

```text
Tap 100 times                  72 / 100      +100 XP, +500 Coin
Upgrade any item               0 / 1         +120 XP, +700 Coin
Watch a reward ad              0 / 1         +50 XP, +200 Coin
Complete Daily Gate            0 / 1         +150 XP, +BC
Invite a qualified friend      0 / 1         +BC
```

### 7.2 Quest pool

Allowed quest types:

- Tap a configured number of times.
- Earn configured Coin amount.
- Upgrade an item.
- Complete a rewarded ad.
- Complete Daily Gate.
- Remain active in game for configured duration.
- Join required Telegram destinations.
- Share the game.
- Obtain a qualified referral.
- Reach configured combo target.

Most quests grant XP + Coin. Some selected or rare quests grant BC. The UI must show exact reward before the player spends time on the task.

### 7.3 Claim

Quest completion alone does not automatically add its reward. The player presses `Claim`.

```text
Quest Complete
Reward: +100 XP, +500 Coin
[Claim]
```

A claimed quest changes to `Claimed`. Pressing repeatedly must not produce duplicate reward.

### 7.4 Quest x2 reward ad

Where enabled, a completed quest can show:

```text
Watch Ad to Double Reward
```

The game must show what will be doubled. If a quest rewards Coin and XP, the configuration determines which elements double. If the player is currently earning BC from that quest, the BC portion may be doubled only where allowed by admin/provider policy. Ad cooldown/cap rules apply.

---

## 8. Daily Gate, streak, and New Day Switch

### 8.1 Daily Gate purpose

Daily Gate is a high-value daily reward flow. It is light mandatory: a player can still tap and play without it, but does not receive that day’s Daily Gate BC and does not maintain the Daily Gate streak.

Daily Gate supports:

- Daily check-in.
- BC reward.
- Streak maintenance.
- Daily Gate quest completion.
- New-day quest activation where configured.

### 8.2 Schedule

- One normal Daily Gate per player per UTC game day.
- Reset time: `00:00 UTC`.
- Bot reminder target: `06:00 UTC`.
- Normal task validity after starting: 10 minutes.

### 8.3 Daily Gate screen

The Tasks tab must show:

```text
Daily Gate
Today’s reward: [configured BC or TON-equivalent display]
Current streak: 6 days
Next milestone: Day 7
Time until reset: [countdown]
[Start Daily Gate]
```

Admin may configure reward directly as BC or as TON-equivalent. The player sees the final BC reward and any applicable estimated value, not internal conversion steps.

### 8.4 Normal Daily Gate player flow

1. Player taps `Start Daily Gate`.
2. Game confirms that a 10-minute task is being created.
3. A separate Boost Game gateway website opens.
4. Gateway shows Boost Game branding, stated reward, countdown, and Continue button.
5. Player presses Continue and completes Linkvertise partner flow.
6. Gateway provides a one-time code.
7. Player returns to Boost Game Tasks tab.
8. Player enters/pastes code and presses Confirm.
9. On success: BC is granted, streak increases, Daily Gate quest progresses, and code cannot be reused.

Gateway wording must be clear and English, for example:

```text
Daily Gate Ready
Complete the partner task to unlock your check-in code.
Time remaining: 09:58
[Continue]
```

Claim wording:

```text
Enter Daily Gate Code
[____________]
[Confirm Code]
```

Success wording:

```text
Daily Gate Completed!
+ [BC amount] BC
Streak: [N] days
```

### 8.5 Daily Gate failures

Required player-facing messages:

| Situation | Required message |
|---|---|
| Task expired | `This Daily Gate task expired. Start a new task.` |
| Code expired | `This code expired. Start a new Daily Gate task.` |
| Code used | `This code has already been claimed.` |
| Invalid code | `This code is invalid. Check it and try again.` |
| Already checked in | `You already completed Daily Gate today.` |
| VPN/proxy restriction | `Daily Gate is unavailable while VPN or proxy is detected.` |
| System maintenance | `Daily Gate is temporarily unavailable. Check official announcements.` |

### 8.6 Streak milestones

Streak resets to 0 after a missed Daily Gate unless New Day Switch is successfully used.

Milestones are required at:

- Day 3.
- Day 7.
- Day 14.
- Day 30.

Day 3 has a reference reward value of approximately 100 VND equivalent, configured as BC/TON-equivalent by admin. Day 7, 14, and 30 use admin-configured higher reward values. All values are dynamic and must not be presented as permanently fixed TON promises.

### 8.7 New Day Switch — streak protection

New Day Switch is the player-facing name for streak protection.

- It is available from product launch.
- It is limited to one use per UTC day and up to 30 uses per month per player.
- It preserves/activates the next day’s streak when normal Daily Gate was missed or needs protection.
- It may be acquired/used through the configured link/task route and is intentionally more demanding than normal Daily Gate.
- It does not remove normal Daily Gate reward rules; it is for streak continuity.
- Player sees remaining allowance:

```text
New Day Switch
Protect your streak for a missed day.
Available today: 1
Used this month: 4 / 30
[Activate New Day Switch]
```

### 8.8 Daily Gate outage fallback

If Linkvertise or verification is unavailable:

1. Daily Gate is temporarily disabled while fix is attempted.
2. If the UTC day is near ending and the issue cannot be fixed, official fallback code mode may be enabled.
3. The fallback code is posted in official channel/group and can also be sent privately by bot to eligible users.
4. Player enters it in the same Daily Gate code box.
5. Fallback reward is at least 50% lower than the normal Linkvertise Daily Gate reward, but it preserves streak.
6. One fallback code can be used once per eligible player and expires at game-day end.

Player-facing fallback wording:

```text
Daily Gate Fallback Active
Today’s partner task is unavailable.
Use the official fallback code before reset to keep your streak.
Fallback reward is reduced.
```

---

## 9. Rewarded ads and ad availability

### 9.1 Player-facing ad offers

The game uses rewarded-ad opportunities for clear voluntary benefits only:

- Double Coin reward.
- Double eligible quest reward.
- Energy refill.
- Temporary boost.
- Double offline earnings.
- BC reward where configured.

Buttons must state the reward:

```text
[Watch Ad for Energy]
[Watch Ad to Double Reward]
[Watch Ad for 2x Coin — 10 min]
[Watch Ad to Double Offline Earnings]
```

The player must be able to decline an offer and continue base gameplay.

### 9.2 Cooldown

The game enforces at least 30 seconds between rewarded-ad attempts. Provider-specific cooldowns may be longer. The player sees a timer or simple state when needed:

```text
Next reward ad available in 00:24
```

### 9.3 Completion

After a valid verified completion, player sees:

```text
Reward received!
+ [reward]
```

A single ad completion cannot be claimed more than once.

### 9.4 No-fill and fallback

If a preferred ad provider is unavailable, the game automatically tries another eligible provider. If all providers are unavailable, the player is never trapped.

Depending on admin configuration and placement, no-fill fallback can be:

- Lower Coin reward.
- Lower BC reward.
- An alternative quest.
- No reward with normal gameplay still available.

The UI must never claim the original reward was received if it was not verified.

### 9.5 Cashout ad count

For withdrawal eligibility, the player must complete 20 rewarded ads from the start of their account. All server-verified rewarded-ad completions count, including completions from eligible fallback providers. Client-only self-reports do not count.

Wallet progress example:

```text
Verified reward ads: 14 / 20
```

---

## 10. Referral

### 10.1 Referral link

Every player has a Telegram deep link. The UI shows:

```text
Invite Friends
Your referral link: [Copy Link] [Share]
Qualified referrals: 1 / 2
```

### 10.2 Qualification

A referred player qualifies only after all conditions are true:

1. Joined main official channel.
2. Joined official group chat.
3. Joined payout notification channel.
4. Reached Account Level 1.
5. Completed first Daily Gate.

The referrer receives configured BC reference reward only after automated server checking completes. Suspicious referrals may be placed under review and not rewarded immediately.

The referred player receives no separate referral reward because welcome reward exists.

### 10.3 Referral messages

```text
Referral pending
Your friend must complete onboarding, reach Level 1, and finish Daily Gate.
```

```text
Referral qualified!
+ [configured BC] BC
```

---

## 11. Rank and season

### 11.1 Weekly leaderboards

Weekly leaderboards are global. Categories may include Coin, XP, and Quest performance according to admin configuration.

Weekly leaderboard reward defaults to Coin. Admin may occasionally add skins or other configured rewards.

Player sees rank, score, reset time, and current prize if enabled:

```text
Weekly Coin Rank
Your rank: #128
Your score: 42,100 Coin
Resets in: 2d 06h
Reward: [configured]
```

### 11.2 Monthly season

A season lasts 30 days. During a season, players can collectively earn up to the configured season Coin amount, initially referenced as 10 billion Coin for the season economy.

There are three independent season leaderboards:

1. Coin leaderboard — one winner.
2. XP leaderboard — one winner.
3. Quest leaderboard — one winner.

Each leaderboard has only one Top 1 season winner. There are therefore up to three season winners, not nine.

Season leader reward is BC, not the 10B Coin pool. The 10B Coin value is season gameplay/economy supply, not a direct BC payout promise.

Coin earned as a season reward can still follow normal controlled Coin-to-BC conversion rules. It is not an automatic uncapped TON reward.

At season end:

- Season score/rank resets.
- Account Level does not reset.
- Permanent upgrade progression does not reset.
- Skins do not reset.
- Player balances do not reset solely because season ends.

Season reward is calculated with admin-configured weighted score, cap, and validity review. Player-facing rules must state the criteria before promotion.

---

## 12. Wallet, conversion, and TON withdrawal

### 12.1 Wallet screen

Wallet shows:

```text
Coin: [balance]
Boost Cash: [balance]
Gem: [balance]

Coin Conversion
Cooldown: [ready / time remaining]
[Convert Coin to BC]

TON Withdrawal
Minimum: 0.01 TON
Fee: [configured fixed fee]
Processing: 24–72 hours
[Withdraw TON]
```

### 12.2 Coin-to-BC conversion

Conversion model is direct controlled conversion.

Player flow:

1. Player selects `Convert Coin to BC`.
2. UI shows current conversion quote, required Coin, BC received, cooldown, and any eligibility/availability restriction.
3. Player confirms.
4. Coin is subtracted immediately.
5. BC is added immediately.
6. A 6-hour conversion cooldown begins.
7. Player sees conversion history.

The conversion is not a request waiting for manual approval. It happens immediately when valid.

Player messages:

```text
Conversion successful
-1,000,000 Coin
+[configured] BC
Next conversion available in 06:00:00
```

If conversion is disabled:

```text
Coin conversion is temporarily unavailable.
Please check official announcements.
```

If conversion supply is closed/sold out, the feature is disabled and official channel announcement is used. The UI must show that conversion is unavailable rather than falsely accepting Coin.

There is no normal visible per-user cap at launch. Admin maintains emergency global and optional per-user caps. Higher-level caps may be introduced later through configuration.

The current reference conversion is:

```text
1,000,000 Coin = BC equivalent of 0.001 TON
```

BC rate is configurable in admin and may vary by Account Level and/or season. The player must always see the active quote before confirming.

### 12.3 Withdrawal eligibility

A player must meet both:

**Mandatory condition**

- Completed at least 20 server-verified rewarded ads since account creation.

**And any 2 of these 4 conditions**

1. Account Level is at least 3.
2. Daily Gate streak is at least 3 days.
3. At least 2 qualified referrals.
4. Account age is at least 3 days.

Wallet must show checklist progress. Example:

```text
Withdrawal requirements
✓ Verified reward ads: 20 / 20
✓ Account Level: 3 / 3
✓ Daily Gate streak: 3 / 3
○ Qualified referrals: 1 / 2
○ Account age: 2 / 3 days

Optional requirements completed: 2 / 4
Withdrawal unlocked
```

### 12.4 Withdraw TON

Player flow:

1. Player chooses stored TON wallet or enters one.
2. UI warns that an incorrect address is the player’s responsibility.
3. Player chooses eligible BC amount/withdrawal amount.
4. UI displays rate snapshot, fixed fee, gross TON estimate, fee, and net TON.
5. Player confirms.
6. BC is deducted/locked immediately at request creation.
7. Status becomes Requested.
8. Player cannot create another request while an unprocessed request exists.
9. Owner manually reviews and changes status to Approved, Paid, or Rejected.

The player may create at most 3 withdrawal requests per day, but no new request can be created while a prior request remains Requested or Approved.

If rejected for violation, the BC is not returned. This must be visible in Reward/Payout Rules before user withdraws.

Statuses:

```text
Requested — request received
Approved — approved for manual payout
Paid — TON sent
Rejected — rejected under reward/payout rules
```

Private user notifications are sent for Paid and Rejected status.

### 12.5 Recent payouts

Wallet may show recent paid withdrawals in privacy-safe form, such as masked username/wallet. This supports trust without exposing full sensitive information.

---

## 13. Notifications

Maximum bot notification frequency is 5 messages per player per day.

Required notification behavior:

- Auto Miner key about to expire: private message to affected user.
- Withdrawal Paid: private message to affected user.
- Withdrawal Rejected: private message to affected user.
- Season ending: official channel and optional private notification within daily cap.
- Admin announcements: official channel.
- Support replies: conversation/ticket context rather than unnecessary broadcast.
- Daily Gate reminder: target 06:00 UTC, subject to player/bot messaging availability and daily cap.

No Energy-full notification is required because Energy recovers quickly. No Daily Gate task-expiring notification is required.

---

## 14. Support, rules, and player communications

### 14.1 Support tickets

In-game tickets support these categories:

- Account/VPN issue.
- Referral issue.
- Bug report.
- Payment/wallet issue.
- Other.

Each ticket requires title and description; image evidence is optional. The player receives a ticket ID and status. Target response time is 24–72 hours.

### 14.2 Required policy pages

The player must be able to open:

- Terms of Service.
- Privacy Policy.
- Reward and Payout Rules.
- Community Rules.

These rules must clearly state:

- No income is guaranteed.
- BC and conversion/payout availability can change based on valid activity, provider availability, revenue, reserve, and fraud controls.
- VPN/proxy misuse, multiple accounts, invalid ad behavior, bypassing Daily Gate, reward automation, referral abuse, and payout abuse are prohibited.
- Suspicious activity can lock/reduce/withhold reward or withdrawal.
- Incorrect wallet address is user responsibility.
- TON price/rate and BC conversion rate can change under published rules.
- Rejected withdrawal for violation may not return BC.

---

## 15. Player acceptance checklist

The player experience is complete only when all items below work:

- Player can join mandatory communities and server verification updates UI.
- Player can tap, spend exactly 1 Energy, and see Coin reward.
- Player can recover Energy at 1 per 5 seconds before upgrades.
- Player sees combo/critical correctly without receiving duplicated rewards.
- Player can upgrade, hit tier lock, and understand Account Level requirement.
- Player can activate timed Auto Miner key and see online/offline report.
- Player can obtain/equip skin and see small stated buff.
- Player receives dynamic quest list and claims each reward once.
- Player can complete normal Daily Gate using one-time code.
- Player can use fallback Daily Gate code when fallback is active.
- Player can see streak and New Day Switch allowance.
- Player can watch/decline rewarded ads without base gameplay being trapped.
- Player can see verified ad count toward withdrawal.
- Player can convert Coin to BC immediately and sees 6-hour cooldown.
- Player can see all withdrawal requirements and submit valid TON withdrawal.
- Player can view request status and receive paid/rejected notification.
- Player can use referral deep link and see qualification progress.
- Player can see weekly rank and monthly season rank.
- Player can create support ticket and open required policies.
