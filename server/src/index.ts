import { createApp } from './app.js';
import { env, isProduction, missingProductionSecrets } from './config/env.js';
import { logger } from './logger.js';
import { closePool } from './db/pool.js';

async function main(): Promise<void> {
  const app = createApp();

  if (isProduction) {
    const missing = missingProductionSecrets();
    if (missing.length > 0) {
      logger.warn({ missing }, 'production is missing required secrets; server is degraded');
    }
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'boostgame api listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'fatal boot error');
  process.exit(1);
});
