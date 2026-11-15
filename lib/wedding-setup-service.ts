import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { weddingCreateSchema } from "@/lib/validation"
import { EMPTY_WEDDING_SETUP } from "@/lib/wedding-setup-draft"
import { scheduleWeddingDeletion } from "@/lib/wedding-retention"

/** Lock one account's setup so retries cannot create duplicate weddings. */
export async function completeWeddingSetup(userId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`wedding-setup:${userId}`}, 0))`
    const draft = await tx.weddingSetupDraft.findUnique({ where: { userId } })
    if (!draft) throw new ApiError("Save your wedding details before continuing.", 400)
    if (draft.completedWeddingId) {
      const wedding = await tx.wedding.findFirst({
        where: { id: draft.completedWeddingId, workspace: { members: { some: { userId } } } }, select: { id: true },
      })
      if (!wedding) throw new ApiError("This setup is already complete. Start a new setup to create another wedding.", 409)
      return { weddingId: wedding.id, resumed: true }
    }
    const data = weddingCreateSchema.parse(draft.data)
    if (!data.date) throw new ApiError("Choose a wedding date before selecting a plan.", 400)
    const membership = await tx.workspaceMember.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })
    if (!membership) throw new ApiError("No workspace found for this account", 400)
    const wedding = await tx.wedding.create({ data: {
      ...data, workspaceId: membership.workspaceId, invitationToken: crypto.randomUUID(),
    } })
    await scheduleWeddingDeletion(wedding.id, tx)
    await tx.weddingSetupDraft.update({ where: { userId }, data: { completedWeddingId: wedding.id, step: 3, data: EMPTY_WEDDING_SETUP } })
    await tx.auditLog.create({ data: { weddingId: wedding.id, userId, action: "wedding.created", details: { source: "guided-setup" } } })
    return { weddingId: wedding.id, resumed: false }
  })
}
