/** @jest-environment node */
import { authSessionBinding, encodeBase32, matchTotpStep, openMfa, sealMfa, totpAtStep, validMfaSession, hashRecoveryCode } from "@/lib/admin-mfa-crypto"

const key = "test-key-only-for-unit-tests-32-characters"
describe("administrator authenticator cryptography", () => {
  const secret = encodeBase32(Buffer.from("12345678901234567890"))
  it("matches RFC 6238 SHA1 vectors using six digits", () => {
    expect(totpAtStep(secret, 1)).toBe("287082")
    expect(totpAtStep(secret, Math.floor(1111111109 / 30))).toBe("081804")
    expect(totpAtStep(secret, Math.floor(2000000000 / 30))).toBe("279037")
  })
  it("allows bounded clock drift, rejects invalid codes and consumed steps", () => {
    const now = 1_700_000_000_000
    const step = Math.floor(now / 30_000)
    expect(matchTotpStep(secret, totpAtStep(secret, step), BigInt(step - 1), now)).toBe(step)
    expect(matchTotpStep(secret, totpAtStep(secret, step - 1), BigInt(step - 2), now)).toBe(step - 1)
    expect(matchTotpStep(secret, totpAtStep(secret, step), BigInt(step), now)).toBeNull()
    expect(matchTotpStep(secret, totpAtStep(secret, step - 2), BigInt(-1), now)).toBeNull()
    expect(matchTotpStep(secret, "abcdef", BigInt(-1), now)).toBeNull()
  })
  it("encrypts secrets with purpose separation and authenticates ciphertext", () => {
    const token = sealMfa({ secret }, key, "credential")
    expect(token).not.toContain(secret)
    expect(openMfa(token, key, "credential")).toEqual({ secret })
    expect(openMfa(token, key, "session")).toBeNull()
    expect(openMfa(token, `${key}wrong`, "credential")).toBeNull()
    const bytes = Buffer.from(token, "base64url"); bytes[bytes.length - 1] ^= 1
    expect(openMfa(bytes.toString("base64url"), key, "credential")).toBeNull()
    expect(() => sealMfa(secret, "weak", "credential")).toThrow()
  })
  it("binds step-up to the current auth session including chunked tokens", () => {
    const first = authSessionBinding([{ name: "authjs.session-token.1", value: "b" }, { name: "authjs.session-token.0", value: "a" }])
    expect(first).toBe(authSessionBinding([{ name: "authjs.session-token.0", value: "a" }, { name: "authjs.session-token.1", value: "b" }]))
    expect(first).not.toBe(authSessionBinding([{ name: "authjs.session-token", value: "new-session" }]))
    expect(authSessionBinding([{ name: "unrelated", value: "x" }])).toBeNull()
  })
  it("rejects expired, revoked, cross-user, cross-session and reset-password step-ups", () => {
    const expected = { userId: "owner", sessionVersion: 1, binding: "token-hash", credentialId: "credential" }
    const now = Date.now()
    const session = { ...expected, expires: now + 600_000 }
    expect(validMfaSession(session, expected, now)).toBe(true)
    expect(validMfaSession({ ...session, expires: now }, expected, now)).toBe(false)
    expect(validMfaSession({ ...session, expires: now + 3_600_000 }, expected, now)).toBe(false)
    for (const altered of [{ userId: "other" }, { binding: "new-session" }, { sessionVersion: 2 }, { credentialId: "revoked" }]) {
      expect(validMfaSession({ ...session, ...altered }, expected, now)).toBe(false)
    }
    expect(validMfaSession(null, expected, now)).toBe(false)
  })
  it("normalizes high-entropy recovery codes before hashing", () => {
    expect(hashRecoveryCode("ABCD EFGH")).toBe(hashRecoveryCode("abcdefgh"))
    expect(hashRecoveryCode("abcdefgh")).not.toContain("abcdefgh")
  })
})
