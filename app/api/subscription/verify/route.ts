import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, readJson, ApiError } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { verifyAndActivatePayment } from "@/lib/subscriptions/payments"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const body = (await readJson(req)) as Record<string, unknown>

    const orderId = body.razorpay_order_id
    const paymentId = body.razorpay_payment_id
    const signature = body.razorpay_signature
    if (
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string"
    ) {
      throw new ApiError("razorpay_order_id, razorpay_payment_id and razorpay_signature are required", 400)
    }

    const result = await verifyAndActivatePayment(userId, {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
