import { describe, it, expect, beforeEach } from "@jest/globals"
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits())

  it("allows requests up to the limit", () => {
    expect(checkRateLimit("key", { limit: 2, windowMs: 1000 }).allowed).toBe(true)
    expect(checkRateLimit("key", { limit: 2, windowMs: 1000 }).allowed).toBe(true)
  })

  it("blocks the request after the limit", () => {
    checkRateLimit("key", { limit: 1, windowMs: 1000 })
    const result = checkRateLimit("key", { limit: 1, windowMs: 1000 })
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("keeps buckets independent", () => {
    checkRateLimit("a", { limit: 1, windowMs: 1000 })
    checkRateLimit("a", { limit: 1, windowMs: 1000 })
    expect(checkRateLimit("b", { limit: 1, windowMs: 1000 }).allowed).toBe(true)
  })

  it("allows requests again after the window resets", async () => {
    checkRateLimit("key", { limit: 1, windowMs: 20 })
    checkRateLimit("key", { limit: 1, windowMs: 20 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(checkRateLimit("key", { limit: 1, windowMs: 20 }).allowed).toBe(true)
  })
})
