/**
 * Shared infrastructure for ALL external API Edge Functions.
 *
 * Provides:
 * - In-memory cache with configurable TTL per API
 * - Retry with exponential backoff (max 3, backoff 1s/2s/4s, handles 429 + 5xx)
 * - Rate limit tracking (counter per API, daily reset)
 * - Standardized response format
 *
 * @example
 *   import { fetchExternalApi } from '../_shared/external-api.ts';
 *   import type { ExternalApiConfig, ExternalApiResponse } from '../_shared/external-api.ts';
 *
 *   const config: ExternalApiConfig = {
 *     name: 'holidays',
 *     baseUrl: 'https://date.nager.at/api/v3',
 *     cacheTtlSeconds: 2592000, // 30 days
 *     maxRetries: 2,
 *   };
 *
 *   const result = await fetchExternalApi<HolidayData[]>(config, `/PublicHolidays/2026/BR`);
 */

const TAG = '[external-api]';

// ============================================================================
// TYPES
// ============================================================================

export interface ExternalApiConfig {
  name: string;
  baseUrl: string;
  cacheTtlSeconds: number;
  maxRetries: number;
  rateLimitPerDay?: number;
}

export interface ExternalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cached: boolean;
  latencyMs: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ============================================================================
// IN-MEMORY CACHE (per-isolate, cleared on cold start)
// ============================================================================

const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // Evict stale entries periodically (keep cache bounded)
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
}

// ============================================================================
// RATE LIMIT TRACKING (per-isolate, daily reset)
// ============================================================================

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(apiName: string, limit?: number): boolean {
  if (!limit) return true; // No limit configured

  const now = Date.now();
  const entry = rateLimits.get(apiName);

  if (!entry || now > entry.resetAt) {
    // Start a new day window
    rateLimits.set(apiName, {
      count: 1,
      resetAt: now + 86400000, // 24 hours
    });
    return true;
  }

  if (entry.count >= limit) {
    console.warn(TAG, `Rate limit reached for ${apiName}: ${entry.count}/${limit} per day`);
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

/**
 * Fetch from an external API with caching, retry, and rate limiting.
 *
 * @param config - API configuration (name, baseUrl, cache TTL, retries, rate limit)
 * @param path - URL path appended to baseUrl (e.g., `/PublicHolidays/2026/BR`)
 * @param options - Optional overrides for caching and request init
 * @returns Standardized response with `success`, `data`, `cached`, `latencyMs`
 */
export async function fetchExternalApi<T>(
  config: ExternalApiConfig,
  path: string,
  options?: {
    cacheKey?: string;
    skipCache?: boolean;
    init?: RequestInit;
  },
): Promise<ExternalApiResponse<T>> {
  const startTime = Date.now();
  const cacheKey = options?.cacheKey || `${config.name}:${path}`;

  // 1. Check in-memory cache
  if (!options?.skipCache) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) {
      return {
        success: true,
        data: cached,
        source: config.name,
        cached: true,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // 2. Check rate limit
  if (!checkRateLimit(config.name, config.rateLimitPerDay)) {
    return {
      success: false,
      error: `Rate limit exceeded for ${config.name} (${config.rateLimitPerDay}/day)`,
      source: config.name,
      cached: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // 3. Fetch with retry + exponential backoff
  const url = `${config.baseUrl}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(TAG, `Retry ${attempt}/${config.maxRetries} for ${config.name} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }

      const response = await fetch(url, options?.init);

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < config.maxRetries) {
          lastError = new Error(`${config.name} API error: ${response.status} ${response.statusText}`);
          continue;
        }
        // Non-retryable error or out of retries
        const errorBody = await response.text().catch(() => '');
        return {
          success: false,
          error: `${config.name} API error: ${response.status} ${response.statusText}${errorBody ? ` — ${errorBody.substring(0, 200)}` : ''}`,
          source: config.name,
          cached: false,
          latencyMs: Date.now() - startTime,
        };
      }

      const data = (await response.json()) as T;

      // 4. Cache the result
      setCache(cacheKey, data, config.cacheTtlSeconds);

      return {
        success: true,
        data,
        source: config.name,
        cached: false,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < config.maxRetries) continue;
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError?.message || `${config.name} request failed after ${config.maxRetries + 1} attempts`,
    source: config.name,
    cached: false,
    latencyMs: Date.now() - startTime,
  };
}
