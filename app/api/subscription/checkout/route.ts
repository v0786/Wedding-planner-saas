import { requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { createWeddingCheckout } from "@/lib/subscriptions/payments"

const checkoutSchema = z.object({
  weddingId: z.string().trim().min(1).max(128),
  planCode: z.enum(["BASIC", "PRO", "PRIME"]),
})

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    await requireCurrentPolicyAcceptance(userId)
    const { weddingId, planCode } = checkoutSchema.parse(await readJson(req))
    const result = await createWeddingCheckout(userId, weddingId, planCode)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
