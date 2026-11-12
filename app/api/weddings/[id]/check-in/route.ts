import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { logAudit } from "@/lib/audit"
import { groupIdFromCheckInCode } from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingOpen } from "@/lib/wedding-lifecycle"

const bodySchema = z.object({ code: z.string().trim().max(40) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)
    assertWeddingOpen(wedding)
    const { code } = bodySchema.parse(await readJson(request))
    const groupId = groupIdFromCheckInCode(code)
    if (!groupId) throw new ApiError("Enter a valid group check-in code", 400)

    const result = await prisma.$transaction(async (transaction) => {
      const where = { id: groupId, weddingId: id, revokedAt: null }
      const updated = await transaction.groupInvitation.updateMany({
        where: { ...where, checkedInAt: null },
        data: { checkedInAt: new Date(), checkedInBy: userId },
      })
      const group = await transaction.groupInvitation.findFirst({
        where,
        select: { label: true, checkedInAt: true },
      })
      if (!group) throw new ApiError("Group invitation not found", 404)
      return { ...group, alreadyCheckedIn: updated.count === 0 }
    })

    if (!result.alreadyCheckedIn) {
      await logAudit(id, userId, "group.checked_in", { groupInvitationId: groupId })
    }
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
