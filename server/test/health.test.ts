import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TAP, WITHDRAWAL } from '../src/config/constants.js';

const app = createApp();

describe('GET /api/health', () => {
  it('returns ok and reports database status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'boostgame');
    assert.ok(['up', 'down', 'not_configured'].includes(res.body.db));
    assert.equal(typeof res.body.time, 'string');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'not_found');
  });
});

describe('binding constants', () => {
  it('encodes the binding tap/energy rules from spec 01', () => {
    assert.equal(TAP.START_ENERGY, 100);
    assert.equal(TAP.ENERGY_COST_PER_TAP, 1);
    assert.equal(TAP.ENERGY_REGEN_SECONDS, 5);
    assert.equal(TAP.MAX_TAPS_PER_SECOND, 1);
    assert.equal(TAP.BASE_COIN_PER_TAP, 1);
  });

  it('encodes the binding withdrawal rules from spec 01', () => {
    assert.equal(WITHDRAWAL.VERIFIED_ADS_MIN, 20);
    assert.equal(WITHDRAWAL.MIN_TON, 0.01);
    assert.equal(WITHDRAWAL.MAX_PER_DAY, 3);
  });
});

