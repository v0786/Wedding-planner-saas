import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/server-auth"
import { getUserWorkspaceId, getEntitlements, getUsageSummary } from "@/lib/subscriptions/service"
import { getPaymentHistory } from "@/lib/subscriptions/payments"
import { handleApiError } from "@/lib/api"

export const dynamic = "force-dynamic"

/** Current plan, entitlements, usage and recent payments for the account. */
export async function GET() {
  try {
    const userId = await requireUserId()
    const workspaceId = await getUserWorkspaceId(userId)
    const [entitlements, usage, payments] = await Promise.all([
      getEntitlements(workspaceId),
      getUsageSummary(workspaceId),
      getPaymentHistory(userId),
    ])
    return NextResponse.json({ entitlements, usage, payments })
  } catch (error) {
    return handleApiError(error)
  }
}
