import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { hashEditToken } from "@/lib/tokens"
import { assertEmailConfigured, sendTransactionalEmail } from "@/lib/email"

function recoveryOrigin() {
  try {
    const url = new URL(process.env.AUTH_URL ?? "")
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("Invalid origin")
    return url.origin
  } catch {
    throw new ApiError("Account recovery is temporarily unavailable", 503)
  }
}

export async function requestPasswordReset(email: string, send = sendTransactionalEmail) {
  assertEmailConfigured()
  const origin = recoveryOrigin()
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, sessionVersion: true } })
  if (!user) return
  const token = randomBytes(32).toString("base64url")
  const record = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashEditToken(token),
      sessionVersion: user.sessionVersion,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  })
  try {
    await send({
      to: email,
      subject: "Reset your Wedding Guest Manager password",
      text: `Open this link to choose a new password within one hour:\n\n${origin}/auth/reset-password?token=${token}\n\nIf you did not request a reset, you can ignore this email.`,
      idempotencyKey: `password-reset-${record.id}`,
    })
  } catch {
    await prisma.passwordResetToken.deleteMany({ where: { id: record.id } })
    // The outward response must not distinguish a registered address during an outage.
    console.error("Password recovery email delivery failed")
  }
}

export async function resetPassword(token: string, password: string, now = new Date()) {
  const tokenHash = hashEditToken(token)
  const initial = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true } })
  if (!initial) throw new ApiError("This password reset link is invalid or has expired", 400)
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT id FROM "User" WHERE id = ${initial.userId} FOR UPDATE`
    const record = await transaction.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!record || record.expiresAt <= now || record.usedAt) {
      throw new ApiError("This password reset link is invalid or has expired", 400)
    }
    const changed = await transaction.user.updateMany({
      where: { id: record.userId, sessionVersion: record.sessionVersion },
      data: { passwordHash, emailVerified: now, sessionVersion: { increment: 1 } },
    })
    if (!changed.count) throw new ApiError("This password reset link is invalid or has expired", 400)
    await transaction.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } })
  })
}
