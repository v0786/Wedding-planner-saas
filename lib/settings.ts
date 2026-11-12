import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const settingsSchema = z.object({
  businessName: z.string().trim().max(150),
  legalAddress: z.string().trim().max(1000),
  supportEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  grievanceContact: z.string().trim().max(500),
  gstEnabled: z.boolean(),
  gstRateBasisPoints: z.number().int().min(0).max(10000),
  taxInclusive: z.boolean(),
  advertisementsEnabled: z.boolean(),
  dashboardAds: z.boolean(),
  invitationAds: z.boolean(),
  publicRsvpAds: z.boolean(),
  adText: z.string().trim().max(300),
  adUrl: z.string().trim().max(2048).refine(value => {
    if (!value) return true
    try { return new URL(value).protocol === "https:" } catch { return false }
  }, "Use an HTTPS advertisement URL"),
})

export type Settings = z.infer<typeof settingsSchema>

export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({ where: { id: "platform" }, update: {}, create: {} })
}

export type TaxQuote = {
  baseAmountInPaise: number
  taxAmountInPaise: number
  taxRateBasisPoints: number
  taxInclusive: boolean
  amountInPaise: number
}

/** Prices and rounding use integer paise and hundredths of a percentage point. */
export function calculateTax(priceInPaise: number, settings: Pick<Settings, "gstEnabled" | "gstRateBasisPoints" | "taxInclusive">): TaxQuote {
  if (!Number.isSafeInteger(priceInPaise) || priceInPaise < 0 ||
      !Number.isInteger(settings.gstRateBasisPoints) || settings.gstRateBasisPoints < 0 || settings.gstRateBasisPoints > 10000) {
    throw new Error("Invalid tax calculation input")
  }
  const rate = settings.gstEnabled ? settings.gstRateBasisPoints : 0
  const taxInclusive = settings.gstEnabled && settings.taxInclusive
  const baseAmountInPaise = taxInclusive ? Math.round(priceInPaise * 10000 / (10000 + rate)) : priceInPaise
  const taxAmountInPaise = taxInclusive ? priceInPaise - baseAmountInPaise : Math.round(priceInPaise * rate / 10000)
  return { baseAmountInPaise, taxAmountInPaise, taxRateBasisPoints: rate, taxInclusive, amountInPaise: baseAmountInPaise + taxAmountInPaise }
}

export type AdPlacement = "dashboard" | "invitation" | "publicRsvp"

export function canShowAdvertisement(planCode: string, placement: AdPlacement, settings: Settings) {
  if (!settings.advertisementsEnabled || !["BASIC", "PRO"].includes(planCode) || !settings.adText || !settings.adUrl) return false
  return placement === "dashboard" ? settings.dashboardAds : placement === "invitation" ? settings.invitationAds : settings.publicRsvpAds
}
