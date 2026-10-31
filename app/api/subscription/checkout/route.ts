import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, readJson, ApiError } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { createCheckout } from "@/lib/subscriptions/payments"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const body = (await readJson(req)) as { planCode?: unknown }
    if (typeof body.planCode !== "string" || !body.planCode.trim()) {
      throw new ApiError("planCode is required", 400)
    }
    const result = await createCheckout(userId, body.planCode.trim().toUpperCase())
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
