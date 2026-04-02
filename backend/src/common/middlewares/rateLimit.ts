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

// Feature-level limiters (apply after authJwt so scope user-or-ip can use req.user).
export const workspacesRateLimit = rateLimit({
  name: "workspaces",
  windowSec: env.RATE_LIMIT_WORKSPACES_WINDOW_SEC,
  max: env.RATE_LIMIT_WORKSPACES_MAX,
  scope: "user-or-ip",
});

export const invitesRateLimit = rateLimit({
  name: "invites",
  windowSec: env.RATE_LIMIT_INVITES_WINDOW_SEC,
  max: env.RATE_LIMIT_INVITES_MAX,
  scope: "user-or-ip",
});

export const boardsRateLimit = rateLimit({
  name: "boards",
  windowSec: env.RATE_LIMIT_BOARDS_WINDOW_SEC,
  max: env.RATE_LIMIT_BOARDS_MAX,
  scope: "user-or-ip",
});

export const boardViewRateLimit = rateLimit({
  name: "board_view",
  windowSec: env.RATE_LIMIT_BOARD_VIEW_WINDOW_SEC,
  max: env.RATE_LIMIT_BOARD_VIEW_MAX,
  scope: "user-or-ip",
});

export const chatRateLimit = rateLimit({
  name: "chat",
  windowSec: env.RATE_LIMIT_CHAT_WINDOW_SEC,
  max: env.RATE_LIMIT_CHAT_MAX,
  scope: "user-or-ip",
});

export const listsRateLimit = rateLimit({
  name: "lists",
  windowSec: env.RATE_LIMIT_LISTS_WINDOW_SEC,
  max: env.RATE_LIMIT_LISTS_MAX,
  scope: "user-or-ip",
});

export const cardsRateLimit = rateLimit({
  name: "cards",
  windowSec: env.RATE_LIMIT_CARDS_WINDOW_SEC,
  max: env.RATE_LIMIT_CARDS_MAX,
  scope: "user-or-ip",
});

export const cardDetailRateLimit = rateLimit({
  name: "card_detail",
  windowSec: env.RATE_LIMIT_CARD_DETAIL_WINDOW_SEC,
  max: env.RATE_LIMIT_CARD_DETAIL_MAX,
  scope: "user-or-ip",
});

export const usersRateLimit = rateLimit({
  name: "users",
  windowSec: env.RATE_LIMIT_USERS_WINDOW_SEC,
  max: env.RATE_LIMIT_USERS_MAX,
  scope: "user-or-ip",
});

export const attachmentsRateLimit = rateLimit({
  name: "attachments",
  windowSec: env.RATE_LIMIT_ATTACHMENTS_WINDOW_SEC,
  max: env.RATE_LIMIT_ATTACHMENTS_MAX,
  scope: "user-or-ip",
});

export const labelsRateLimit = rateLimit({
  name: "labels",
  windowSec: env.RATE_LIMIT_LABELS_WINDOW_SEC,
  max: env.RATE_LIMIT_LABELS_MAX,
  scope: "user-or-ip",
});

export const checklistsRateLimit = rateLimit({
  name: "checklists",
  windowSec: env.RATE_LIMIT_CHECKLISTS_WINDOW_SEC,
  max: env.RATE_LIMIT_CHECKLISTS_MAX,
  scope: "user-or-ip",
});

export const assigneesRateLimit = rateLimit({
  name: "assignees",
  windowSec: env.RATE_LIMIT_ASSIGNEES_WINDOW_SEC,
  max: env.RATE_LIMIT_ASSIGNEES_MAX,
  scope: "user-or-ip",
});

export const commentsRateLimit = rateLimit({
  name: "comments",
  windowSec: env.RATE_LIMIT_COMMENTS_WINDOW_SEC,
  max: env.RATE_LIMIT_COMMENTS_MAX,
  scope: "user-or-ip",
});

export const analyticsRateLimit = rateLimit({
  name: "analytics",
  windowSec: env.RATE_LIMIT_ANALYTICS_WINDOW_SEC,
  max: env.RATE_LIMIT_ANALYTICS_MAX,
  scope: "user-or-ip",
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
