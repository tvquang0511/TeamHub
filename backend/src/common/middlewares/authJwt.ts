import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../errors/ApiError';

export type AuthUser = {
  id: string;
  email?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authJwt(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'AUTH_TOKEN_INVALID', 'Missing access token'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email?: string };
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (e: any) {
    if (e?.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'AUTH_TOKEN_EXPIRED', 'Access token expired'));
    }
    return next(new ApiError(401, 'AUTH_TOKEN_INVALID', 'Access token invalid'));
  }
}
