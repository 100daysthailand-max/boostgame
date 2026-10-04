import type { RequestHandler } from 'express';

/** Forwards async rejections to the Express error handler (Express 4 does not). */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
