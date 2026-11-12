import { rsvpPhoneVariants } from "@/lib/rsvp-phone"

/** Recognize legacy local numbers while keeping host-entered international formats. */
export function guestPhoneVariants(mobile: string): string[] {
  try {
    return rsvpPhoneVariants(mobile)
  } catch {
    return [mobile]
  }
}
