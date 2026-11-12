import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { logAudit } from "@/lib/audit"
import { createGroupInvitationToken, groupInvitationPath } from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingOpen } from "@/lib/wedding-lifecycle"

const bodySchema = z.object({ action: z.enum(["reissue", "revoke"]) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    const { id, invitationId } = await params
    const wedding = await requireWeddingAccess(id, userId)
    assertWeddingOpen(wedding)
    const { action } = bodySchema.parse(await readJson(request))

    const invitation = await prisma.groupInvitation.findFirst({
      where: { id: invitationId, weddingId: id, revokedAt: null },
      select: { tokenHash: true },
    })
    if (!invitation) throw new ApiError("Invitation not found", 404)

    const replacement = action === "reissue" ? createGroupInvitationToken() : null
    const updated = await prisma.groupInvitation.updateMany({
      where: { id: invitationId, weddingId: id, revokedAt: null, tokenHash: invitation.tokenHash },
      data: replacement
        ? { tokenHash: replacement.tokenHash, browserHash: null }
        : { revokedAt: new Date(), browserHash: null },
    })
    if (!updated.count) throw new ApiError("This invitation changed. Refresh and try again.", 409)

    await logAudit(id, userId, replacement ? "invitation.reissued" : "invitation.revoked", { groupInvitationId: invitationId })
    return NextResponse.json({ path: replacement ? groupInvitationPath(replacement.token) : null }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
