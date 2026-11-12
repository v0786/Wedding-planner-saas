import { NextRequest, NextResponse } from "next/server"
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  jsonError,
  readJson,
} from "@/lib/api"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"
import { submitRsvp } from "@/lib/rsvp-service"
import { rsvpBrowserToken } from "@/lib/rsvp-browser"
import { assertRsvpPhoneProof } from "@/lib/rsvp-otp"
import { rsvpSchema } from "@/lib/validation"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req)

    const limit = await checkRateLimit(clientKey(req, "rsvp"), {
      limit: 10,
      windowMs: 10 * 60 * 1000,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many RSVP attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      )
    }

    const body = await readJson(req)
    const input = rsvpSchema.parse(body)
    if (!input.editToken) {
      assertRsvpPhoneProof(input.phoneProof, {
        invitationToken: input.token,
        mobile: input.mobile,
        browserToken: rsvpBrowserToken(req.cookies),
      })
    }
    const result = await submitRsvp(body, undefined, undefined, req.cookies)
    return NextResponse.json({ success: true, ...result }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("An RSVP already exists. Use your saved edit link.", 409)
    }
    return handleApiError(error)
  }
}
