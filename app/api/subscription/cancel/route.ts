import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { cancelSubscription, resumeSubscription } from "@/lib/subscriptions/payments"

/** Cancels at period end by default; `{ immediate: true }` ends access now. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const body = (await readJson(req).catch(() => ({}))) as { immediate?: unknown }
    const subscription = await cancelSubscription(userId, body.immediate === true)
    return NextResponse.json({ subscription })
  } catch (error) {
    return handleApiError(error)
  }
}

/** Undoes a scheduled cancellation. */
export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const subscription = await resumeSubscription(userId)
    return NextResponse.json({ subscription })
  } catch (error) {
    return handleApiError(error)
  }
}
