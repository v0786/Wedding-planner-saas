import { NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson, ApiError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { getPlanConfig, getPlanConfigs, ensurePlanRows } from "@/lib/subscriptions/service"
import {
  FEATURE_KEYS,
  LIMIT_KEYS,
  isPlanCode,
  type FeatureMap,
  type LimitMap,
} from "@/lib/subscriptions/config"

const featureSchema = z.record(z.boolean()).optional()
const limitSchema = z
  .record(z.union([z.number().int().min(0).max(1_000_000), z.null()]))
  .optional()

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  priceInPaise: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  billingPeriodDays: z.number().int().min(1).max(3650).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  features: featureSchema,
  limits: limitSchema,
})

/** Admin plan editor. Changes take effect immediately, no deploy needed. */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    assertSameOrigin(req)
    await requireAdmin()
    await ensurePlanRows()

    const { code: rawCode } = await params
    const code = rawCode.toUpperCase()
    if (!isPlanCode(code)) throw new ApiError("Unknown plan", 404)

    const body = await readJson(req)
    const data = updateSchema.parse(body)
    const current = await getPlanConfig(code)

    const features: FeatureMap = { ...current.features }
    if (data.features) {
      for (const key of FEATURE_KEYS) {
        if (typeof data.features[key] === "boolean") features[key] = data.features[key]
      }
    }

    const limits: LimitMap = { ...current.limits }
    if (data.limits) {
      for (const key of LIMIT_KEYS) {
        const value = data.limits[key]
        if (value === null || typeof value === "number") limits[key] = value
      }
    }

    const updated = await prismaUpdate(code, {
      name: data.name,
      description: data.description,
      priceInPaise: data.priceInPaise,
      currency: data.currency,
      billingPeriodDays: data.billingPeriodDays,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      features,
      limits,
    })

    return NextResponse.json({ plan: updated, plans: await getPlanConfigs() })
  } catch (error) {
    return handleApiError(error)
  }
}

async function prismaUpdate(
  code: string,
  data: {
    name?: string
    description?: string | null
    priceInPaise?: number | null
    currency?: string
    billingPeriodDays?: number
    isActive?: boolean
    sortOrder?: number
    features: FeatureMap
    limits: LimitMap
  },
) {
  const update = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.priceInPaise !== undefined ? { priceInPaise: data.priceInPaise } : {}),
    ...(data.currency !== undefined ? { currency: data.currency } : {}),
    ...(data.billingPeriodDays !== undefined ? { billingPeriodDays: data.billingPeriodDays } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    features: data.features,
    limits: data.limits,
  }
  await prisma.plan.update({ where: { code }, data: update })
  return getPlanConfig(code)
}
