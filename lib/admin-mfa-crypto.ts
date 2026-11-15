import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
export const MFA_SESSION_SECONDS = 15 * 60

export function encodeBase32(value: Buffer): string {
  let bits = 0, accumulator = 0, result = ""
  for (const byte of value) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) { bits -= 5; result += ALPHABET[(accumulator >>> bits) & 31] }
  }
  if (bits) result += ALPHABET[(accumulator << (5 - bits)) & 31]
  return result
}

function decodeBase32(value: string): Buffer {
  let bits = 0, accumulator = 0
  const bytes: number[] = []
  for (const char of value.toUpperCase().replace(/=+$/, "")) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) throw new Error("Invalid authenticator secret")
    accumulator = (accumulator << 5) | index
    bits += 5
    if (bits >= 8) { bits -= 8; bytes.push((accumulator >>> bits) & 255) }
  }
  return Buffer.from(bytes)
}

export function generateTotpSecret(): string { return encodeBase32(randomBytes(20)) }
export function hashRecoveryCode(value: string): string {
  return createHash("sha256").update(value.replace(/\s/g, "").toLowerCase()).digest("hex")
}
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => randomBytes(10).toString("hex"))
}

export function totpAtStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0")
}

/** Returns the matching step, excluding every previously consumed time step. */
export function matchTotpStep(secret: string, code: string, lastStep: bigint, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const step = Math.floor(now / 30_000)
  for (const offset of [0, -1, 1]) {
    const candidate = step + offset
    if (candidate < 0 || BigInt(candidate) <= lastStep) continue
    if (timingSafeEqual(Buffer.from(totpAtStep(secret, candidate)), Buffer.from(code))) return candidate
  }
  return null
}

function encryptionKey(secret: string, purpose: string): Buffer {
  if (secret.length < 32) throw new Error("A strong AUTH_SECRET is required for administrator verification")
  return createHmac("sha256", secret).update(`wedding-admin-mfa:${purpose}`).digest()
}

export function sealMfa(value: unknown, authSecret: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(authSecret, purpose), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")
}

export function openMfa<T>(value: string, authSecret: string, purpose: string): T | null {
  try {
    const bytes = Buffer.from(value, "base64url")
    if (bytes.length < 29 || bytes.length > 4096) return null
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(authSecret, purpose), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")) as T
  } catch { return null }
}

export function authSessionBinding(cookies: Array<{ name: string; value: string }>): string | null {
  const sessionCookies = cookies.filter(cookie => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (!sessionCookies.length) return null
  return createHash("sha256").update(sessionCookies.map(cookie => `${cookie.name}=${cookie.value}`).join(";")).digest("hex")
}

export interface MfaSession {
  userId: string
  sessionVersion: number
  binding: string
  credentialId: string
  expires: number
}
export function validMfaSession(value: MfaSession | null, expected: Omit<MfaSession, "expires">, now = Date.now()): boolean {
  return Boolean(value && value.expires > now && value.expires <= now + MFA_SESSION_SECONDS * 1000 &&
    value.userId === expected.userId && value.sessionVersion === expected.sessionVersion &&
    value.binding === expected.binding && value.credentialId === expected.credentialId)
}
