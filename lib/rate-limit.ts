import { ApiError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export type RateLimitOptions = {
  limit: number
  windowMs: number
  failClosed?: boolean
}

/**
 * Storage contract for rate-limit buckets. The default implementation uses
 * PostgreSQL so the limit is shared across processes/instances. Tests can
 * inject an in-memory implementation to stay fast and database-free.
 */
export interface RateLimitStore {
  check(key: string, options: RateLimitOptions, now: Date): Promise<RateLimitResult>
  reset(): Promise<void> | void
}

/** In-memory fixed-window store. Suitable for tests and single-process dev. */
export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>()
  private lastSweep = 0

  async check(key: string, options: RateLimitOptions, now: Date): Promise<RateLimitResult> {
    const nowMs = now.getTime()
    if (nowMs - this.lastSweep >= 60_000) {
      this.lastSweep = nowMs
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= nowMs) this.buckets.delete(bucketKey)
      }
    }

    const existing = this.buckets.get(key)
    if (!existing || existing.resetAt <= nowMs) {
      this.buckets.set(key, { count: 1, resetAt: nowMs + options.windowMs })
      return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 }
    }

    existing.count += 1
    if (existing.count > options.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
      }
    }

    return { allowed: true, remaining: options.limit - existing.count, retryAfterSeconds: 0 }
  }

  reset() {
    this.buckets.clear()
    this.lastSweep = 0
  }
}

/** PostgreSQL-backed fixed-window store shared across instances. */
export class DatabaseRateLimitStore implements RateLimitStore {
  async check(key: string, options: RateLimitOptions, now: Date): Promise<RateLimitResult> {
    // Prisma DateTime columns are PostgreSQL timestamp without time zone.
    const currentUtc = now.toISOString()
    const resetUtc = new Date(now.getTime() + options.windowMs).toISOString()

    try {
      // A single upsert increments atomically, including when concurrent
      // requests arrive at the start of a window on different instances.
      const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
        INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
        VALUES (${key}, 1, ${resetUtc}::timestamp, ${currentUtc}::timestamp)
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimit"."resetAt" <= ${currentUtc}::timestamp THEN 1
                         ELSE LEAST("RateLimit"."count" + 1, ${options.limit + 1}) END,
          "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${currentUtc}::timestamp
                           THEN ${resetUtc}::timestamp ELSE "RateLimit"."resetAt" END,
          "updatedAt" = ${currentUtc}::timestamp
        RETURNING "count", "resetAt"
      `
      const allowed = bucket.count <= options.limit
      return {
        allowed,
        remaining: Math.max(0, options.limit - bucket.count),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)),
      }
    } catch (error) {
      if (options.failClosed) throw new ApiError("Verification is temporarily unavailable", 503)
      console.error("rate limit store failed", error)
      return { allowed: true, remaining: options.limit, retryAfterSeconds: 0 }
    }
  }

  async reset() {
    await prisma.rateLimit.deleteMany({})
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  store?: RateLimitStore,
): Promise<RateLimitResult> {
  const resolved =
    store ?? (process.env.RATE_LIMIT_STORE === "memory" && !options.failClosed
      ? memoryStore
      : new DatabaseRateLimitStore())
  return resolved.check(key, options, new Date())
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  return `${scope}:${ip}`
}

// Backwards-compatible helper used by tests with the in-memory store.
export function resetRateLimits(store?: RateLimitStore) {
  const target = store ?? memoryStore
  void target.reset()
}

// Shared memory store instance for tests that want deterministic behaviour.
export const memoryStore = new MemoryRateLimitStore()
