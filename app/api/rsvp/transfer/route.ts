import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { rsvpBrowserToken, setRsvpBrowserCookie } from "@/lib/rsvp-browser"
import { consumeRsvpTransfer, createRsvpTransfer, findRsvpTransfer } from "@/lib/rsvp-service"
import { generateEditToken } from "@/lib/tokens"
import { setGroupInvitationBrowserCookie } from "@/lib/group-invitations"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "strict-origin",
}

const transferForm = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open RSVP on this device</title></head>
<body><main><h1>Open RSVP on this device</h1>
<p>This moves RSVP editing access to this browser. The old edit link will expire.</p>
<form method="post"><button type="submit">Open RSVP on this device</button></form></main></body></html>`

function expiredLink() {
  return new NextResponse("This RSVP transfer link is invalid or has expired.", {
    status: 404,
    headers: privateHeaders,
  })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? ""
  if (!await findRsvpTransfer(token)) return expiredLink()
  return new NextResponse(transferForm, {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    },
  })
}

const transferRequest = z.object({
  invitationToken: z.string().min(1).max(200),
  editToken: z.string().min(1).max(200),
})

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const token = request.nextUrl.searchParams.get("token")
    const browserToken = rsvpBrowserToken(request.cookies)
    if (token) {
      const targetBrowser = browserToken ?? generateEditToken()
      const result = await consumeRsvpTransfer(token, targetBrowser)
      if (!result) return expiredLink()
      const path = `/rsvp/${encodeURIComponent(result.locator)}/edit?token=${encodeURIComponent(result.editToken)}`
      const response = new NextResponse(null, { status: 303, headers: { ...privateHeaders, Location: path } })
      if (!browserToken) setRsvpBrowserCookie(response, targetBrowser)
      if (result.groupBrowser) setGroupInvitationBrowserCookie(response, result.groupBrowser.id, result.groupBrowser.token)
      return response
    }

    if (!browserToken) return expiredLink()
    const { invitationToken, editToken } = transferRequest.parse(await readJson(request))
    const { transferToken, transferExpiresAt } = await createRsvpTransfer(invitationToken, editToken, browserToken, undefined, request.cookies)
    return NextResponse.json({
      path: `/api/rsvp/transfer?token=${encodeURIComponent(transferToken)}`,
      expiresAt: transferExpiresAt.toISOString(),
    }, { headers: privateHeaders })
  } catch (error) {
    return handleApiError(error)
  }
}
