import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import {
  FEATURE_KEYS,
  LIMIT_KEYS,
  PLAN_CODES,
  PLAN_DEFINITIONS,
  defaultPlanConfig,
  isPlanCode,
  planConfigFromRow,
  type FeatureKey,
  type LimitKey,
  type PlanCode,
  type PlanConfig,
  type PlanDefinition,
} from "@/lib/subscriptions/config"

/**
 * Subscription + entitlement service.
 *
 * The `Plan` table is authoritative for prices, billing periods, features and
 * limits. When a plan row is missing or partial, the defaults in
 * `lib/subscriptions/config.ts` fill the gaps, so the app keeps working on a
 * fresh database.
 *
 * Enforcement is always server-side. UI checks are a convenience only.
 */

type PlanRow = {
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
}

export interface EffectiveEntitlements {
  workspaceId: string
  plan: PlanConfig
  /** The subscribed plan code, even when a pending downgrade exists. */
  planCode: PlanCode
  status: "ACTIVE" | "FREE" | "EXPIRED" | "CANCELLED" | "PAST_DUE"
  subscriptionId: string | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  pendingPlanCode: PlanCode | null
  features: Record<FeatureKey, boolean>
  limits: Record<LimitKey, number | null>
}

// ---------------------------------------------------------------------------
// Workspace + plan lookup
// ---------------------------------------------------------------------------

export async function getUserWorkspaceId(userId: string): Promise<string> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  if (!membership) throw new ApiError("No workspace found for this account", 404)
  return membership.workspaceId
}

let planRowsPromise: Promise<void> | null = null

/** Clears the per-process plan seed cache (used by tests). */
export function resetPlanRowsCache(): void {
  planRowsPromise = null
}

/**
 * Ensures one row per plan code exists, without overwriting admin changes.
 * The work is cached for the life of the process: entitlement lookups run on
 * almost every request and must not perform writes each time.
 */
export async function ensurePlanRows(): Promise<void> {
  if (!planRowsPromise) {
    planRowsPromise = seedPlanRows().catch((error) => {
      // A missing table (pre-migration) must not crash public pages; the code
      // defaults still describe the plans. Retry on the next call.
      planRowsPromise = null
      console.error("plan seed failed", error)
    })
  }
  await planRowsPromise
}

async function seedPlanRows(): Promise<void> {
  for (const code of PLAN_CODES) {
    const definition = PLAN_DEFINITIONS[code]
    await prisma.plan.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: definition.name,
        description: definition.description,
        priceInPaise: definition.priceInPaise,
        currency: definition.currency,
        billingPeriodDays: definition.billingPeriodDays,
        features: definition.features,
        limits: definition.limits,
        isActive: definition.isActive,
        sortOrder: definition.sortOrder,
      },
    })
  }
}

export async function getPlanConfigs(): Promise<PlanConfig[]> {
  await ensurePlanRows()
  let rows: PlanRow[] = []
  try {
    rows = (await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } })) as PlanRow[]
  } catch (error) {
    console.error("plan lookup failed", error)
  }

  const byCode = new Map<string, PlanRow>()
  for (const row of rows) byCode.set(row.code, row)

  return PLAN_CODES.map((code) => {
    const row = byCode.get(code)
    return row ? planConfigFromRow(row) : defaultPlanConfig(code)
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getPlanConfig(code: string): Promise<PlanConfig> {
  const plans = await getPlanConfigs()
  const plan = plans.find((candidate) => candidate.code === code)
  if (!plan) throw new ApiError("Plan not found", 404)
  return plan
}

/** The FREE plan, used whenever a paid subscription is not in effect. */
async function freePlan(): Promise<PlanConfig> {
  const plans = await getPlanConfigs()
  return plans.find((plan) => plan.code === "FREE") ?? defaultPlanConfig("FREE")
}

// ---------------------------------------------------------------------------
// Effective subscription / entitlements
// ---------------------------------------------------------------------------

/**
 * Expires a subscription whose period has ended. Only a scheduled move to FREE
 * is honored; a paid `pendingPlanCode` is never activated without a new
 * verified payment. The update is conditional on the period it read, so a
 * renewal that lands at the same moment is never overwritten. Idempotent.
 */
export async function settleSubscription(workspaceId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  })
  if (!subscription) return null

  const now = new Date()
  const expired = subscription.currentPeriodEnd.getTime() <= now.getTime()
  if (!expired) return subscription

  if (subscription.status === "EXPIRED") return subscription

  await prisma.subscription.updateMany({
    where: {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    data: {
      status: "EXPIRED",
      cancelAtPeriodEnd: false,
      pendingPlanCode: null,
    },
  })

  // Re-read: a concurrent renewal may have replaced the expired period.
  return prisma.subscription.findUnique({
    where: { id: subscription.id },
    include: { plan: true },
  })
}

/** Resolves the plan a workspace is entitled to right now. */
export async function getEntitlements(workspaceId: string): Promise<EffectiveEntitlements> {
  const subscription = await settleSubscription(workspaceId)
  const plans = await getPlanConfigs()

  const activeSubscription =
    subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd > new Date()
      ? subscription
      : null

  const plan = activeSubscription
    ? plans.find((candidate) => candidate.code === activeSubscription.plan.code) ??
      planConfigFromRow(activeSubscription.plan as PlanRow)
    : plans.find((candidate) => candidate.code === "FREE") ?? (await freePlan())

  const status: EffectiveEntitlements["status"] = !activeSubscription
    ? subscription
      ? subscription.status === "PAST_DUE"
        ? "PAST_DUE"
        : subscription.status === "CANCELLED"
          ? "CANCELLED"
          : subscription.status === "EXPIRED"
            ? "EXPIRED"
            : "FREE"
      : "FREE"
    : "ACTIVE"

  return {
    workspaceId,
    plan,
    planCode: plan.code,
    status,
    subscriptionId: activeSubscription?.id ?? null,
    currentPeriodStart: activeSubscription?.currentPeriodStart ?? null,
    currentPeriodEnd: activeSubscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: activeSubscription?.cancelAtPeriodEnd ?? false,
    pendingPlanCode:
      activeSubscription?.pendingPlanCode && isPlanCode(activeSubscription.pendingPlanCode)
        ? activeSubscription.pendingPlanCode
        : null,
    features: plan.features,
    limits: plan.limits,
  }
}

export async function getEntitlementsForUser(userId: string) {
  return getEntitlements(await getUserWorkspaceId(userId))
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface WorkspaceUsage {
  weddings: number
}

export interface WeddingUsage {
  guests: number
  events: number
  customQuestions: number
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const weddings = await prisma.wedding.count({ where: { workspaceId } })
  return { weddings }
}

export async function getWeddingUsage(weddingId: string): Promise<WeddingUsage> {
  const [guests, events, customQuestions] = await Promise.all([
    prisma.guest.count({ where: { weddingId } }),
    prisma.event.count({ where: { weddingId } }),
    prisma.customQuestion.count({ where: { weddingId } }),
  ])
  return { guests, events, customQuestions }
}

/** Latest usage snapshot, kept for reporting and audits. */
export async function recordUsage(workspaceId: string, metric: LimitKey, value: number) {
  try {
    await prisma.usageRecord.create({ data: { workspaceId, metric, value } })
  } catch (error) {
    console.error("usage record failed", error)
  }
}

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

function upgradeDetails(entitlements: EffectiveEntitlements, extra: Record<string, unknown>) {
  return {
    code: "LIMIT_REACHED" as const,
    plan: entitlements.planCode,
    upgradeUrl: "/pricing",
    ...extra,
  }
}

/**
 * Serialises a quota check with the write it protects. The advisory lock is
 * held until the transaction ends, so two concurrent requests cannot both see
 * "one slot left" and create two rows. Call the assert* helper inside `fn` and
 * perform the create with the provided transaction client.
 */
export async function withWorkspaceLimitLock<T>(
  workspaceId: string,
  scope: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const lockKey = `${workspaceId}:${scope}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`
      return fn(tx)
    },
    { timeout: 20_000 },
  )
}

export function featureError(feature: FeatureKey, entitlements: EffectiveEntitlements): ApiError {
  return new ApiError(
    "This feature is not included in your current plan",
    403,
    {
      code: "FEATURE_NOT_AVAILABLE",
      feature,
      plan: entitlements.planCode,
      upgradeUrl: "/pricing",
    },
  )
}

/** Throws 403 unless the workspace's plan includes `feature`. */
export async function assertFeature(workspaceId: string, feature: FeatureKey) {
  if (!FEATURE_KEYS.includes(feature)) {
    throw new ApiError("Unknown feature", 400)
  }
  const entitlements = await getEntitlements(workspaceId)
  if (!entitlements.features[feature]) throw featureError(feature, entitlements)
  return entitlements
}

/** Throws 402 when adding one more of `limitKey` would exceed the plan. */
export async function assertWorkspaceLimit(workspaceId: string, limitKey: "weddings") {
  const entitlements = await getEntitlements(workspaceId)
  const max = entitlements.limits[limitKey]
  const usage = await getWorkspaceUsage(workspaceId)
  const current = usage[limitKey]
  if (max !== null && current >= max) {
    throw new ApiError(
      `Your ${entitlements.plan.name} plan allows ${max} ${max === 1 ? "wedding" : "weddings"}. Upgrade to add more.`,
      402,
      upgradeDetails(entitlements, { limitKey, current, max }),
    )
  }
  return entitlements
}

const WEDDING_LIMIT_MAP: Record<
  "guests" | "events" | "customQuestions",
  { key: LimitKey; noun: string }
> = {
  guests: { key: "guestsPerWedding", noun: "guest" },
  events: { key: "eventsPerWedding", noun: "event" },
  customQuestions: { key: "customQuestionsPerWedding", noun: "question" },
}

/** Throws 402 when adding one more guest/event/question exceeds the plan. */
export async function assertWeddingLimit(
  workspaceId: string,
  weddingId: string,
  resource: "guests" | "events" | "customQuestions",
  additional = 1,
) {
  const entitlements = await getEntitlements(workspaceId)
  const mapping = WEDDING_LIMIT_MAP[resource]
  const max = entitlements.limits[mapping.key]
  if (max === null) return entitlements

  const usage = await getWeddingUsage(weddingId)
  const current = usage[resource]
  if (current + additional > max) {
    throw new ApiError(
      `Your ${entitlements.plan.name} plan allows ${max} ${mapping.noun}${max === 1 ? "" : "s"} per wedding. Upgrade to add more.`,
      402,
      upgradeDetails(entitlements, {
        limitKey: mapping.key,
        current,
        max,
        additional,
      }),
    )
  }
  return entitlements
}

/** Provides current/max values for a usage meter without throwing. */
export async function getUsageSummary(workspaceId: string) {
  const entitlements = await getEntitlements(workspaceId)
  const workspaceUsage = await getWorkspaceUsage(workspaceId)

  const weddings = await prisma.wedding.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  })

  const perWedding = await Promise.all(
    weddings.map(async (wedding) => ({
      weddingId: wedding.id,
      weddingName: wedding.name,
      usage: await getWeddingUsage(wedding.id),
    })),
  )

  return { entitlements, workspaceUsage, perWedding }
}

export function allLimitKeys(): readonly LimitKey[] {
  return LIMIT_KEYS
}

export type { PlanDefinition }
