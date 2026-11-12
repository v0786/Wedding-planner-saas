import { createHash } from "node:crypto"
import { checkRateLimit, clientKey, type RateLimitStore } from "@/lib/rate-limit"

/** Throttle both targeted password guessing and attempts spread across accounts. */
export async function allowCredentialsAttempt(request: Request, email: string, store?: RateLimitStore) {
  const emailHash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
  const options = { windowMs: 15 * 60_000, failClosed: true }
  try {
    const [byIp, byEmail] = await Promise.all([
      checkRateLimit(clientKey(request, "login:ip"), { ...options, limit: 30 }, store),
      checkRateLimit(`login:email:${emailHash}`, { ...options, limit: 10 }, store),
    ])
    return byIp.allowed && byEmail.allowed
  } catch {
    return false
  }
}
