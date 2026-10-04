import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/types.js';
import { requireAuth } from '../http/middleware/auth.js';
import { HttpError } from '../http/middleware/error-handler.js';
import { asyncHandler } from '../http/middleware/async-handler.js';
import { isFeatureEnabled } from '../services/game-config.js';

const createTicketSchema = z.object({
  category: z.enum(['ACCOUNT_VPN', 'REFERRAL', 'BUG', 'PAYMENT_WALLET', 'OTHER']),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional(),
});

const replyTicketSchema = z.object({
  body: z.string().min(1).max(5000),
});

export function ticketsRouter(db: Db | null): Router {
  const router = Router();
  const auth = requireAuth(db);

  /**
   * GET /api/tickets - List user tickets
   */
  router.get(
    '/tickets',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const tickets = await db.query(
        `SELECT id, category, title, description, image_url, status, created_at, updated_at
         FROM tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [userId],
      );

      res.json({ tickets: tickets.rows });
    }),
  );

  /**
   * GET /api/tickets/:id - Get ticket with messages
   */
  router.get(
    '/tickets/:id',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;
      const ticketId = req.params.id;

      const ticket = await db.query(
        `SELECT id, category, title, description, image_url, status, created_at, updated_at
         FROM tickets WHERE id = $1 AND user_id = $2`,
        [ticketId, userId],
      );
      if (ticket.rows.length === 0) throw new HttpError(404, 'ticket_not_found');

      const messages = await db.query(
        `SELECT id, author_role, body, created_at
         FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at`,
        [ticketId],
      );

      res.json({
        ticket: ticket.rows[0],
        messages: messages.rows,
      });
    }),
  );

  /**
   * POST /api/tickets - Create a ticket
   */
  router.post(
    '/tickets',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;

      const { category, title, description, imageUrl } = createTicketSchema.parse(req.body);

      const result = await db.query(
        `INSERT INTO tickets (user_id, category, title, description, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [userId, category, title, description, imageUrl ?? null],
      );

      res.json({ success: true, ticketId: result.rows[0].id, createdAt: result.rows[0].created_at });
    }),
  );

  /**
   * POST /api/tickets/:id/reply - Reply to a ticket (player)
   */
  router.post(
    '/tickets/:id/reply',
    auth,
    asyncHandler(async (req, res) => {
      if (!db || !req.auth) throw new HttpError(503, 'database_unavailable');
      const userId = req.auth.userId;
      const ticketId = req.params.id;

      const { body } = replyTicketSchema.parse(req.body);

      const ticket = await db.query(
        `SELECT status FROM tickets WHERE id = $1 AND user_id = $2`,
        [ticketId, userId],
      );
      if (ticket.rows.length === 0) throw new HttpError(404, 'ticket_not_found');
      if (ticket.rows[0].status === 'CLOSED') throw new HttpError(400, 'ticket_closed');

      await db.query(
        `INSERT INTO ticket_messages (ticket_id, author_role, body) VALUES ($1, 'PLAYER', $2)`,
        [ticketId, body],
      );

      await db.query(
        `UPDATE tickets SET status = 'OPEN', updated_at = now() WHERE id = $1`,
        [ticketId],
      );

      res.json({ success: true });
    }),
  );

  return router;
}