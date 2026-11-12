import { createHash } from "node:crypto"
import { ApiError } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com"
const CAPTCHA_ACTION = "rsvp_otp"

function loopback(hostname: string) {
  return ["127.0.0.1", "localhost", "[::1]"].includes(hostname)
}

function captchaOrigin() {
  const testOrigin = process.env.CAPTCHA_TEST_ORIGIN
  if (!testOrigin) return TURNSTILE_ORIGIN
  try {
    const app = new URL(process.env.AUTH_URL ?? "")
    const db = new URL(process.env.DATABASE_URL ?? "")
    const provider = new URL(testOrigin)
    if (!process.env.VERCEL && loopback(app.hostname) && loopback(db.hostname) &&
        provider.protocol === "http:" && loopback(provider.hostname) && provider.origin === testOrigin) {
      return provider.origin
    }
  } catch {
    // An invalid local override must never enable a production bypass.
  }
  throw new ApiError("Human verification is temporarily unavailable", 503)
}

export function captchaWidgetConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY
  if (!siteKey || !process.env.TURNSTILE_SECRET_KEY || !process.env.AUTH_URL) {
    throw new ApiError("Human verification is temporarily unavailable", 503)
  }
  try {
    const app = new URL(process.env.AUTH_URL)
    if (!["https:", "http:"].includes(app.protocol)) throw new Error("Invalid protocol")
  } catch {
    throw new ApiError("Human verification is temporarily unavailable", 503)
  }
  const origin = captchaOrigin()
  return {
    siteKey,
    scriptUrl: origin === TURNSTILE_ORIGIN
      ? `${origin}/turnstile/v0/api.js?render=explicit`
      : `${origin}/turnstile.js`,
  }
}

/** Validate the challenge and atomically prevent concurrent reuse before sending SMS. */
export async function assertCaptcha(token: unknown): Promise<void> {
  captchaWidgetConfig()
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    throw new ApiError("Complete the human verification before requesting a code", 403)
  }

  let response: Response
  try {
    response = await fetch(`${captchaOrigin()}/turnstile/v0/siteverify`, {
      method: "POST",
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token }),
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
    })
  } catch {
    throw new ApiError("Human verification is temporarily unavailable", 503)
  }
  if (!response.ok) throw new ApiError("Human verification is temporarily unavailable", 503)

  let result: { success?: boolean; action?: string; hostname?: string; challenge_ts?: string }
  try {
    result = await response.json()
  } catch {
    throw new ApiError("Human verification is temporarily unavailable", 503)
  }
  const challengeAt = result.challenge_ts && new Date(result.challenge_ts).getTime()
  const ageMs = challengeAt ? Date.now() - challengeAt : NaN
  if (!result.success || result.action !== CAPTCHA_ACTION ||
      result.hostname !== new URL(process.env.AUTH_URL!).hostname ||
      !Number.isFinite(ageMs) || ageMs < -60_000 || ageMs > 5 * 60_000) {
    throw new ApiError("Human verification expired. Please complete it again", 403)
  }

  const hash = createHash("sha256").update(token).digest("hex")
  const claim = await checkRateLimit(`captcha:used:${hash}`, { limit: 1, windowMs: 6 * 60_000, failClosed: true })
  if (!claim.allowed) throw new ApiError("Human verification expired. Please complete it again", 403)
}
