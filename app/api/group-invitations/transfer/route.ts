import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { createGroupInvitationToken, groupInvitationPath, resolveGroupInvitation } from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({ token: z.string().max(80) })

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const { token } = bodySchema.parse(await readJson(request))
    const invitation = await resolveGroupInvitation(token, await cookies())
    if (!invitation) throw new ApiError("Invitation not found", 404)

    const replacement = createGroupInvitationToken()
    await prisma.$transaction(async (transaction) => {
      // RSVP submission locks this same row before saving its response. Read
      // for a response after taking the lock to cover a concurrent submission.
      const authorized = await transaction.groupInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash: invitation.tokenHash,
          browserHash: invitation.browserHash,
          revokedAt: null,
        },
        data: { updatedAt: new Date() },
      })
      if (!authorized.count) throw new ApiError("Invitation not found", 404)
      const response = await transaction.rsvpSubmission.findUnique({
        where: { groupInvitationId: invitation.id },
        select: { id: true },
      })
      if (response) {
        throw new ApiError("Open the saved RSVP to move an invitation with an existing response.", 409)
      }
      await transaction.groupInvitation.update({
        where: { id: invitation.id },
        data: { tokenHash: replacement.tokenHash, browserHash: null },
      })
    })
    return NextResponse.json({ path: groupInvitationPath(replacement.token) }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
