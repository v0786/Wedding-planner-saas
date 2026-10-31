import { NextResponse } from "next/server"
import { handleApiError } from "@/lib/api"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { ensurePlanRows, getPlanConfigs } from "@/lib/subscriptions/service"
import { isPaymentConfigured } from "@/lib/subscriptions/razorpay"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireAdmin()
    await ensurePlanRows()
    return NextResponse.json({
      plans: await getPlanConfigs(),
      paymentsConfigured: isPaymentConfigured(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
