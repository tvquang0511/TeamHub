import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Ensure we always load `backend/.env` regardless of process CWD.
// This makes local dev (running from repo root vs backend/) consistent.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),

  // Redis (BullMQ)
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Cache (Redis)
  CACHE_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Prefix for all Redis cache keys (keep separate from BullMQ keys).
  // Example: "cache:v1"
  CACHE_PREFIX: z.string().min(1).default('cache:v1'),
  CACHE_ANALYTICS_TTL_SEC: z.coerce.number().int().positive().default(600),
  CACHE_MEMBERSHIP_TTL_SEC: z.coerce.number().int().positive().default(60),
  CACHE_BOARD_VIEW_TTL_SEC: z.coerce.number().int().positive().default(120),
  CACHE_CARD_DETAIL_TTL_SEC: z.coerce.number().int().positive().default(60),

  // Cache logging (debug/diagnostics)
  CACHE_LOG_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // 0..1 (e.g. 0.05 = log ~5% of cache ops)
  CACHE_LOG_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.0),
  // Log full Redis keys (may contain IDs). Prefer false in prod.
  CACHE_LOG_KEYS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Rate limiting (Redis)
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  RATE_LIMIT_PREFIX: z.string().min(1).default('rl:v1'),

  // Global API safety net (per IP)
  // NOTE: Feature-level limiters should do the real work; keep this fairly loose.
  RATE_LIMIT_API_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().default(600),

  // Feature-level limiters (prefer scope: user-or-ip after auth)
  RATE_LIMIT_WORKSPACES_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WORKSPACES_MAX: z.coerce.number().int().positive().default(60),

  RATE_LIMIT_INVITES_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_INVITES_MAX: z.coerce.number().int().positive().default(30),

  RATE_LIMIT_BOARDS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_BOARDS_MAX: z.coerce.number().int().positive().default(120),

  // Board view is heavier (board detail payload)
  RATE_LIMIT_BOARD_VIEW_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_BOARD_VIEW_MAX: z.coerce.number().int().positive().default(30),

  // Chat (board messages)
  RATE_LIMIT_CHAT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CHAT_MAX: z.coerce.number().int().positive().default(90),

  RATE_LIMIT_LISTS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LISTS_MAX: z.coerce.number().int().positive().default(120),

  RATE_LIMIT_CARDS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CARDS_MAX: z.coerce.number().int().positive().default(180),

  // Card detail is heavier than list
  RATE_LIMIT_CARD_DETAIL_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CARD_DETAIL_MAX: z.coerce.number().int().positive().default(90),

  RATE_LIMIT_USERS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_USERS_MAX: z.coerce.number().int().positive().default(60),

  // Upload/presign endpoints should be stricter
  RATE_LIMIT_ATTACHMENTS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_ATTACHMENTS_MAX: z.coerce.number().int().positive().default(30),

  RATE_LIMIT_LABELS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LABELS_MAX: z.coerce.number().int().positive().default(90),

  RATE_LIMIT_CHECKLISTS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CHECKLISTS_MAX: z.coerce.number().int().positive().default(90),

  RATE_LIMIT_ASSIGNEES_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_ASSIGNEES_MAX: z.coerce.number().int().positive().default(90),

  RATE_LIMIT_COMMENTS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_COMMENTS_MAX: z.coerce.number().int().positive().default(120),

  RATE_LIMIT_ANALYTICS_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_ANALYTICS_MAX: z.coerce.number().int().positive().default(30),

  // Auth endpoints are more sensitive (per IP)
  RATE_LIMIT_AUTH_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  // Password reset endpoints should be stricter (per IP)
  RATE_LIMIT_PASSWORD_WINDOW_SEC: z.coerce.number().int().positive().default(3600),
  RATE_LIMIT_PASSWORD_MAX: z.coerce.number().int().positive().default(5),

  // CORS
  // Comma-separated list of allowed origins for browser clients.
  // Example: "http://localhost:5173,http://127.0.0.1:5173"
  CORS_ORIGIN: z.string().optional(),

  // If running behind a reverse proxy (Nginx), enable to trust X-Forwarded-For.
  // Required for correct req.ip (rate limiting, audit logging, etc.).
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // Public web URL for links in emails (password reset, etc.)
  // Example: "http://localhost:5173" or "https://app.teamhub.com"
  APP_WEB_URL: z.string().min(1).default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),

  // Auth cookies
  AUTH_COOKIE_NAME: z.string().min(1).default('teamhub_refresh'),
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // MinIO / S3-compatible storage
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_REGION: z.string().min(1).default('us-east-1'),

  // Private bucket for attachments (presigned GET/PUT)
  MINIO_BUCKET: z.string().min(1).default('teamhub'),

  // Public bucket for avatars (browser can GET directly)
  MINIO_BUCKET_PUBLIC: z.string().min(1).default('teamhub-public'),
});

export const env = envSchema.parse(process.env);

export const PORT = env.PORT;
export const DATABASE_URL = env.DATABASE_URL;
export const REDIS_URL = env.REDIS_URL;

export default env;

