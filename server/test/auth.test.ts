import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Express } from 'express';
import request from 'supertest';
import type { PGlite } from '@electric-sql/pglite';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db/types.js';
import { validateInitData } from '../src/services/telegram.js';
import { createTestDb } from './helpers/pglite.js';
import { makeInitData } from './helpers/initdata.js';

const BOT_TOKEN = 'test-bot-token:ABC123';
const TG_USER = { id: 555000111, username: 'karpathy_fan', first_name: 'Andrej' };

describe('telegram initData validation', () => {
  it('accepts a correctly signed payload', () => {
    const initData = makeInitData(BOT_TOKEN, TG_USER);
    const result = validateInitData(initData, BOT_TOKEN);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.user.id, TG_USER.id);
  });

  it('rejects a payload signed with a different bot token', () => {
    const initData = makeInitData('attacker-token', TG_USER);
    const result = validateInitData(initData, BOT_TOKEN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'bad_hash');
  });

  it('rejects a tampered payload (hash no longer matches)', () => {
    const initData = makeInitData(BOT_TOKEN, TG_USER);
    const tampered = initData.replace('karpathy_fan', 'someone_else');
    assert.equal(validateInitData(tampered, BOT_TOKEN).ok, false);
  });

  it('rejects a stale auth_date', () => {
    const old = Math.floor(Date.now() / 1000) - 60 * 60 * 48;
    const initData = makeInitData(BOT_TOKEN, TG_USER, old);
    const result = validateInitData(initData, BOT_TOKEN);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'expired_auth_date');
  });
});

describe('auth flow (POST /api/auth/telegram, GET /api/me)', () => {
  let app: Express;
  let db: Db;
  let pglite: PGlite;

  before(async () => {
    const created = await createTestDb();
    db = created.db;
    pglite = created.pglite;
    app = createApp({ db, botToken: BOT_TOKEN });
  });

  after(async () => {
    await pglite.close();
  });

  it('rejects forged initData with 401', async () => {
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData: makeInitData('forged-token', TG_USER) });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'invalid_init_data');
  });

  it('issues a session for valid initData and provisions player rows once', async () => {
    const initData = makeInitData(BOT_TOKEN, TG_USER);
    const first = await request(app).post('/api/auth/telegram').send({ initData });
    assert.equal(first.status, 200);
    assert.equal(typeof first.body.token, 'string');
    assert.ok(first.body.token.length > 20);

    // Second login must reuse the same user, not duplicate rows.
    const second = await request(app).post('/api/auth/telegram').send({ initData });
    assert.equal(second.status, 200);

    const users = await pglite.query<{ c: number }>('SELECT count(*)::int AS c FROM users');
    assert.equal(users.rows[0]?.c, 1);
    const states = await pglite.query<{ c: number }>('SELECT count(*)::int AS c FROM player_state');
    assert.equal(states.rows[0]?.c, 1);
    const skins = await pglite.query<{ c: number }>('SELECT count(*)::int AS c FROM player_skins');
    assert.equal(skins.rows[0]?.c, 1);
  });

  it('rejects /api/me without a token', async () => {
    const res = await request(app).get('/api/me');
    assert.equal(res.status, 401);
  });

  it('returns the authenticated profile with zero balances', async () => {
    const login = await request(app)
      .post('/api/auth/telegram')
      .send({ initData: makeInitData(BOT_TOKEN, TG_USER) });
    const token = login.body.token as string;

    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(String(res.body.user.telegram_id), String(TG_USER.id));
    assert.equal(Number(res.body.wallet.coin), 0);
    assert.equal(Number(res.body.wallet.bc_available), 0);
    assert.equal(Number(res.body.state.level), 1);
    assert.equal(res.body.membership.main_channel, false);
  });

  it('rejects an unknown session token', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer not-a-real-token');
    assert.equal(res.status, 401);
  });
});
