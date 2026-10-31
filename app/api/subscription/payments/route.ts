import { NextResponse } from "next/server"
import { handleApiError } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { getPaymentHistory } from "@/lib/subscriptions/payments"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userId = await requireUserId()
    return NextResponse.json({ payments: await getPaymentHistory(userId) })
  } catch (error) {
    return handleApiError(error)
  }
}
