import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
});

export const env = envSchema.parse(process.env);

export const PORT = env.PORT;
export const DATABASE_URL = env.DATABASE_URL;

export default env;

