import { fromZonedTime } from "date-fns-tz"
import { ApiError } from "@/lib/errors"

type WeddingSchedule = { date: Date | null; timezone: string }
const DEFAULT_TIMEZONE = "Asia/Kolkata"

export function weddingTimeZone(wedding: Pick<WeddingSchedule, "timezone">): string {
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: wedding.timezone })
    return wedding.timezone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/** Wedding dates are stored as calendar dates at UTC midnight. */
export function weddingExpiry(wedding: WeddingSchedule): Date | null {
  if (!wedding.date) return null
  const nextDay = new Date(wedding.date)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const midnight = `${nextDay.toISOString().slice(0, 10)}T00:00:00`
  const expiry = fromZonedTime(midnight, wedding.timezone)
  return Number.isNaN(expiry.getTime()) ? fromZonedTime(midnight, DEFAULT_TIMEZONE) : expiry
}

export function isWeddingExpired(wedding: WeddingSchedule, now = new Date()): boolean {
  const expiry = weddingExpiry(wedding)
  return expiry !== null && now >= expiry
}

export function assertWeddingOpen(wedding: WeddingSchedule): void {
  if (isWeddingExpired(wedding)) {
    throw new ApiError("This wedding has expired and is read-only.", 403, { code: "WEDDING_EXPIRED" })
  }
}
