import { describe, it, expect, beforeEach } from "@jest/globals"
import { checkRateLimit, memoryStore } from "@/lib/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => memoryStore.reset())

  it("allows requests up to the limit", async () => {
    expect((await checkRateLimit("key", { limit: 2, windowMs: 1000 }, memoryStore)).allowed).toBe(true)
    expect((await checkRateLimit("key", { limit: 2, windowMs: 1000 }, memoryStore)).allowed).toBe(true)
  })

  it("blocks the request after the limit", async () => {
    await checkRateLimit("key", { limit: 1, windowMs: 1000 }, memoryStore)
    const result = await checkRateLimit("key", { limit: 1, windowMs: 1000 }, memoryStore)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("keeps buckets independent", async () => {
    await checkRateLimit("a", { limit: 1, windowMs: 1000 }, memoryStore)
    await checkRateLimit("a", { limit: 1, windowMs: 1000 }, memoryStore)
    expect((await checkRateLimit("b", { limit: 1, windowMs: 1000 }, memoryStore)).allowed).toBe(true)
  })

  it("allows requests again after the window resets", async () => {
    await checkRateLimit("key", { limit: 1, windowMs: 20 }, memoryStore)
    await checkRateLimit("key", { limit: 1, windowMs: 20 }, memoryStore)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect((await checkRateLimit("key", { limit: 1, windowMs: 20 }, memoryStore)).allowed).toBe(true)
  })
})
