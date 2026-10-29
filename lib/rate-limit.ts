import { prisma } from "@/lib/prisma"

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export type RateLimitOptions = {
  limit: number
  windowMs: number
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
    const resetAt = new Date(now.getTime() + options.windowMs)

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.rateLimit.findUnique({ where: { key } })

        if (!existing || existing.resetAt.getTime() <= now.getTime()) {
          await tx.rateLimit.upsert({
            where: { key },
            update: { count: 1, resetAt },
            create: { key, count: 1, resetAt },
          })
          return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 }
        }

        const nextCount = existing.count + 1
        await tx.rateLimit.update({
          where: { key },
          data: { count: nextCount },
        })

        if (nextCount > options.limit) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
            ),
          }
        }

        return {
          allowed: true,
          remaining: options.limit - nextCount,
          retryAfterSeconds: 0,
        }
      })
    } catch (error) {
      // Fail open: a rate-limiter outage must not take the whole app down.
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
    store ?? (process.env.RATE_LIMIT_STORE === "memory" ? memoryStore : new DatabaseRateLimitStore())
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
