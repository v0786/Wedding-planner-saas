import { prisma } from "@/lib/prisma"

/**
 * Records an administrative action. Audit failures must never break the
 * user-facing operation, so they are logged and swallowed.
 */
export async function logAudit(
  weddingId: string,
  userId: string | null,
  action: string,
  details?: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        weddingId,
        userId,
        action,
        details: details ? (details as object) : undefined,
      },
    })
  } catch (error) {
    console.error("audit log failed", error)
  }
}
