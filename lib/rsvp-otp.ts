import { createHmac, timingSafeEqual } from "node:crypto"
import { ApiError } from "@/lib/errors"
import { normalizeRsvpPhone } from "@/lib/rsvp-phone"

type PhoneContext = {
  invitationToken: string
  mobile: string
  browserToken: string | undefined
}

const challengeMinutes = 10
const proofMinutes = 15
const verificationSidPattern = /^VE[0-9a-f]{32}$/i

function signature(purpose: string, values: unknown[]): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new ApiError("Phone verification is temporarily unavailable", 503)
  return createHmac("sha256", secret)
    .update(JSON.stringify(["wedding-rsvp-otp-v1", purpose, ...values]))
    .digest("base64url")
}

function phoneSignature(purpose: string, context: PhoneContext, data: string) {
  return signature(purpose, [
    context.invitationToken,
    normalizeRsvpPhone(context.mobile),
    context.browserToken,
    data,
  ])
}

function unsealPhoneToken(purpose: string, value: unknown, context: PhoneContext): string | null {
  if (!context.browserToken || typeof value !== "string" || value.length > 100) return null
  const parts = value.split(".")
  const expectedParts = purpose === "challenge" ? 3 : 2
  const expiry = parts[0]
  const mac = parts.at(-1) ?? ""
  if (parts.length !== expectedParts || !/^\d{10,13}$/.test(expiry) || !/^[A-Za-z0-9_-]{43}$/.test(mac)) {
    return null
  }
  if (Number(expiry) <= Date.now()) return null
  const data = parts.slice(0, -1).join(".")
  const expected = phoneSignature(purpose, context, data)
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? data : null
}

export function otpRateLimitKey(scope: string, ...values: string[]) {
  return `rsvp-otp:${scope}:${signature("rate-limit", values)}`
}

export function issueRsvpPhoneChallenge(context: PhoneContext, verificationSid: string) {
  const data = `${Date.now() + challengeMinutes * 60_000}.${verificationSid}`
  return `${data}.${phoneSignature("challenge", context, data)}`
}

export function readRsvpPhoneChallenge(challenge: unknown, context: PhoneContext) {
  const sid = unsealPhoneToken("challenge", challenge, context)?.split(".")[1]
  if (!sid || !verificationSidPattern.test(sid)) {
    throw new ApiError("Request a new verification code in this browser", 403)
  }
  return sid
}

export function issueRsvpPhoneProof(context: PhoneContext) {
  const expiry = String(Date.now() + proofMinutes * 60_000)
  return `${expiry}.${phoneSignature("proof", context, expiry)}`
}

export function assertRsvpPhoneProof(proof: unknown, context: PhoneContext): void {
  if (!unsealPhoneToken("proof", proof, context)) {
    throw new ApiError("Verify this mobile number before submitting your RSVP", 403)
  }
}

function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
}

function verifyApiOrigin() {
  const testOrigin = process.env.RSVP_OTP_TEST_ORIGIN
  if (!testOrigin) return "https://verify.twilio.com"

  try {
    const localApp = new URL(process.env.AUTH_URL ?? "")
    const localDb = new URL(process.env.DATABASE_URL ?? "")
    const provider = new URL(testOrigin)
    if (
      !process.env.VERCEL && isLoopback(localApp.hostname) && isLoopback(localDb.hostname) &&
      provider.protocol === "http:" && isLoopback(provider.hostname) && provider.origin === testOrigin
    ) return provider.origin
  } catch {
    // An invalid test URL should never fall through to live SMS.
  }

  throw new ApiError("Phone verification is temporarily unavailable", 503)
}

type VerifyEndpoint = "Verifications" | "VerificationCheck"

async function verifyApi(endpoint: VerifyEndpoint, body: Record<string, string>) {
  const { TWILIO_VERIFY_SERVICE_SID: sid, TWILIO_API_KEY: key, TWILIO_API_SECRET: secret } = process.env
  if (!sid || !/^VA[0-9a-f]{32}$/i.test(sid) || !key || !/^SK[0-9a-f]{32}$/i.test(key) || !secret) {
    throw new ApiError("Phone verification is temporarily unavailable", 503)
  }

  const url = `${verifyApiOrigin()}/v2/Services/${sid}/${endpoint}`
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
    })
  } catch {
    throw new ApiError("Phone verification is temporarily unavailable", 503)
  }

  if (response.status === 429) {
    throw new ApiError("Too many verification attempts. Please try again later", 429)
  }
  if (!response.ok) {
    if (endpoint === "VerificationCheck" && [400, 404].includes(response.status)) return null
    if (endpoint === "Verifications" && response.status === 400) {
      throw new ApiError("Could not send a verification code to this number", 400)
    }
    throw new ApiError("Phone verification is temporarily unavailable", 503)
  }

  try {
    return await response.json() as { sid?: string; to?: string; status?: string }
  } catch {
    throw new ApiError("Phone verification is temporarily unavailable", 503)
  }
}

export async function sendRsvpOtp(mobile: string) {
  const verification = await verifyApi("Verifications", { To: mobile, Channel: "sms" })
  if (!verification?.sid || !verificationSidPattern.test(verification.sid) ||
      verification.status !== "pending" || verification.to !== mobile) {
    throw new ApiError("Could not send a verification code. Please try again", 503)
  }
  return verification.sid
}

export async function checkRsvpOtp(mobile: string, sid: string, code: string) {
  const verification = await verifyApi("VerificationCheck", { VerificationSid: sid, Code: code })
  return verification?.status === "approved" && verification.sid === sid && verification.to === mobile
}
