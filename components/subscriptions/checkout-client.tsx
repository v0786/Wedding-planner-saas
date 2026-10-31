"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

type CheckoutResponse = {
  requiresPayment: boolean
  scheduled?: boolean
  message?: string
  orderId?: string
  amountInPaise?: number
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
  signedIn,
}: {
  planCode: string
  planName: string
  priceLabel: string
  signedIn: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function startCheckout() {
    if (!signedIn) {
      router.push(`/auth/login?next=/dashboard/billing/checkout?plan=${planCode}`)
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      })
      const data = (await res.json()) as CheckoutResponse & { error?: string; code?: string }

      if (!res.ok) {
        setError(data.error || "Could not start checkout")
        toast.error(data.error || "Could not start checkout")
        return
      }

      if (data.requiresPayment === false) {
        toast.success(data.message || "Plan change scheduled")
        router.push("/dashboard/billing")
        router.refresh()
        return
      }

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
            router.push("/dashboard/billing")
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
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-pink-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Starting checkout…" : signedIn ? `Pay ${priceLabel}` : "Sign in to continue"}
      </button>
      <p className="text-center text-xs text-gray-500">
        Payments are processed securely by Razorpay. Your plan activates only after the payment is verified.
      </p>
      <p className="text-center text-xs">
        <Link href="/pricing" className="text-indigo-600 hover:text-indigo-700">Compare all plans</Link>
      </p>
    </div>
  )
}
