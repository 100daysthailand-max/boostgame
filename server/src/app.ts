import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { env } from './config/env.js';
import { getDb, type Db } from './db/index.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { meRouter } from './routes/me.routes.js';
import { gameRouter } from './routes/game.routes.js';
import { upgradesRouter } from './routes/upgrades.routes.js';
import { boostsRouter } from './routes/boosts.routes.js';
import { minerRouter } from './routes/miner.routes.js';
import { skinsRouter } from './routes/skins.routes.js';
import { questsRouter } from './routes/quests.routes.js';
import { dailyGateRouter } from './routes/daily-gate.routes.js';
import { adsRouter } from './routes/ads.routes.js';
import { walletRouter } from './routes/wallet.routes.js';
import { referralRouter } from './routes/referral.routes.js';
import { rankRouter } from './routes/rank.routes.js';
import { ticketsRouter } from './routes/tickets.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './http/middleware/error-handler.js';

export interface AppOptions {
  /** Database port; defaults to the Postgres pool when DATABASE_URL is set. */
  db?: Db | null;
  /** Bot token used for initData validation; defaults to TELEGRAM_BOT_TOKEN. */
  botToken?: string | undefined;
}

/**
 * Builds the Express application. Kept separate from server bootstrap so tests can
 * inject a database and bot token without opening a socket.
 */
export function createApp(options: AppOptions = {}): Express {
  const db = options.db === undefined ? getDb() : options.db;
  const botToken = options.botToken ?? env.TELEGRAM_BOT_TOKEN;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/api', healthRouter);
  app.use('/api', authRouter(db, botToken));
  app.use('/api', meRouter(db));
  app.use('/api', gameRouter(db));
  app.use('/api', upgradesRouter(db));
  app.use('/api', boostsRouter(db));
  app.use('/api', minerRouter(db));
  app.use('/api', skinsRouter(db));
  app.use('/api', questsRouter(db));
  app.use('/api', dailyGateRouter(db));
  app.use('/api', adsRouter(db));
  app.use('/api', walletRouter(db));
  app.use('/api', referralRouter(db));
  app.use('/api', rankRouter(db));
  app.use('/api', ticketsRouter(db));
  app.use('/panel/admin', adminRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

