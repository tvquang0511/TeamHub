import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Storage / MinIO / S3
  STORAGE_PROVIDER: z.enum(['s3', 'minio', 'cloudflare_r2', 'supabase']).optional().default('minio'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_BUCKET_PUBLIC: z.string().optional(),
  STORAGE_REGION: z.string().optional(),

  // Legacy MinIO aliases
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  MINIO_BUCKET_PUBLIC: z.string().optional(),

  CACHE_PREFIX: z.string().min(1).default('cache:v1'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  APP_TIMEZONE: z.string().min(1).default('Asia/Ho_Chi_Minh'),
  ACTIVITY_RETENTION_DAYS: z.coerce.number().int().positive().optional(),

  BLOB_SWEEP_ORPHAN_GRACE_DAYS: z.coerce.number().int().positive().default(7),
  BLOB_SWEEP_CHAT_UNLINKED_HOURS: z.coerce.number().int().positive().default(24),
});

const parsedEnv = envSchema.parse(process.env);

const resolvedStorageEndpoint = parsedEnv.STORAGE_ENDPOINT || parsedEnv.MINIO_ENDPOINT || 'http://localhost:9000';
const resolvedStorageAccessKey = parsedEnv.STORAGE_ACCESS_KEY || parsedEnv.MINIO_ACCESS_KEY || 'teamhub';
const resolvedStorageSecretKey = parsedEnv.STORAGE_SECRET_KEY || parsedEnv.MINIO_SECRET_KEY || 'teamhub-secret';
const resolvedStorageBucket = parsedEnv.STORAGE_BUCKET || parsedEnv.MINIO_BUCKET || 'teamhub';
const resolvedStorageBucketPublic = parsedEnv.STORAGE_BUCKET_PUBLIC || parsedEnv.MINIO_BUCKET_PUBLIC || 'teamhub-public';

export const env = {
  ...parsedEnv,
  STORAGE_ENDPOINT: resolvedStorageEndpoint,
  STORAGE_ACCESS_KEY: resolvedStorageAccessKey,
  STORAGE_SECRET_KEY: resolvedStorageSecretKey,
  STORAGE_BUCKET: resolvedStorageBucket,
  STORAGE_BUCKET_PUBLIC: resolvedStorageBucketPublic,
  MINIO_ENDPOINT: resolvedStorageEndpoint,
  MINIO_ACCESS_KEY: resolvedStorageAccessKey,
  MINIO_SECRET_KEY: resolvedStorageSecretKey,
  MINIO_BUCKET: resolvedStorageBucket,
  MINIO_BUCKET_PUBLIC: resolvedStorageBucketPublic,
};

export default env;
