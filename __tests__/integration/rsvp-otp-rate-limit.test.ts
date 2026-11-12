import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { DatabaseRateLimitStore } from "@/lib/rate-limit"

it("enforces the database OTP send limit under parallel requests", async () => {
  const key = `otp-test:${randomUUID()}`
  const store = new DatabaseRateLimitStore()
  const now = new Date()
  const windowMs = 10 * 60_000
  const options = { limit: 3, windowMs, failClosed: true }

  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => store.check(key, options, now)))
    expect(results.filter((result) => result.allowed)).toHaveLength(3)
    expect(results.filter((result) => !result.allowed).map((result) => result.retryAfterSeconds)).toEqual(
      Array(9).fill(600),
    )
    expect((await store.check(key, options, new Date(now.getTime() + windowMs))).allowed).toBe(true)
  } finally {
    await prisma.rateLimit.deleteMany({ where: { key } })
    await prisma.$disconnect()
  }
})
