# Boost Game — 04 Environment Variables, Secrets, Third-Party Integrations & URL Topology

**Status:** Binding implementation specification.

## 1. Binding URL topology

Boost Game uses exactly two independent Render web services initially:

```text
Main Boost Game service: https://boostgame.onrender.com
Mini App UI:             https://boostgame.onrender.com/
Main API paths:          https://boostgame.onrender.com/api/...
Admin panel paths:       https://boostgame.onrender.com/panel/admin/...

Daily Gate website:      https://dailyck.onrender.com
Daily Gate task path:    https://dailyck.onrender.com/t/{signedTaskToken}
```

Never use nested hostnames. These are invalid in this project:

```text
https://api.boostgame.onrender.com
https://admin.boostgame.onrender.com
https://daily-gate.boostgame.onrender.com
```

Daily Gate cross-site flow:

```text
Mini App / Main API
→ create signed 10-minute Daily Gate task
→ player opens dailyck.onrender.com/t/{token}
→ Daily Gate website sends player to Linkvertise
→ Daily Gate website verifies completion and displays one-time code
→ player returns to Mini App
→ player pastes code in Boost Game
→ Main API credits BC and streak once
```

Ads postbacks always target the main game backend:

```text
AdsGram: https://boostgame.onrender.com/api/postbacks/adsgram/reward?userid=[userId]
TADS:    https://boostgame.onrender.com/api/postbacks/tads/reward
```

## 2. Mandatory third-party documentation links

AI/developers must use the current official documentation below. They must not invent SDK methods, callback parameter names, provider event types, Linkvertise verification endpoint formats, or policy permissions.

| Third party | Use in Boost Game | Official documentation / dashboard |
|---|---|---|
| Telegram Mini Apps | Web App SDK and server-side `initData` validation | https://core.telegram.org/bots/webapps |
| BotFather | Bot, Mini App and direct link management | https://t.me/BotFather |
| Render Web Services | Deploy `boostgame` and `dailyck` | https://render.com/docs/web-services |
| Render custom domains | Future migration only; not required for `.onrender.com` setup | https://render.com/docs/custom-domains |
| Neon | PostgreSQL database and connection URL | https://neon.tech/docs |
| AdsGram publisher docs | Platform/block creation and publisher integration | https://docs.adsgram.ai/publisher/ |
| AdsGram block ID | Create/get public `blockId` | https://docs.adsgram.ai/publisher/get-block-id |
| AdsGram reward/interstitial SDK | Reward/interstitial integration and SDK events | https://docs.adsgram.ai/publisher/reward-interstitial-integration |
| TADS publisher docs | Publisher onboarding and Telegram Mini App widget setup | https://docs.tads.me/getting-started/publishers |
| TADS widget creation | Widget creation, public `widgetId`, callback/webhook settings | https://docs.tads.me/getting-started/publishers/create-widget |
| Linkvertise publisher dashboard | Target links and account-specific anti-bypass configuration | https://publisher.linkvertise.com/ | https://fr.scribd.com/document/783750681/Anti-Bypass-Documentationgbfggj-t

For Linkvertise Anti-Bypass, developer must use only the exact implementation/configuration supplied by the publisher dashboard/account. Do not use unofficial bypass websites or assume a public endpoint format.

## 3. Classification rules

| Class | Browser can receive it? | Examples | Storage |
|---|---:|---|---|
| Server secret | No | DB URL, bot token, HMAC, Linkvertise secret | Render Environment Variables |
| Public SDK identifier | Yes | AdsGram `blockId`, TADS `widgetId` | Frontend public config or public config API |
| Operational config | Usually no | reward/rate/cooldown/cap/flags | PostgreSQL + Admin Panel |
| One-time runtime token | Sometimes | session, task token, event ID | Server-generated, TTL, DB state/hash |

Every `VITE_*` variable is bundled to browser JavaScript. Never place a secret in `VITE_*`.

## 4. Main service environment: `boostgame`

```env
NODE_ENV=production
PORT=10000

# URLs: public runtime configuration
APP_URL=https://boostgame.onrender.com
API_BASE_URL=https://boostgame.onrender.com/api
ADMIN_URL=https://boostgame.onrender.com/panel/admin
DAILY_GATE_URL=https://dailyck.onrender.com
GAME_ORIGIN=https://boostgame.onrender.com

# Database — SECRET
DATABASE_URL=

# Telegram — token is SECRET
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=boostforearnbot
TELEGRAM_OWNER_ID=
TELEGRAM_OWNER_CHAT_ID=

# Cryptography — all are unique SECRET random values
SESSION_SECRET=
TASK_TOKEN_SECRET=
CODE_HASH_PEPPER=
WEBHOOK_SECRET=
ADMIN_TELEGRAM_2FA_SECRET=
ENCRYPTION_KEY=

# Main ↔ Daily Gate internal authentication — SECRET
DAILY_GATE_SHARED_SECRET=

# Linkvertise — target URLs are config; verification credentials are SECRET
LINKVERTISE_TARGET_URL_A=
LINKVERTISE_TARGET_URL_B=
LINKVERTISE_ANTI_BYPASS_TOKEN=
LINKVERTISE_VERIFY_URL=
LINKVERTISE_CALLBACK_SECRET=

# AdsGram: callback secret only if provided/used; expected ID is server config
ADSGRAM_POSTBACK_SECRET=
ADSGRAM_EXPECTED_BLOCK_ID=

# TADS: protects project callback route; expected widget is server config
TADS_POSTBACK_SECRET=
TADS_EXPECTED_WIDGET_ID=

# Optional anti-VPN provider
VPN_DETECTION_API_KEY=

# Optional monitoring
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

## 5. Daily Gate service environment: `dailyck`

```env
NODE_ENV=production
PORT=10000

# URLs
DAILY_GATE_URL=https://dailyck.onrender.com
MAIN_APP_URL=https://boostgame.onrender.com
MAIN_API_URL=https://boostgame.onrender.com/api

# Database — SECRET; same DB or restricted credential to same data
DATABASE_URL=

# Must agree with main service — SECRET
TASK_TOKEN_SECRET=
DAILY_GATE_SHARED_SECRET=
CODE_HASH_PEPPER=

# Linkvertise — SECRET/config
LINKVERTISE_TARGET_URL_A=
LINKVERTISE_TARGET_URL_B=
LINKVERTISE_ANTI_BYPASS_TOKEN=
LINKVERTISE_VERIFY_URL=
LINKVERTISE_CALLBACK_SECRET=

SENTRY_DSN=
```

### Variables that must agree between services

| Variable | Reason |
|---|---|
| `DATABASE_URL` | Shared Daily Gate task/code state; restricted credentials are allowed if compatible |
| `TASK_TOKEN_SECRET` | `dailyck` validates task signed by main API |
| `DAILY_GATE_SHARED_SECRET` | Internal service-to-service authentication |
| `CODE_HASH_PEPPER` | Same Daily Gate code hashing/verification policy |
| Linkvertise settings | Daily Gate service executes Linkvertise flow |

## 6. Frontend public config

```env
VITE_APP_URL=https://boostgame.onrender.com
VITE_API_BASE_URL=https://boostgame.onrender.com/api
VITE_TELEGRAM_BOT_USERNAME=boostforearnbot

# Public AdsGram placement IDs
VITE_ADSGRAM_REWARD_BLOCK_ID=
VITE_ADSGRAM_INTERSTITIAL_BLOCK_ID=

# Public TADS widget ID
VITE_TADS_WIDGET_ID=
```

The following must never appear in frontend code or Vite variables:

```text
DATABASE_URL
TELEGRAM_BOT_TOKEN
SESSION_SECRET
TASK_TOKEN_SECRET
CODE_HASH_PEPPER
ENCRYPTION_KEY
LINKVERTISE_ANTI_BYPASS_TOKEN
LINKVERTISE_CALLBACK_SECRET
ADSGRAM_POSTBACK_SECRET
TADS_POSTBACK_SECRET
VPN_DETECTION_API_KEY
```

## 7. Provider binding rules

Boost Game uses exactly two initial ad providers:

1. **AdsGram**: primary rewarded-ad provider.
2. **TADS**: fallback provider.

Monetag and Adsterra are excluded from current code, environment variables, DB provider list, UI and admin panel.

### AdsGram

- Browser needs public `blockId`.
- Dashboard callback URL:

```text
https://boostgame.onrender.com/api/postbacks/adsgram/reward?userid=[userId]
```

- `userid` alone is not authorization. Main API matches callback with pending internal `ad_event_id`, expected AdsGram block, expected event, user, TTL, uncredited state and optional provider secret/signature.

### TADS

- Browser needs public `widgetId`.
- Dashboard callback/webhook URL:

```text
https://boostgame.onrender.com/api/postbacks/tads/reward
```

- TADS is fallback. Actual reward event depends on TADS widget format approved/configured in publisher dashboard. Developer must map only approved verified event types to reward slots; never assume all TADS widgets represent completed video ads.
- Main API matches callback with pending `ad_event_id`, expected TADS widget, user, event type, TTL, uncredited state and project secret/signature if available.

Both callbacks use one-time ledger credit. Replayed callback returns safe response but credits nothing.

## 8. Database/admin config, not `.env`

Store in PostgreSQL and edit through audited admin panel:

```text
Feature flags: maintenance, registration, conversion, payout, Daily Gate, fallback,
New Day Switch, AdsGram, TADS, rewarded ads, referral, weekly reward, season reward, Gem TON purchase

Game: Energy cost 1/tap, regen 1/5 sec, tap cap 1/sec, base Coin 1,
combo/critical, upgrade tiers/cost, boost stack, miner/key, skins

Economy: Coin→BC rate, fixed 6h cooldown, emergency conversion caps, BC→TON rate,
0.01 TON min, fixed fee, welcome/streak/referral/quest/season rewards

Daily Gate: reset 00:00 UTC, reminder 06:00 UTC, TTL 10 min, Link A/B, normal/fallback reward,
Day 3/7/14/30 rewards, New Day Switch 1/day and 30/month

Ads: AdsGram/TADS priority/cooldown/caps/provider+geo+slot reward/no-fill/widget/block status
```

## 9. Secret count, generation, Git rules

A safe real launch generally uses about 12 server secrets: database, bot token, session/task/code/webhook/admin/encryption secrets, Daily Gate shared secret, Linkvertise verification credentials and TADS callback secret. Optional: VPN, Sentry, AdsGram callback secret.

Generate a unique random value for each cryptographic secret:

```bash
openssl rand -base64 48
```

`.gitignore`:

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
coverage/
*.log
```

Keep GitHub private. Store real values only in Render Environment Variables. Rotate leaked secrets immediately in the provider/dashboard, update Render, redeploy, and invalidate affected sessions/tasks if needed.

## 10. Deployment checklist

1. Deploy main service `boostgame`; verify `https://boostgame.onrender.com/api/health`.
2. Deploy Daily Gate `dailyck`; verify `https://dailyck.onrender.com/t/{token}`.
3. Add main and Daily Gate environment values.
4. Configure Linkvertise completion to Daily Gate website.
5. Configure AdsGram and TADS callback URLs above.
6. Verify direct/fake provider callback without matching pending ad event credits nothing.
7. Verify duplicate callback credits only once.
8. Verify Daily Gate code is user/task/day-bound, expires and cannot reuse.
9. Verify main game still loads when dailyck is down; Daily Gate shows maintenance/fallback state.
