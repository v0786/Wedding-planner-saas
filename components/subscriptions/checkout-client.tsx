"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { formatInr } from "@/lib/subscriptions/config"

type CheckoutResponse = {
  requiresPayment: boolean
  scheduled?: boolean
  message?: string
  orderId?: string
  amountInPaise?: number
  baseAmountInPaise?: number
  taxAmountInPaise?: number
  taxRateBasisPoints?: number
  currency?: string
  keyId?: string
  planCode?: string
  planName?: string
}

type RazorpayInstance = { open: () => void }

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

export default function CheckoutClient({
  planCode,
  planName,
  priceLabel,
  weddingId,
  expectedAmountInPaise,
}: {
  planCode: string
  planName: string
  priceLabel: string
  weddingId: string
  expectedAmountInPaise: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmedQuote, setConfirmedQuote] = useState<CheckoutResponse | null>(null)

  async function startCheckout() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, weddingId }),
      })
      const data = (await res.json()) as CheckoutResponse & { error?: string; code?: string }

      if (!res.ok) {
        setError(data.error || "Could not start checkout")
        toast.error(data.error || "Could not start checkout")
        return
      }

      const expected = confirmedQuote?.amountInPaise ?? expectedAmountInPaise
      if (data.amountInPaise !== expected) {
        setConfirmedQuote(data)
        setError("The checkout amount changed. Review the updated order total below and select Pay to continue.")
        return
      }
      setConfirmedQuote(data)

      if (!window.Razorpay) {
        setError("The payment window could not load. Check your connection and try again.")
        return
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amountInPaise,
        currency: data.currency,
        name: "Wedding Guest Manager",
        description: `${data.planName ?? planName} plan`,
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              toast.error(verifyData.error || "Payment verification failed")
              setError(verifyData.error || "Payment verification failed")
              return
            }
            toast.success("Payment received — your plan is active")
            router.push(`/dashboard/billing?weddingId=${encodeURIComponent(weddingId)}`)
            router.refresh()
          } catch {
            toast.error("Payment received but verification failed. Contact support.")
            setError("Payment received but verification failed. Please contact support with your payment id.")
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            toast.message("Checkout closed before payment was completed")
          },
        },
        theme: { color: "#db2777" },
      })
      checkout.open()
    } catch (err) {
      console.error(err)
      setError("Something went wrong while starting checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/40 bg-rose-100 px-4 py-3 text-sm text-brand-danger">
          {error}
        </div>
      )}
      {confirmedQuote?.amountInPaise !== undefined && (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Plan price</dt><dd>{formatInr(confirmedQuote.baseAmountInPaise ?? confirmedQuote.amountInPaise)}</dd></div>
          {Boolean(confirmedQuote.taxRateBasisPoints) && <div className="flex justify-between"><dt>GST ({(confirmedQuote.taxRateBasisPoints ?? 0) / 100}%)</dt><dd>{formatInr(confirmedQuote.taxAmountInPaise ?? 0)}</dd></div>}
          <div className="flex justify-between font-semibold"><dt>Order total</dt><dd>{formatInr(confirmedQuote.amountInPaise)}</dd></div>
        </dl>
      )}
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-[#17130b] hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Starting checkout…" : `Pay ${confirmedQuote?.amountInPaise !== undefined ? formatInr(confirmedQuote.amountInPaise) : priceLabel}`}
      </button>
      <p className="text-center text-xs text-gray-500">
        Payments are processed securely by Razorpay. Your plan activates only after the payment is verified.
      </p>
      <p className="text-center text-xs">
        <Link href="/pricing" className="text-brand-primary hover:text-brand-primary-hover">Compare all plans</Link>
      </p>
    </div>
  )
}
