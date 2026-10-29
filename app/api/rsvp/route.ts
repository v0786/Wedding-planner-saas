import { NextResponse } from "next/server"
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  jsonError,
  readJson,
} from "@/lib/api"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"
import { submitRsvp } from "@/lib/rsvp-service"

export async function POST(req: Request) {
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
    const result = await submitRsvp(body)
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status)
    }
    return handleApiError(error)
  }
}
