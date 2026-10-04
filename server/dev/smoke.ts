import { signInitData } from '../src/services/telegram.js';

/**
 * End-to-end smoke test against a running server (default: local dev server).
 *
 *   npm run dev:local     # terminal 1
 *   npm run smoke         # terminal 2
 */
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const BOT_TOKEN = process.env.DEV_BOT_TOKEN ?? 'dev-bot-token';

let failures = 0;

function check(name: string, ok: boolean, detail?: unknown): void {
  const mark = ok ? 'PASS' : 'FAIL';
  if (!ok) failures += 1;
  // eslint-disable-next-line no-console
  console.log(`[${mark}] ${name}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`);
}

function buildInitData(userId: number, username: string): string {
  return signInitData(
    {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: userId, username, first_name: username }),
    },
    BOT_TOKEN,
  );
}

async function main(): Promise<void> {
  // 1. health
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json() as Promise<Record<string, unknown>>);
  check('GET /api/health', health.status === 'ok', health);

  // 2. forged initData must fail
  const forged = await fetch(`${BASE}/api/auth/telegram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: buildInitData(0, 'x').replace('auth_date', 'auth_dXte') }),
  });
  check('POST /api/auth/telegram rejects forged initData (401)', forged.status === 401, { status: forged.status });

  // 3. valid login
  const loginRes = await fetch(`${BASE}/api/auth/telegram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: buildInitData(777000123, 'demo_player') }),
  });
  const login = (await loginRes.json()) as { token?: string };
  check('POST /api/auth/telegram issues a session', loginRes.status === 200 && !!login.token, {
    status: loginRes.status,
    token: login.token ? `${login.token.slice(0, 12)}...` : null,
  });

  // 4. /api/me without token
  const noAuth = await fetch(`${BASE}/api/me`);
  check('GET /api/me without token (401)', noAuth.status === 401, { status: noAuth.status });

  // 5. /api/me with token
  const meRes = await fetch(`${BASE}/api/me`, {
    headers: { authorization: `Bearer ${login.token ?? ''}` },
  });
  const me = (await meRes.json()) as { user?: Record<string, unknown>; wallet?: Record<string, unknown> };
  check('GET /api/me returns profile', meRes.status === 200 && !!me.user, {
    status: meRes.status,
    telegram_id: me.user?.telegram_id,
    coin: me.wallet?.coin,
    bc_available: me.wallet?.bc_available,
  });

  // eslint-disable-next-line no-console
  console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : `\n${failures} SMOKE CHECK(S) FAILED`);
  if (login.token) {
    // eslint-disable-next-line no-console
    console.log(
      `\nManual test (copy/paste):\n  curl -s ${BASE}/api/me -H "Authorization: Bearer ${login.token}"\n` +
        `  curl -s ${BASE}/api/health`,
    );
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
