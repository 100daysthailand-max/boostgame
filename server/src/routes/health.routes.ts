import { Router } from 'express';
import { pingDb } from '../db/pool.js';
import { env, missingProductionSecrets } from '../config/env.js';

/**
 * Health endpoint used by Render and the deployment checklist
 * (spec 04 section 10: verify https://boostgame.onrender.com/api/health).
 */
export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const db = await pingDb();
  const ok = db !== 'down';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'boostgame',
    env: env.NODE_ENV,
    db,
    time: new Date().toISOString(),
  });
});

/** Readiness: lists secrets that are still missing before a real launch. */
healthRouter.get('/health/ready', (_req, res) => {
  const missing = missingProductionSecrets();
  res.status(missing.length === 0 ? 200 : 503).json({
    ready: missing.length === 0,
    missing,
  });
});
