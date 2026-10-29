import crypto from "crypto"

/** Generates a guest-facing RSVP edit token. Never store this value. */
export function generateEditToken(): string {
  return crypto.randomBytes(24).toString("base64url")
}

/** Stable, non-reversible hash used to look up an RSVP edit token. */
export function hashEditToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function safeCompareTokenHash(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
