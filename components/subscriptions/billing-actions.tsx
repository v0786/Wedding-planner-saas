"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function BillingActions({
  hasActiveSubscription,
  cancelAtPeriodEnd,
}: {
  hasActiveSubscription: boolean
  cancelAtPeriodEnd: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function call(method: "POST" | "PATCH", body?: Record<string, unknown>) {
    setLoading(true)
    try {
      const res = await fetch("/api/subscription/cancel", {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Could not update the subscription")
        return
      }
      toast.success(method === "PATCH" ? "Subscription resumed" : "Subscription updated")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!hasActiveSubscription) return null

  if (cancelAtPeriodEnd) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => call("PATCH")}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? "Resuming…" : "Resume subscription"}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        if (window.confirm("Cancel at the end of the current billing period? You keep access until then.")) {
          call("POST", { immediate: false })
        }
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {loading ? "Cancelling…" : "Cancel at period end"}
    </button>
  )
}
