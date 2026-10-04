import type { AuthContext } from '../repositories/sessions.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      sessionId?: string;
    }
  }
}

export {};
