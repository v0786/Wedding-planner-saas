import { weddingDeletionAt } from "@/lib/wedding-retention"
import { weddingExpiry, isWeddingExpired } from "@/lib/wedding-lifecycle"

const wedding = { date: new Date("2026-12-10T00:00:00.000Z"), timezone: "Asia/Kolkata" }

it("starts read-only at local midnight following the wedding", () => {
  expect(weddingExpiry(wedding)?.toISOString()).toBe("2026-12-10T18:30:00.000Z")
  expect(isWeddingExpired(wedding, new Date("2026-12-10T18:29:59.999Z"))).toBe(false)
  expect(isWeddingExpired(wedding, new Date("2026-12-10T18:30:00.000Z"))).toBe(true)
})

it("retains records for seven full local calendar days after the wedding", () => {
  expect(weddingDeletionAt(wedding)?.toISOString()).toBe("2026-12-17T18:30:00.000Z")
  expect(weddingDeletionAt({ ...wedding, date: null })).toBeNull()
})
