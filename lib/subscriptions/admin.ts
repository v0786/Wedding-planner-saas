import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { requireUserId } from "@/lib/server-auth"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"

export { isAdminAllowed, parseAdminEmails, type AdminCandidate } from "@/lib/subscriptions/admin-access"

/**
 * Admin access is granted either by the `User.isAdmin` flag or by listing the
 * account in the `ADMIN_EMAILS` environment variable (comma separated).
 */
export async function requireAdmin() {
  const userId = await requireUserId()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isAdmin: true },
  })
  if (!user) throw new ApiError("Unauthorized", 401)

  if (!isAdminAllowed(user)) throw new ApiError("Administrator access required", 403)
  return user
}
