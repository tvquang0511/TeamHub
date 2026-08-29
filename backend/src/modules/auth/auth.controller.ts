import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { env } from '../../config/env';
import { authJwt } from '../../common/middlewares/authJwt';

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

function setRefreshCookie(res: Response, refreshToken: string) {
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const isProduction = env.NODE_ENV === 'production';
  const secure = isProduction ? true : env.AUTH_COOKIE_SECURE;
  const sameSite = isProduction ? 'none' : (env.AUTH_COOKIE_SAME_SITE as any);

  res.cookie(env.AUTH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res: Response) {
  const isProduction = env.NODE_ENV === 'production';
  const secure = isProduction ? true : env.AUTH_COOKIE_SECURE;
  const sameSite = isProduction ? 'none' : (env.AUTH_COOKIE_SAME_SITE as any);

  res.clearCookie(env.AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  });
}

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  // Very small cookie parser: "a=b; c=d" => map
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    if (k === name) {
      const raw = rest.join('=');
      return raw ? decodeURIComponent(raw) : undefined;
    }
  }
  return undefined;
}

export const register = async (req: Request, res: Response) => {
  const input = registerBodySchema.parse(req.body);
  const result = await authService.register(input);

  return res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const input = loginBodySchema.parse(req.body);
  const result = await authService.login(input);

  // Set refresh token as httpOnly cookie (preferred)
  setRefreshCookie(res, result.refreshToken);

  // Do not return refreshToken in body
  return res.json({ accessToken: result.accessToken, user: result.user });
};

export const refresh = async (req: Request, res: Response) => {
  const cookieToken = getCookie(req, env.AUTH_COOKIE_NAME);

  // Backward compatible: allow body.refreshToken if cookie missing
  const bodyToken = (() => {
    try {
      return refreshBodySchema.parse(req.body).refreshToken;
    } catch {
      return undefined;
    }
  })();

  const refreshToken = cookieToken ?? bodyToken;
  if (!refreshToken) {
    return res.status(401).json({
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Refresh token missing',
        details: {},
      },
    });
  }

  const result = await authService.refresh({ refreshToken });
  setRefreshCookie(res, result.refreshToken);
  return res.json({ accessToken: result.accessToken, user: result.user });
};

export const logout = async (req: Request, res: Response) => {
  const cookieToken = getCookie(req, env.AUTH_COOKIE_NAME);

  const bodyToken = (() => {
    try {
      return refreshBodySchema.parse(req.body).refreshToken;
    } catch {
      return undefined;
    }
  })();

  const refreshToken = cookieToken ?? bodyToken;
  if (refreshToken) {
    await authService.logout({ refreshToken });
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
};

export const me = async (req: Request, res: Response) => {
  // authJwt middleware is applied in router
  const result = await authService.me(req.user!.id);
  return res.json(result.user);
};

export const forgotPassword = async (req: Request, res: Response) => {
  const input = forgotPasswordBodySchema.parse(req.body);

  await authService.forgotPassword({
    email: input.email,
    requestedIp: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ ok: true });
};

export const resetPassword = async (req: Request, res: Response) => {
  const input = resetPasswordBodySchema.parse(req.body);
  const result = await authService.resetPassword(input);
  return res.json(result);
};

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const verifyEmail = async (req: Request, res: Response) => {
  const input = verifyEmailSchema.parse(req.body);
  const result = await authService.verifyEmail(input);
  return res.json(result);
};

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const resendVerificationEmail = async (req: Request, res: Response) => {
  const input = resendVerificationSchema.parse(req.body);
  const result = await authService.resendVerificationEmail(input);
  return res.json(result);
};
