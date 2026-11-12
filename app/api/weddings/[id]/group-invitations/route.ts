import { NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { logAudit } from "@/lib/audit"
import { createGroupInvitationToken, groupInvitationPath } from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { optionalMobileSchema } from "@/lib/validation"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingOpen } from "@/lib/wedding-lifecycle"

const bodySchema = z.object({
  label: z.string().trim().min(1, "Enter a guest or group name").max(120),
  mobile: optionalMobileSchema,
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)
    assertWeddingOpen(wedding)

    const details = bodySchema.parse(await readJson(request))
    const invitation = createGroupInvitationToken()
    const group = await prisma.groupInvitation.create({
      data: { ...details, weddingId: id, tokenHash: invitation.tokenHash },
      select: { id: true },
    })
    await logAudit(id, userId, "invitation.created", { groupInvitationId: group.id })
    return NextResponse.json({ id: group.id, path: groupInvitationPath(invitation.token) }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
