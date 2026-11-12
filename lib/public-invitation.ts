import { isGroupInvitationToken, resolveGroupInvitation } from "@/lib/group-invitations"
import type { BrowserCookies } from "@/lib/rsvp-browser"

export async function publicInvitationWhere(token: string, cookies: BrowserCookies) {
  if (!isGroupInvitationToken(token)) return { where: { invitationToken: token }, group: null }
  const group = await resolveGroupInvitation(token, cookies)
  return group ? { where: { id: group.weddingId }, group } : null
}
