import IORedis from "ioredis";

import env from "../../config/env";

let _redis: IORedis | null = null;

function getRedis(): IORedis {
  if (_redis) return _redis;

  _redis = new IORedis(env.REDIS_URL, {
    // Recommended for BullMQ usage; also avoids offline queue issues.
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  _redis.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[cache] redis error:", err);
  });

  return _redis;
}

export function getCacheRedis(): IORedis {
  return getRedis();
}

const NONE_SENTINEL = "__none__";

function normalizePrefix(prefix: string) {
  return prefix.endsWith(":") ? prefix.slice(0, -1) : prefix;
}

export function cachePrefix() {
  return normalizePrefix(env.CACHE_PREFIX);
}

export function cacheKey(...parts: string[]) {
  return `${cachePrefix()}:${parts.join(":")}`;
}

function shouldLog() {
  if (!env.CACHE_LOG_ENABLED) return false;
  const rate = env.CACHE_LOG_SAMPLE_RATE;
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

function formatKey(key: string) {
  if (env.CACHE_LOG_KEYS) return key;
  if (key.length <= 80) return key;
  return `${key.slice(0, 80)}…`;
}

function cacheLog(event: string, key: string, details?: string) {
  if (!shouldLog()) return;
  // eslint-disable-next-line no-console
  console.log(`[cache] ${event} ${formatKey(key)}${details ? ` ${details}` : ""}`);
}

export async function cacheGetString(key: string): Promise<string | null> {
  if (!env.CACHE_ENABLED) return null;
  try {
    const v = await getRedis().get(key);
    cacheLog(v === null ? "MISS" : "HIT", key);
    return v;
  } catch {
    cacheLog("ERR_GET", key);
    return null;
  }
}

export async function cacheSetString(key: string, value: string, ttlSec: number): Promise<void> {
  if (!env.CACHE_ENABLED) return;
  try {
    await getRedis().set(key, value, "EX", ttlSec);
    cacheLog("SET", key, `ttl=${ttlSec}`);
  } catch {
    cacheLog("ERR_SET", key);
    // ignore cache failures
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!env.CACHE_ENABLED) return;
  try {
    // UNLINK is non-blocking in Redis; fall back to DEL if not supported.
    // ioredis supports both.
    await (getRedis() as any).unlink(key);
    cacheLog("DEL", key);
  } catch {
    try {
      await getRedis().del(key);
      cacheLog("DEL", key);
    } catch {
      cacheLog("ERR_DEL", key);
      // ignore cache failures
    }
  }
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGetString(key);
  if (!raw) return null;
  if (raw === NONE_SENTINEL) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    cacheLog("ERR_PARSE", key);
    return null;
  }
}

export async function cacheGetJsonNullable<T>(
  key: string,
): Promise<{ hit: boolean; value: T | null }> {
  const raw = await cacheGetString(key);
  if (raw === null) return { hit: false, value: null };
  if (raw === NONE_SENTINEL) return { hit: true, value: null };

  try {
    return { hit: true, value: JSON.parse(raw) as T };
  } catch {
    cacheLog("ERR_PARSE", key);
    return { hit: false, value: null };
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (value === null || value === undefined) {
    await cacheSetString(key, NONE_SENTINEL, ttlSec);
    return;
  }

  await cacheSetString(key, JSON.stringify(value), ttlSec);
}

export function boardCacheVersionKey(boardId: string) {
  return cacheKey("board", boardId, "ver");
}

export function analyticsCacheVersionKey(boardId: string) {
  return cacheKey("analytics", "board", boardId, "ver");
}

export async function getBoardCacheVersion(boardId: string): Promise<number> {
  if (!env.CACHE_ENABLED) return 0;
  const key = boardCacheVersionKey(boardId);

  try {
    const raw = await getRedis().get(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function bumpBoardCacheVersion(boardId: string): Promise<number> {
  if (!env.CACHE_ENABLED) return 0;
  const key = boardCacheVersionKey(boardId);

  try {
    return await getRedis().incr(key);
  } catch {
    return 0;
  }
}

export async function getAnalyticsCacheVersion(boardId: string): Promise<number> {
  if (!env.CACHE_ENABLED) return 0;
  const key = analyticsCacheVersionKey(boardId);

  try {
    const raw = await getRedis().get(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function bumpAnalyticsCacheVersion(boardId: string): Promise<number> {
  if (!env.CACHE_ENABLED) return 0;
  const key = analyticsCacheVersionKey(boardId);

  try {
    return await getRedis().incr(key);
  } catch {
    return 0;
  }
}
