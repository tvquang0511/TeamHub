import env from './env';

/**
 * Centralized Backend Application Configuration Module.
 * Grouped logically into Database, Redis, Storage (AWS S3 / Supabase / MinIO), Auth, and App.
 */
export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    webUrl: env.APP_WEB_URL,
    corsOrigin: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    activityRetentionDays: env.ACTIVITY_RETENTION_DAYS,
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
    restUrl: env.UPSTASH_REDIS_REST_URL,
    restToken: env.UPSTASH_REDIS_REST_TOKEN,
    cacheEnabled: env.CACHE_ENABLED,
    cachePrefix: env.CACHE_PREFIX,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
    rateLimitPrefix: env.RATE_LIMIT_PREFIX,
  },

  /**
   * S3 Object Storage Configuration.
   * Fully compatible with AWS S3, Cloudflare R2, Supabase Storage, and MinIO.
   */
  storage: {
    provider: env.STORAGE_PROVIDER,
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
    region: env.STORAGE_REGION,
    bucket: env.STORAGE_BUCKET,
    bucketPublic: env.STORAGE_BUCKET_PUBLIC,
  },

  auth: {
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtAccessTtl: env.JWT_ACCESS_TTL,
    jwtRefreshTtl: env.JWT_REFRESH_TTL,
    bcryptRounds: env.BCRYPT_ROUNDS,
    cookieName: env.AUTH_COOKIE_NAME,
    cookieSecure: env.AUTH_COOKIE_SECURE,
    cookieSameSite: env.AUTH_COOKIE_SAME_SITE,
  },
} as const;

export default config;
