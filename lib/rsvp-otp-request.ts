import { type NextRequest } from "next/server"
import { z } from "zod"
import { ApiError, assertSameOrigin, readJson } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { publicInvitationWhere } from "@/lib/public-invitation"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"
import { normalizeRsvpPhone } from "@/lib/rsvp-phone"
import { otpRateLimitKey, readRsvpPhoneChallenge } from "@/lib/rsvp-otp"
import { rsvpBrowserToken } from "@/lib/rsvp-browser"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"

const phoneBody = z.object({
  invitationToken: z.string().min(1).max(200),
  mobile: z.string(),
})
const verifyBody = phoneBody.extend({
  challenge: z.string().min(1).max(100),
  code: z.string().trim().regex(/^\d{4,10}$/, "Enter the verification code"),
})

async function limitOtp(key: string, limit: number, windowMs: number) {
  const result = await checkRateLimit(key, { limit, windowMs, failClosed: true })
  if (!result.allowed) {
    throw new ApiError("Too many verification attempts. Please try again later", 429, {
      retryAfterSeconds: result.retryAfterSeconds,
    })
  }
}

export async function readRsvpOtpRequest(req: NextRequest, action: "request" | "verify") {
  assertSameOrigin(req)
  const payload = await readJson(req)
  const verification = action === "verify" ? verifyBody.parse(payload) : null
  const phone = verification ?? phoneBody.parse(payload)
  const mobile = normalizeRsvpPhone(phone.mobile)
  const context = { invitationToken: phone.invitationToken, mobile, browserToken: rsvpBrowserToken(req.cookies) }
  const sending = action === "request"
  const windowMs = 10 * 60_000
  await limitOtp(otpRateLimitKey(`${action}:ip`, clientKey(req, "rsvp")), sending ? 12 : 30, windowMs)
  // Check the browser-bound challenge before spending the recipient’s verify budget.
  const verificationSid = verification ? readRsvpPhoneChallenge(verification.challenge, context) : null
  const invitation = await publicInvitationWhere(phone.invitationToken, req.cookies)
  if (!invitation) throw new ApiError("This invitation is not available", 404)

  const wedding = await prisma.wedding.findUnique({
    where: invitation.where,
    select: { id: true, published: true, date: true, timezone: true, rsvpDeadline: true },
  })
  const now = new Date()
  if (!wedding?.published || isWeddingExpired(wedding, now)) {
    throw new ApiError("This invitation is not available", 404)
  }
  if (wedding.rsvpDeadline && now > wedding.rsvpDeadline) {
    throw new ApiError("The RSVP deadline has passed", 400)
  }
  if (invitation.group?.mobile && normalizeRsvpPhone(invitation.group.mobile) !== mobile) {
    throw new ApiError("This invitation uses a different mobile number", 403)
  }

  await limitOtp(otpRateLimitKey(`${action}:phone`, mobile), sending ? 3 : 8, windowMs)
  await limitOtp(otpRateLimitKey(`${action}:wedding`, wedding.id), sending ? 150 : 300, windowMs)
  return { context, code: verification?.code, verificationSid }
}
