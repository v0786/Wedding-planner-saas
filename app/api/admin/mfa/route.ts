import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { ApiError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { requireAdminIdentity } from "@/lib/subscriptions/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { adminMfaKey, adminSessionBinding, grantAdminMfa, requireAdminMfa, MFA_COOKIE, MFA_SETUP_COOKIE, mfaCookieOptions } from "@/lib/admin-mfa"
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, matchTotpStep, openMfa, sealMfa } from "@/lib/admin-mfa-crypto"

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("begin"), password: z.string().min(1).max(1024) }),
  z.object({ action: z.literal("enroll"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("verify"), code: z.string().trim().min(6).max(40) }),
  z.object({ action: z.literal("lock") }),
  z.object({ action: z.literal("reset"), password: z.string().min(1).max(1024) }),
])
interface SetupChallenge { userId: string; binding: string; secret: string; expires: number }

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const user = await requireAdminIdentity()
    const input = requestSchema.parse(await readJson(request))
    const jar = await cookies()
    if (input.action === "lock") {
      jar.delete(MFA_COOKIE)
      jar.delete(MFA_SETUP_COOKIE)
      return NextResponse.json({ locked: true })
    }
    const attempt = await checkRateLimit(`admin-mfa:${user.id}`, { limit: 8, windowMs: 10 * 60_000, failClosed: true })
    if (!attempt.allowed) throw new ApiError("Too many verification attempts. Try again later.", 429)
    const key = adminMfaKey()
    const existing = await prisma.adminMfaCredential.findUnique({ where: { userId: user.id } })
    if (input.action === "reset") {
      await requireAdminMfa(user)
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      if (!account?.passwordHash || !await bcrypt.compare(input.password, account.passwordHash)) {
        throw new ApiError("Account password could not be verified", 403)
      }
      await prisma.$transaction(async tx => {
        await tx.adminMfaCredential.delete({ where: { userId: user.id } })
        await tx.platformAdminAudit.create({ data: { actorUserId: user.id, resource: "mfa.reset", reason: "Verified administrator requested authenticator replacement" } })
      })
      jar.delete(MFA_COOKIE)
      jar.delete(MFA_SETUP_COOKIE)
      return NextResponse.json({ reset: true }, { headers: { "Cache-Control": "no-store" } })
    }
    if (input.action === "begin") {
      if (existing) throw new ApiError("An authenticator is already enrolled", 409)
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      if (!account?.passwordHash || !await bcrypt.compare(input.password, account.passwordHash)) {
        throw new ApiError("Account password could not be verified. Use password recovery if needed.", 403)
      }
      const secret = generateTotpSecret()
      const challenge: SetupChallenge = { userId: user.id, binding: await adminSessionBinding(), secret, expires: Date.now() + 10 * 60_000 }
      jar.set(MFA_SETUP_COOKIE, sealMfa(challenge, key, "setup"), { ...mfaCookieOptions, maxAge: 600 })
      const uri = `otpauth://totp/${encodeURIComponent(`Wedding Guest Planner:${user.email}`)}?secret=${secret}&issuer=Wedding%20Guest%20Planner&algorithm=SHA1&digits=6&period=30`
      return NextResponse.json({ secret, uri }, { headers: { "Cache-Control": "no-store" } })
    }
    if (input.action === "enroll") {
      if (existing) throw new ApiError("An authenticator is already enrolled", 409)
      const token = jar.get(MFA_SETUP_COOKIE)?.value
      const challenge = token ? openMfa<SetupChallenge>(token, key, "setup") : null
      if (!challenge || challenge.userId !== user.id || challenge.binding !== await adminSessionBinding() || challenge.expires < Date.now()) {
        throw new ApiError("Authenticator setup expired. Start again.", 403)
      }
      const step = matchTotpStep(challenge.secret, input.code, BigInt(-1))
      if (step === null) throw new ApiError("The verification code is invalid or expired", 403)
      const recoveryCodes = generateRecoveryCodes()
      const credential = await prisma.$transaction(async tx => {
        const created = await tx.adminMfaCredential.create({ data: {
          userId: user.id, encryptedSecret: sealMfa(challenge.secret, key, "credential"),
          lastUsedStep: BigInt(step), recoveryHashes: recoveryCodes.map(hashRecoveryCode),
        } })
        await tx.platformAdminAudit.create({ data: { actorUserId: user.id, resource: "mfa.enrolled", reason: "Administrator enabled two-factor authentication" } })
        return created
      })
      jar.delete(MFA_SETUP_COOKIE)
      await grantAdminMfa(user, credential.id)
      return NextResponse.json({ verified: true, recoveryCodes }, { headers: { "Cache-Control": "no-store" } })
    }
    if (!existing) throw new ApiError("Enroll an authenticator first", 403)
    const secret = openMfa<string>(existing.encryptedSecret, key, "credential")
    if (!secret) throw new ApiError("Administrator verification needs operator recovery", 503)
    const step = matchTotpStep(secret, input.code, existing.lastUsedStep)
    const recoveryHash = hashRecoveryCode(input.code)
    const isRecovery = existing.recoveryHashes.includes(recoveryHash)
    if (step === null && !isRecovery) throw new ApiError("The verification code is invalid, expired or already used", 403)
    await prisma.$transaction(async tx => {
      // A conditional write is the replay guard even across concurrent instances.
      const consumed = step !== null
        ? await tx.adminMfaCredential.updateMany({ where: { id: existing.id, lastUsedStep: { lt: BigInt(step) } }, data: { lastUsedStep: BigInt(step) } })
        : await tx.adminMfaCredential.updateMany({ where: { id: existing.id, recoveryHashes: { equals: existing.recoveryHashes } }, data: { recoveryHashes: existing.recoveryHashes.filter(hash => hash !== recoveryHash) } })
      if (consumed.count !== 1) throw new ApiError("The verification code was already used", 403)
      await tx.platformAdminAudit.create({ data: { actorUserId: user.id, resource: isRecovery ? "mfa.recovery-used" : "mfa.verified", reason: "Administrator session step-up" } })
    })
    await grantAdminMfa(user, existing.id)
    return NextResponse.json({ verified: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return handleApiError(error) }
}
