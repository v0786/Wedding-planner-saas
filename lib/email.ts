import { ApiError } from "@/lib/errors"

type EmailMessage = { to: string; subject: string; text: string; idempotencyKey: string }

function emailApiOrigin() {
  const localOrigin = process.env.EMAIL_TEST_ORIGIN
  if (!localOrigin) return "https://api.resend.com"
  try {
    const local = (hostname: string) => ["127.0.0.1", "localhost", "[::1]"].includes(hostname)
    const origin = new URL(localOrigin)
    const app = new URL(process.env.AUTH_URL ?? "")
    const database = new URL(process.env.DATABASE_URL ?? "")
    if (!process.env.VERCEL && local(app.hostname) && local(database.hostname) &&
        origin.protocol === "http:" && local(origin.hostname) && origin.origin === localOrigin) return origin.origin
  } catch {
    // A malformed test override must never fall through to a live provider.
  }
  throw new ApiError("Email delivery is temporarily unavailable", 503)
}

export function assertEmailConfigured() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new ApiError("Email delivery is temporarily unavailable", 503)
  }
  emailApiOrigin()
}

/** Server-only provider adapter. The caller supplies a stable key for safe retries. */
export async function sendTransactionalEmail(message: EmailMessage): Promise<string> {
  assertEmailConfigured()
  let response: Response
  try {
    response = await fetch(`${emailApiOrigin()}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
    })
    if (!response.ok) throw new Error("Email provider rejected request")
    const body = await response.json() as { id?: string }
    if (!body.id) throw new Error("Email provider response missing id")
    return body.id
  } catch {
    throw new ApiError("Email delivery is temporarily unavailable", 503)
  }
}
