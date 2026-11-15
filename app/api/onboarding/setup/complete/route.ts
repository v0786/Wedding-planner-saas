import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { completeWeddingSetup } from "@/lib/wedding-setup-service"

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    await requireCurrentPolicyAcceptance(userId)
    const result = await completeWeddingSetup(userId)
    return NextResponse.json(result, { status: result.resumed ? 200 : 201 })
  } catch (error) { return handleApiError(error) }
}
