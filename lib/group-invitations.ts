import type { NextResponse } from "next/server"
import type { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { generateEditToken, hashEditToken, safeCompareTokenHash } from "@/lib/tokens"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"
import type { BrowserCookies } from "@/lib/rsvp-browser"

const GROUP_TOKEN_PREFIX = "group_"
const GROUP_TOKEN = /^group_[A-Za-z0-9_-]{32}$/
const BROWSER_TOKEN = /^[A-Za-z0-9_-]{32}$/
const CHECK_IN_PREFIX = "W1:"
const CHECK_IN_CODE = /^W1:(c[a-z0-9]{24})$/

type GroupDatabase = Pick<PrismaClient, "groupInvitation">

export function isGroupInvitationToken(token: string) {
  return token.startsWith(GROUP_TOKEN_PREFIX)
}

export function createGroupInvitationToken() {
  const token = GROUP_TOKEN_PREFIX + generateEditToken()
  return { token, tokenHash: hashEditToken(token) }
}

export function groupInvitationPath(token: string) {
  return `/group-invite/${token}`
}

export function groupInvitationCookieName(id: string) {
  return `group_invite_${id}`
}

export function setGroupInvitationBrowserCookie(response: NextResponse, id: string, browserToken: string) {
  response.cookies.set(groupInvitationCookieName(id), browserToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function groupCheckInCode(id: string) {
  return CHECK_IN_PREFIX + id
}

export function groupIdFromCheckInCode(code: string) {
  return CHECK_IN_CODE.exec(code)?.[1] ?? null
}

export async function findOpenGroupInvitation(token: string, db: GroupDatabase = prisma) {
  if (!GROUP_TOKEN.test(token)) return null
  const invitation = await db.groupInvitation.findUnique({
    where: { tokenHash: hashEditToken(token) },
    select: {
      id: true,
      weddingId: true,
      label: true,
      mobile: true,
      tokenHash: true,
      browserHash: true,
      revokedAt: true,
      rsvpSubmission: { select: { id: true } },
      wedding: { select: { name: true, published: true, date: true, timezone: true } },
    },
  })
  if (!invitation || invitation.revokedAt || !invitation.wedding.published || isWeddingExpired(invitation.wedding)) {
    return null
  }
  return invitation
}

type GroupInvitation = NonNullable<Awaited<ReturnType<typeof findOpenGroupInvitation>>>

export function groupBrowserMatches(invitation: GroupInvitation, cookies: BrowserCookies) {
  const browserToken = cookies.get(groupInvitationCookieName(invitation.id))?.value
  return !!(invitation.browserHash && browserToken && BROWSER_TOKEN.test(browserToken) &&
    safeCompareTokenHash(invitation.browserHash, hashEditToken(browserToken)))
}

export async function resolveGroupInvitation(token: string, cookies: BrowserCookies, db: GroupDatabase = prisma) {
  const invitation = await findOpenGroupInvitation(token, db)
  return invitation && groupBrowserMatches(invitation, cookies) ? invitation : null
}

export async function bindGroupInvitation(invitation: GroupInvitation, db: GroupDatabase = prisma) {
  const browserToken = generateEditToken()
  const updated = await db.groupInvitation.updateMany({
    where: { id: invitation.id, tokenHash: invitation.tokenHash, browserHash: null, revokedAt: null },
    data: { browserHash: hashEditToken(browserToken) },
  })
  return updated.count === 1 ? browserToken : null
}
