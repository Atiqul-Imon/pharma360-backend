import { Buffer } from 'node:buffer';
import { redisManager } from '../../database/redis.js';
import { CacheKeys } from '../types/index.js';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
}

export interface SwrFetchOptions<T> {
  ttlSeconds: number;
  staleSeconds?: number;
  tenantId: string;
  tag: string;
  onFreshData?: (data: T) => void;
}

export interface SwrFetchResult<T> {
  data: T;
  fromCache: boolean;
  isRevalidating: boolean;
}

type Fetcher<T> = () => Promise<T>;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `{${entries.map(([key, val]) => `"${key}":${stableStringify(val)}`).join(',')}}`;
}

export function buildCacheHash(input: Record<string, unknown>): string {
  const serialized = stableStringify(input);
  return Buffer.from(serialized).toString('base64url');
}

async function recordMetric(tenantId: string, tag: string, metric: string): Promise<void> {
  try {
    await redisManager.incr(CacheKeys.CACHE_STATS(tenantId, `${tag}:${metric}`));
  } catch (error) {
    console.warn('[cache] Unable to record cache metric', { tenantId, tag, metric, error });
  }
}

export async function swrFetch<T>(
  cacheKey: string,
  fetcher: Fetcher<T>,
  options: SwrFetchOptions<T>
): Promise<SwrFetchResult<T>> {
  const { ttlSeconds, staleSeconds = Math.floor(ttlSeconds / 2), tenantId, tag, onFreshData } =
    options;

  const envelope = await redisManager.get<CacheEnvelope<T>>(cacheKey);

  if (envelope && envelope.data !== undefined) {
    const ageMs = Date.now() - envelope.cachedAt;
    const isStale = staleSeconds > 0 ? ageMs > staleSeconds * 1000 : false;

    await recordMetric(tenantId, tag, 'hit');

    if (!isStale) {
      return { data: envelope.data, fromCache: true, isRevalidating: false };
    }

    void (async () => {
      try {
        const freshData = await fetcher();
        const payload: CacheEnvelope<T> = { data: freshData, cachedAt: Date.now() };
        await redisManager.set(cacheKey, payload, ttlSeconds);
        await recordMetric(tenantId, tag, 'refresh');
        onFreshData?.(freshData);
      } catch (error) {
        console.error('[cache] Failed to refresh stale cache', { cacheKey, tag, error });
      }
    })();

    return { data: envelope.data, fromCache: true, isRevalidating: true };
  }

  await recordMetric(tenantId, tag, 'miss');
  const freshData = await fetcher();
  const payload: CacheEnvelope<T> = { data: freshData, cachedAt: Date.now() };
  await redisManager.set(cacheKey, payload, ttlSeconds);
  onFreshData?.(freshData);

  return { data: freshData, fromCache: false, isRevalidating: false };
}

export async function invalidateCacheByPattern(patterns: string[]): Promise<void> {
  await Promise.all(
    patterns.map(async (pattern) => {
      try {
        await redisManager.delPattern(pattern);
      } catch (error) {
        console.error('[cache] Failed to invalidate pattern', { pattern, error });
      }
    })
  );
}

