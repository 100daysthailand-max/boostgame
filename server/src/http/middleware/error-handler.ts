import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../../logger.js';

/** Error carrying an HTTP status and a stable machine code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'HttpError';
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  const code = err instanceof HttpError ? err.code : 'internal_error';
  if (status >= 500) {
    logger.error({ err }, 'unhandled request error');
  }
  res.status(status).json({ error: code });
};
