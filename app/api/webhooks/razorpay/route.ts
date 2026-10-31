import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/subscriptions/razorpay"
import {
  activatePayment,
  markPaymentFailed,
} from "@/lib/subscriptions/payments"
import { ApiError } from "@/lib/errors"

export const dynamic = "force-dynamic"

/**
 * Razorpay webhook.
 *
 * Security: the raw body is verified against `RAZORPAY_WEBHOOK_SECRET`; an
 * unverified request can never activate a plan. Processing is idempotent, so
 * Razorpay's retries are safe.
 */
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!verifyWebhookSignature({ rawBody, signature })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  let payload: {
    event?: string
    payload?: {
      payment?: { entity?: Record<string, unknown> & { error_description?: string; error?: { description?: string } } }
      order?: { entity?: Record<string, unknown> }
    }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const event = typeof payload?.event === "string" ? payload.event : "unknown"
  const entity = (payload?.payload?.payment?.entity ?? payload?.payload?.order?.entity ?? {}) as Record<
    string,
    unknown
  > & { error_description?: string; error?: { description?: string } }
  const orderId: string | undefined =
    typeof entity.order_id === "string"
      ? entity.order_id
      : event.startsWith("order.") && typeof entity.id === "string"
        ? entity.id
        : undefined
  const paymentId: string | undefined =
    typeof entity.id === "string" && event.startsWith("payment.") ? entity.id : undefined
  const amountInPaise =
    typeof entity.amount === "number"
      ? entity.amount
      : typeof entity.amount_paid === "number"
        ? entity.amount_paid
        : undefined
  const currency = typeof entity.currency === "string" ? entity.currency : undefined

  try {
    if (event === "payment.captured" || event === "order.paid") {
      if (orderId) {
        await activatePayment(orderId, {
          providerPaymentId: paymentId ?? null,
          amountInPaise,
          currency,
        })
      }
    } else if (event === "payment.failed") {
      if (orderId) await markPaymentFailed(orderId, entity?.error_description ?? entity?.error?.description)
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Unknown order (e.g. from another environment): acknowledge so the
      // provider stops retrying.
      return NextResponse.json({ received: true, ignored: true })
    }
    console.error("razorpay webhook failed", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
