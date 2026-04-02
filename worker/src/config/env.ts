import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // MinIO / S3-compatible storage (for blob cleanup jobs)
  MINIO_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().min(1).default('teamhub'),
  MINIO_SECRET_KEY: z.string().min(1).default('teamhub-secret'),
  MINIO_BUCKET: z.string().min(1).default('teamhub'),
  MINIO_BUCKET_PUBLIC: z.string().min(1).default('teamhub-public'),

  // Cache key prefix (shared with backend). Default matches backend.
  CACHE_PREFIX: z.string().min(1).default('cache:v1'),

  // SMTP (email reminders)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Formatting
  APP_TIMEZONE: z.string().min(1).default('Asia/Ho_Chi_Minh'),
  ACTIVITY_RETENTION_DAYS: z.coerce.number().int().positive().optional(),

  // Blob sweeper
  BLOB_SWEEP_ORPHAN_GRACE_DAYS: z.coerce.number().int().positive().default(7),
  // Unlinked chat attachments older than this will be deleted.
  BLOB_SWEEP_CHAT_UNLINKED_HOURS: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);

export default env;
