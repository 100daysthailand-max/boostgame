import pino from 'pino';
import { env, isProduction } from './config/env.js';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: { service: 'boostgame', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});
