/** @jest-environment node */
import { describe, it, expect } from "@jest/globals"
import {
  PLAN_CODES,
  PLAN_DEFINITIONS,
  billingLabel,
  formatInr,
  limitLabel,
  normalizeFeatures,
  normalizeLimits,
  planChangeKind,
  planConfigFromRow,
  priceLabel,
} from "@/lib/subscriptions/config"

describe("subscription config", () => {
  it("defines exactly the three supported plans", () => {
    expect([...PLAN_CODES]).toEqual(["FREE", "PRO", "PRIME"])
  })

  it("never invents prices: defaults are Coming Soon", () => {
    expect(PLAN_DEFINITIONS.FREE.priceInPaise).toBeNull()
    expect(PLAN_DEFINITIONS.PRO.priceInPaise).toBeNull()
    expect(PLAN_DEFINITIONS.PRIME.priceInPaise).toBeNull()
    expect(priceLabel(PLAN_DEFINITIONS.PRO)).toBe("Coming Soon")
    expect(priceLabel(PLAN_DEFINITIONS.PRIME)).toBe("Coming Soon")
  })

  it("formats a configured INR price", () => {
    expect(priceLabel({ priceInPaise: 149900, billingPeriodDays: 30 })).toContain("1,499")
    expect(priceLabel({ priceInPaise: 149900, billingPeriodDays: 30 })).toContain("30 days")
    expect(formatInr(49900)).toContain("499")
    expect(priceLabel({ priceInPaise: 0, billingPeriodDays: 0 })).toBe("Free")
  })

  it("describes billing periods", () => {
    expect(billingLabel(0)).toBe("No expiry")
    expect(billingLabel(30)).toBe("30 days")
    expect(billingLabel(365)).toBe("1 year")
    expect(billingLabel(7)).toBe("7 days")
  })

  it("labels limits, including unlimited and zero", () => {
    expect(limitLabel(null, "weddings")).toBe("Unlimited")
    expect(limitLabel(0, "customQuestionsPerWedding")).toBe("Not included")
    expect(limitLabel(1, "weddings")).toBe("1 wedding")
    expect(limitLabel(3, "weddings")).toBe("3 weddings")
  })

  it("classifies plan changes by rank", () => {
    expect(planChangeKind("FREE", "PRO")).toBe("upgrade")
    expect(planChangeKind("PRO", "PRIME")).toBe("upgrade")
    expect(planChangeKind("PRIME", "PRO")).toBe("downgrade")
    expect(planChangeKind("PRO", "FREE")).toBe("downgrade")
    expect(planChangeKind("PRO", "PRO")).toBe("same")
  })

  it("normalizes stored feature/limit JSON and ignores junk", () => {
    const features = normalizeFeatures(
      { reports: true, csvImport: "yes", unknown: true },
      PLAN_DEFINITIONS.FREE.features,
    )
    expect(features.reports).toBe(true)
    expect(features.csvImport).toBe(false)
    expect(features).not.toHaveProperty("unknown")

    const limits = normalizeLimits(
      { weddings: 5, guestsPerWedding: null, eventsPerWedding: -2, customQuestionsPerWedding: 2.9 },
      PLAN_DEFINITIONS.FREE.limits,
    )
    expect(limits.weddings).toBe(5)
    expect(limits.guestsPerWedding).toBeNull()
    expect(limits.eventsPerWedding).toBe(PLAN_DEFINITIONS.FREE.limits.eventsPerWedding)
    expect(limits.customQuestionsPerWedding).toBe(2)
  })

  it("treats database rows as authoritative over defaults", () => {
    const plan = planConfigFromRow({
      id: "plan_1",
      code: "PRO",
      name: "Pro Annual",
      description: null,
      priceInPaise: 249900,
      currency: "INR",
      billingPeriodDays: 365,
      features: { reports: false },
      limits: { weddings: 9 },
      isActive: true,
      sortOrder: 4,
    })
    expect(plan.id).toBe("plan_1")
    expect(plan.source).toBe("database")
    expect(plan.name).toBe("Pro Annual")
    expect(plan.priceInPaise).toBe(249900)
    expect(plan.billingPeriodDays).toBe(365)
    expect(plan.features.reports).toBe(false)
    // Unspecified feature keys fall back to code defaults.
    expect(plan.features.whatsappSharing).toBe(true)
    expect(plan.limits.weddings).toBe(9)
  })
})
