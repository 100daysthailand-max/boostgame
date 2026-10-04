import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { isFeatureEnabled } from '../services/game-config.js';
import { SEASON } from '../config/constants.js';

export function rankRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/rank/weekly - Weekly leaderboards
   */
  router.get(
    '/rank/weekly',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const weeklyEnabled = await isFeatureEnabled(db, 'WEEKLY_REWARD');
      if (!weeklyEnabled) throw new HttpError(403, 'weekly_reward_disabled');

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
      weekStart.setUTCHours(0, 0, 0, 0);

      const boards = ['COIN', 'XP', 'QUEST'] as const;

      const results = await Promise.all(
        boards.map(async (board) => {
          const top = await db.query(
            `SELECT ws.score, u.username, u.first_name
             FROM weekly_scores ws
             JOIN users u ON u.id = ws.user_id
             WHERE ws.week_start = $1 AND ws.board = $2
             ORDER BY ws.score DESC LIMIT 10`,
            [weekStart.toISOString().split('T')[0], board],
          );

          const myRank = await db.query(
            `SELECT score FROM weekly_scores WHERE user_id = $1 AND week_start = $2 AND board = $3`,
            [userId, weekStart.toISOString().split('T')[0], board],
          );

          return {
            board,
            top: top.rows.map((r, i) => ({
              rank: i + 1,
              score: Number(r.score),
              username: r.username,
              firstName: r.first_name,
            })),
            myScore: Number(myRank.rows[0]?.score ?? 0),
          };
        }),
      );

      res.json({ weekStart: weekStart.toISOString(), boards: results });
    }),
  );

  /**
   * GET /api/rank/season - Season leaderboards
   */
  router.get(
    '/rank/season',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const seasonEnabled = await isFeatureEnabled(db, 'SEASON_REWARD');
      if (!seasonEnabled) throw new HttpError(403, 'season_reward_disabled');

      const season = await db.query(
        `SELECT id, number, starts_at, ends_at, economy_supply, status
         FROM seasons WHERE status = 'ACTIVE' ORDER BY number DESC LIMIT 1`,
      );
      if (season.rows.length === 0) {
        res.json({ active: false });
        return;
      }

      const seasonRow = season.rows[0];
      const boards = ['COIN', 'XP', 'QUEST'] as const;

      const results = await Promise.all(
        boards.map(async (board) => {
          const top = await db.query(
            `SELECT ss.score, u.username, u.first_name
             FROM season_scores ss
             JOIN users u ON u.id = ss.user_id
             WHERE ss.season_id = $1 AND ss.board = $2
             ORDER BY ss.score DESC LIMIT 10`,
            [seasonRow.id, board],
          );

          const myRank = await db.query(
            `SELECT score FROM season_scores WHERE user_id = $1 AND season_id = $2 AND board = $3`,
            [userId, seasonRow.id, board],
          );

          return {
            board,
            top: top.rows.map((r, i) => ({
              rank: i + 1,
              score: Number(r.score),
              username: r.username,
              firstName: r.first_name,
            })),
            myScore: Number(myRank.rows[0]?.score ?? 0),
          };
        }),
      );

      res.json({
        active: true,
        season: {
          id: seasonRow.id,
          number: seasonRow.number,
          startsAt: seasonRow.starts_at,
          endsAt: seasonRow.ends_at,
          economySupply: Number(seasonRow.economy_supply),
          status: seasonRow.status,
        },
        boards: results,
      });
    }),
  );

  return router;
}