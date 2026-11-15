import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { requireUserId } from "@/lib/server-auth"
import { requireAdminMfa } from "@/lib/admin-mfa"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"

export { isAdminAllowed, parseAdminEmails, type AdminCandidate } from "@/lib/subscriptions/admin-access"

/**
 * Admin access is granted either by the `User.isAdmin` flag or by listing the
 * a verified account in the `ADMIN_EMAILS` environment variable (comma separated).
 */
export async function requireAdminIdentity() {
  const userId = await requireUserId()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isAdmin: true, emailVerified: true, sessionVersion: true },
  })
  if (!user) throw new ApiError("Unauthorized", 401)

  if (!isAdminAllowed(user)) throw new ApiError("Administrator access required", 403)
  return user
}

/** All platform reads and writes require a recent second factor. */
export async function requireAdmin() {
  const user = await requireAdminIdentity()
  await requireAdminMfa(user)
  return user
}

/** Page guards redirect rather than rendering API error messages. */
export async function requireAdminPage() {
  try { return await requireAdmin() }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/auth/login")
    if (error instanceof ApiError && error.details?.mfaRequired) redirect("/dashboard/admin-access")
    if (error instanceof ApiError && error.status === 403) redirect("/dashboard")
    throw error
  }
}
