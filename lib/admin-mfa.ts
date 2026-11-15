import { cookies } from "next/headers"
import { ApiError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { authSessionBinding, MFA_SESSION_SECONDS, openMfa, sealMfa, validMfaSession, type MfaSession } from "@/lib/admin-mfa-crypto"

export const MFA_COOKIE = "wedding-admin-mfa"
export const MFA_SETUP_COOKIE = "wedding-admin-mfa-setup"
export const mfaCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" }
export function adminMfaKey(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""
  if (secret.length < 32) throw new ApiError("Administrator verification is not configured", 503)
  return secret
}
export async function adminSessionBinding(): Promise<string> {
  const binding = authSessionBinding((await cookies()).getAll())
  if (!binding) throw new ApiError("Sign in again before administrator verification", 401)
  return binding
}

export async function requireAdminMfa(user: { id: string; sessionVersion: number }) {
  const credential = await prisma.adminMfaCredential.findUnique({ where: { userId: user.id }, select: { id: true } })
  const binding = await adminSessionBinding()
  const cookie = (await cookies()).get(MFA_COOKIE)?.value
  const session = cookie ? openMfa<MfaSession>(cookie, adminMfaKey(), "session") : null
  if (!credential || !validMfaSession(session, { userId: user.id, sessionVersion: user.sessionVersion, binding, credentialId: credential.id })) {
    throw new ApiError("Administrator verification required", 403, { mfaRequired: true, verificationUrl: "/dashboard/admin-access" })
  }
}

export async function grantAdminMfa(user: { id: string; sessionVersion: number }, credentialId: string) {
  const value: MfaSession = {
    userId: user.id, sessionVersion: user.sessionVersion, credentialId,
    binding: await adminSessionBinding(), expires: Date.now() + MFA_SESSION_SECONDS * 1000,
  }
  ;(await cookies()).set(MFA_COOKIE, sealMfa(value, adminMfaKey(), "session"), { ...mfaCookieOptions, maxAge: MFA_SESSION_SECONDS })
}
