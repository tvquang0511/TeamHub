import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/ApiError';

export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  // Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          fields: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      },
    });
  }

  // Our structured errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? {},
      },
    });
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      details: {},
    },
  });
}

