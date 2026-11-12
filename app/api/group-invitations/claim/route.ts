import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ApiError, assertSameOrigin, handleApiError } from "@/lib/api"
import { bindGroupInvitation, findOpenGroupInvitation, groupBrowserMatches, setGroupInvitationBrowserCookie } from "@/lib/group-invitations"

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const form = await request.formData()
    const token = form.get("token")
    if (typeof token !== "string") throw new ApiError("Invitation not found", 404)

    const invitation = await findOpenGroupInvitation(token)
    if (!invitation) throw new ApiError("Invitation not found", 404)

    const response = new NextResponse(null, {
      status: 303,
      headers: { Location: `/invite/${token}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    })
    if (groupBrowserMatches(invitation, await cookies())) return response

    const browserToken = await bindGroupInvitation(invitation)
    if (!browserToken) throw new ApiError("Invitation not found", 404)
    setGroupInvitationBrowserCookie(response, invitation.id, browserToken)
    return response
  } catch (error) {
    return handleApiError(error)
  }
}
