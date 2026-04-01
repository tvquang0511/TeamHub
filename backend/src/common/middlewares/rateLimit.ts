import type { NextFunction, Request, Response } from "express";

import env from "../../config/env";
import { getCacheRedis } from "../../integrations/cache/redisCache";

type RateLimitOptions = {
  name: string;
  windowSec: number;
  max: number;
  scope?: "ip" | "user" | "user-or-ip";
};

function normalizePrefix(prefix: string) {
  return prefix.endsWith(":") ? prefix.slice(0, -1) : prefix;
}

function rateLimitKey(name: string, identity: string, windowStartSec: number) {
  const prefix = normalizePrefix(env.RATE_LIMIT_PREFIX);
  return `${prefix}:${name}:${identity}:${windowStartSec}`;
}

function getIdentity(req: Request, scope: RateLimitOptions["scope"]) {
  if (scope === "user" || scope === "user-or-ip") {
    const userId = req.user?.id;
    if (userId) return `u:${userId}`;
    if (scope === "user") return "u:anon";
  }

  // Express' req.ip respects trust proxy setting; if not set, it uses remoteAddress.
  // Keep it simple for this project.
  return `ip:${req.ip}`;
}

export function rateLimit(options: RateLimitOptions) {
  const scope = options.scope ?? "ip";

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!env.RATE_LIMIT_ENABLED) return next();

    const nowSec = Math.floor(Date.now() / 1000);
    const windowStartSec = nowSec - (nowSec % options.windowSec);
    const identity = getIdentity(req, scope);
    const key = rateLimitKey(options.name, identity, windowStartSec);

    try {
      const redis = getCacheRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        // Ensure key expires slightly after the window.
        await redis.expire(key, options.windowSec + 1);
      }

      const remaining = Math.max(0, options.max - count);
      const resetSec = windowStartSec + options.windowSec;
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(resetSec));

      if (count > options.max) {
        const retryAfter = options.windowSec - (nowSec - windowStartSec);
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            details: {
              retryAfterSec: retryAfter,
            },
          },
        });
      }

      return next();
    } catch {
      // Fail-open: if Redis is down, do not break API.
      return next();
    }
  };
}

export const apiRateLimit = rateLimit({
  name: "api",
  windowSec: env.RATE_LIMIT_API_WINDOW_SEC,
  max: env.RATE_LIMIT_API_MAX,
  scope: "ip",
});

export const authRateLimit = rateLimit({
  name: "auth",
  windowSec: env.RATE_LIMIT_AUTH_WINDOW_SEC,
  max: env.RATE_LIMIT_AUTH_MAX,
  scope: "ip",
});

export const passwordRateLimit = rateLimit({
  name: "password",
  windowSec: env.RATE_LIMIT_PASSWORD_WINDOW_SEC,
  max: env.RATE_LIMIT_PASSWORD_MAX,
  scope: "ip",
});
