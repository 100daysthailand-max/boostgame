import { Router } from 'express';
import type { Db } from '../db/types.js';
import { getMeView } from '../repositories/player.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';

/** GET /api/me - authenticated player profile (spec 02 section 12). */
export function meRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  router.get(
    '/me',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const view = await getMeView(db, req.auth.userId);
      if (!view) throw new HttpError(404, 'not_found');
      res.json(view);
    }),
  );

  return router;
}
