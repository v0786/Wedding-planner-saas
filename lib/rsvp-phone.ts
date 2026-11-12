import { ApiError } from "@/lib/errors"
import { mobileSchema } from "@/lib/validation"

export function normalizeRsvpPhone(raw: unknown): string {
  const parsed = mobileSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError("Enter a valid mobile number", 400)

  const phone = parsed.data
  const international = /^\d{10}$/.test(phone)
    ? `+91${phone}`
    : /^91\d{10}$/.test(phone) ? `+${phone}` : phone
  if (!/^\+[1-9]\d{6,14}$/.test(international)) {
    throw new ApiError("Enter a mobile number with its country code", 400)
  }
  return international
}

/** Recognizes existing Indian guest records saved without the country-code prefix. */
export function rsvpPhoneVariants(raw: unknown): string[] {
  const phone = normalizeRsvpPhone(raw)
  return /^\+91\d{10}$/.test(phone)
    ? [phone, phone.slice(1), phone.slice(3)]
    : [phone]
}
