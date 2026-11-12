import { z } from "zod"

export const TERMS_VERSION = "2026-11-11"
export const PRIVACY_VERSION = "2026-11-11"

/** Acceptance must refer to the policies that were actually displayed. */
export const policyAcceptanceSchema = z.object({
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Accept the Terms to continue" }) }),
  privacyAcknowledged: z.literal(true, { errorMap: () => ({ message: "Acknowledge the Privacy Notice to continue" }) }),
  termsVersion: z.literal(TERMS_VERSION, { errorMap: () => ({ message: "Review the current Terms before continuing" }) }),
  privacyVersion: z.literal(PRIVACY_VERSION, { errorMap: () => ({ message: "Review the current Privacy Notice before continuing" }) }),
})
