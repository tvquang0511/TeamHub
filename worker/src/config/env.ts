import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // Storage / MinIO / S3
  STORAGE_PROVIDER: z.enum(['s3', 'minio', 'cloudflare_r2', 'supabase']).default('minio'),
  STORAGE_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  STORAGE_ACCESS_KEY: z.string().min(1).default('teamhub'),
  STORAGE_SECRET_KEY: z.string().min(1).default('teamhub-secret'),
  STORAGE_BUCKET: z.string().min(1).default('teamhub'),
  STORAGE_BUCKET_PUBLIC: z.string().min(1).default('teamhub-public'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),

  CACHE_PREFIX: z.string().min(1).default('cache:v1'),

  // Resend / Brevo / Mailtrap HTTP APIs (Port 443 - Gửi email không bao giờ bị Cloud chặn)
  RESEND_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  MAILTRAP_TOKEN: z.string().optional(),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().default('tvquang.working@gmail.com'),
  SMTP_PASS: z.string().default('hucy mzlr zwzq mvqr'),
  SMTP_FROM: z.string().default('TeamHub <tvquang.working@gmail.com>'),

  APP_TIMEZONE: z.string().min(1).default('Asia/Ho_Chi_Minh'),
  ACTIVITY_RETENTION_DAYS: z.coerce.number().int().positive().optional(),

  BLOB_SWEEP_ORPHAN_GRACE_DAYS: z.coerce.number().int().positive().default(7),
  BLOB_SWEEP_CHAT_UNLINKED_HOURS: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);

export default env;
