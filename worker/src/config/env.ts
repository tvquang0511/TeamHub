import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

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
});

export const env = envSchema.parse(process.env);

export default env;
