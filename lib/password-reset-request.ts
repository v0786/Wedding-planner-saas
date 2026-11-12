import { createHash } from "node:crypto"
import { ApiError } from "@/lib/errors"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"

export async function limitPasswordRecovery(request: Request, subject: string, action: "request" | "reset") {
  const digest = createHash("sha256").update(subject).digest("hex")
  const options = { windowMs: 15 * 60_000, failClosed: true }
  const [ip, subjectLimit] = await Promise.all([
    checkRateLimit(clientKey(request, `password:${action}:ip`), { ...options, limit: 15 }),
    checkRateLimit(`password:${action}:subject:${digest}`, { ...options, limit: action === "request" ? 3 : 8 }),
  ])
  if (!ip.allowed || !subjectLimit.allowed) throw new ApiError("Too many attempts. Please try again later.", 429)
}
