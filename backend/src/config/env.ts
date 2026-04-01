import 'dotenv/config';
import { z } from 'zod';

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

  // CORS
  // Comma-separated list of allowed origins for browser clients.
  // Example: "http://localhost:5173,http://127.0.0.1:5173"
  CORS_ORIGIN: z.string().optional(),

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

