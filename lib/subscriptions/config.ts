/**
 * Central pricing + entitlement configuration.
 *
 * This file is the single source of truth for *what* a plan is, which
 * features it unlocks and which limits apply. Prices and the live values for
 * limits/features are stored in the `Plan` table so an administrator can
 * change them without touching source code.
 *
 * IMPORTANT: no price is hard-coded here. A plan with `priceInPaise: null`
 * has not been configured yet and the UI must display "Coming Soon".
 */

export const PLAN_CODES = ["FREE", "PRO", "PRIME"] as const
export type PlanCode = (typeof PLAN_CODES)[number]

export const FEATURE_KEYS = [
  "whatsappSharing",
  "customQuestions",
  "csvImport",
  "csvExport",
  "reports",
  "customBranding",
  "prioritySupport",
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const LIMIT_KEYS = [
  "weddings",
  "guestsPerWedding",
  "eventsPerWedding",
  "customQuestionsPerWedding",
] as const
export type LimitKey = (typeof LIMIT_KEYS)[number]

export type FeatureMap = Record<FeatureKey, boolean>
export type LimitMap = Record<LimitKey, number | null>

export interface PlanDefinition {
  code: PlanCode
  name: string
  tagline: string
  description: string
  /** Higher rank = more capable plan. Used for upgrade/downgrade rules. */
  rank: number
  /**
   * Price in the smallest currency unit (paise). `null` means the price has
   * not been configured yet → "Coming Soon".
   */
  priceInPaise: number | null
  currency: string
  /** Billing period in days. 0 means the plan never expires (FREE). */
  billingPeriodDays: number
  features: FeatureMap
  limits: LimitMap
  isActive: boolean
  sortOrder: number
}

export interface PlanConfig extends PlanDefinition {
  id?: string
  /** Whether the values came from the database or the code defaults. */
  source: "database" | "default"
}

export const FEATURE_LABELS: Record<FeatureKey, { label: string; description: string }> = {
  whatsappSharing: {
    label: "WhatsApp invitations",
    description: "Share the invitation link with guests on WhatsApp",
  },
  customQuestions: {
    label: "Custom RSVP questions",
    description: "Ask guests dietary, transport or other questions",
  },
  csvImport: {
    label: "CSV guest import",
    description: "Upload a guest list from a spreadsheet",
  },
  csvExport: {
    label: "CSV exports",
    description: "Download guest lists and RSVP reports",
  },
  reports: {
    label: "Reports & insights",
    description: "Headcount, meal preferences and event attendance",
  },
  customBranding: {
    label: "Custom invitation branding",
    description: "Cover photo, couple photo and a theme colour",
  },
  prioritySupport: {
    label: "Priority support",
    description: "Jump the queue when you need help",
  },
}

export const LIMIT_LABELS: Record<LimitKey, { label: string; unit: string }> = {
  weddings: { label: "Weddings", unit: "wedding" },
  guestsPerWedding: { label: "Guests per wedding", unit: "guest" },
  eventsPerWedding: { label: "Events per wedding", unit: "event" },
  customQuestionsPerWedding: { label: "Questions per wedding", unit: "question" },
}

const FREE_FEATURES: FeatureMap = {
  whatsappSharing: true,
  customQuestions: false,
  csvImport: false,
  csvExport: false,
  reports: false,
  customBranding: false,
  prioritySupport: false,
}

const PRO_FEATURES: FeatureMap = {
  ...FREE_FEATURES,
  customQuestions: true,
  csvImport: true,
  csvExport: true,
  reports: true,
  customBranding: true,
}

const PRIME_FEATURES: FeatureMap = {
  ...PRO_FEATURES,
  prioritySupport: true,
}

/**
 * Default definitions. Prices are intentionally `null` until the operator
 * supplies them through the admin console.
 */
export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  FREE: {
    code: "FREE",
    name: "Free",
    tagline: "Plan your first celebration",
    description: "Everything you need to collect RSVPs for one intimate wedding.",
    rank: 0,
    priceInPaise: null,
    currency: "INR",
    billingPeriodDays: 0,
    features: FREE_FEATURES,
    limits: {
      weddings: 1,
      guestsPerWedding: 50,
      eventsPerWedding: 2,
      customQuestionsPerWedding: 0,
    },
    isActive: true,
    sortOrder: 0,
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    tagline: "For the full celebration",
    description: "More weddings, a bigger guest list and rich RSVP collection.",
    rank: 1,
    priceInPaise: null,
    currency: "INR",
    billingPeriodDays: 30,
    features: PRO_FEATURES,
    limits: {
      weddings: 3,
      guestsPerWedding: 500,
      eventsPerWedding: 5,
      customQuestionsPerWedding: 10,
    },
    isActive: false,
    sortOrder: 1,
  },
  PRIME: {
    code: "PRIME",
    name: "Prime",
    tagline: "Unlimited, without compromise",
    description: "Unlimited weddings and guests, every feature, priority support.",
    rank: 2,
    priceInPaise: null,
    currency: "INR",
    billingPeriodDays: 30,
    features: PRIME_FEATURES,
    limits: {
      weddings: null,
      guestsPerWedding: null,
      eventsPerWedding: null,
      customQuestionsPerWedding: null,
    },
    isActive: false,
    sortOrder: 2,
  },
}

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && (PLAN_CODES as readonly string[]).includes(value)
}

export function planRank(code: PlanCode): number {
  return PLAN_DEFINITIONS[code].rank
}

/** Returns the plan change rule for moving from one plan to another. */
export function planChangeKind(from: PlanCode, to: PlanCode): "upgrade" | "downgrade" | "same" {
  if (from === to) return "same"
  return planRank(to) > planRank(from) ? "upgrade" : "downgrade"
}

/** Formats paise as an INR string, e.g. 149900 → "₹1,499". */
export function formatInr(amountInPaise: number): string {
  const rupees = amountInPaise / 100
  const hasPaise = amountInPaise % 100 !== 0
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/** Human label for the configured price, or "Coming Soon" when unset. */
export function priceLabel(plan: Pick<PlanDefinition, "priceInPaise" | "billingPeriodDays">): string {
  if (plan.priceInPaise === null) return "Coming Soon"
  if (plan.priceInPaise === 0) return "Free"
  const suffix =
    plan.billingPeriodDays > 0
      ? ` / ${plan.billingPeriodDays} days`
      : ""
  return `${formatInr(plan.priceInPaise)}${suffix}`
}

export function billingLabel(days: number): string {
  if (days <= 0) return "No expiry"
  if (days === 30) return "30 days"
  if (days === 365) return "1 year"
  return `${days} days`
}

export function isPlanConfigured(plan: Pick<PlanDefinition, "priceInPaise">): boolean {
  return plan.priceInPaise !== null
}

const DEFAULT_LIMITS = PLAN_DEFINITIONS.FREE.limits

/** Coerces a JSON value from the database into a complete feature map. */
export function normalizeFeatures(value: unknown, fallback: FeatureMap): FeatureMap {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const result = { ...fallback }
  for (const key of FEATURE_KEYS) {
    if (typeof source[key] === "boolean") result[key] = source[key] as boolean
  }
  return result
}

/** Coerces a JSON value from the database into a complete limit map. */
export function normalizeLimits(value: unknown, fallback: LimitMap): LimitMap {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const result = { ...fallback }
  for (const key of LIMIT_KEYS) {
    const raw = source[key]
    if (raw === null) result[key] = null
    else if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      result[key] = Math.floor(raw)
    }
  }
  return result
}

export function defaultPlanConfig(code: PlanCode): PlanConfig {
  return { ...PLAN_DEFINITIONS[code], features: { ...PLAN_DEFINITIONS[code].features }, limits: { ...PLAN_DEFINITIONS[code].limits }, source: "default" }
}

/** Builds a plan config from a database row, falling back to defaults per key. */
export function planConfigFromRow(row: {
  id: string
  code: string
  name: string
  description: string | null
  priceInPaise: number | null
  currency: string
  billingPeriodDays: number
  features: unknown
  limits: unknown
  isActive: boolean
  sortOrder: number
}): PlanConfig {
  const code = isPlanCode(row.code) ? row.code : "FREE"
  const base = defaultPlanConfig(code)
  return {
    ...base,
    id: row.id,
    name: row.name || base.name,
    description: row.description ?? base.description,
    priceInPaise: row.priceInPaise,
    currency: row.currency || "INR",
    billingPeriodDays: row.billingPeriodDays,
    features: normalizeFeatures(row.features, base.features),
    limits: normalizeLimits(row.limits, base.limits),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    source: "database",
  }
}

/** A limit of `null` means unlimited. */
export function limitLabel(value: number | null, key: LimitKey): string {
  if (value === null) return "Unlimited"
  if (value === 0) return "Not included"
  return `${value} ${LIMIT_LABELS[key].unit}${value === 1 ? "" : "s"}`
}

export { DEFAULT_LIMITS }
