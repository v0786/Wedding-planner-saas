import { describe, it, expect } from "@jest/globals"
import { generateEditToken, hashEditToken, safeCompareTokenHash } from "@/lib/tokens"

describe("edit tokens", () => {
  it("generates unique, non-trivial tokens", () => {
    const first = generateEditToken()
    const second = generateEditToken()
    expect(first).not.toBe(second)
    expect(first.length).toBeGreaterThanOrEqual(32)
  })

  it("hashes deterministically and does not store the raw value", () => {
    const token = "guest-edit-token"
    const hash = hashEditToken(token)
    expect(hash).toBe(hashEditToken(token))
    expect(hash).not.toContain(token)
    expect(hash).toHaveLength(64)
  })

  it("compares hashes safely", () => {
    const hash = hashEditToken("a")
    expect(safeCompareTokenHash(hash, hash)).toBe(true)
    expect(safeCompareTokenHash(hash, hashEditToken("b"))).toBe(false)
  })
})
