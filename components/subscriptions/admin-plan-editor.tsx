"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  LIMIT_KEYS,
  LIMIT_LABELS,
  type PlanConfig,
} from "@/lib/subscriptions/config"

function PlanForm({
  plan,
  paymentsConfigured,
}: {
  plan: PlanConfig
  paymentsConfigured: boolean
}) {
  const router = useRouter()
  const isFree = plan.code === "FREE"
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description)
  const [priceRupees, setPriceRupees] = useState(
    plan.priceInPaise === null ? "" : String(plan.priceInPaise / 100),
  )
  const [billingPeriodDays, setBillingPeriodDays] = useState(String(plan.billingPeriodDays))
  const [isActive, setIsActive] = useState(plan.isActive)
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder))
  const [features, setFeatures] = useState({ ...plan.features })
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(
      LIMIT_KEYS.map((key) => [key, plan.limits[key] === null ? "" : String(plan.limits[key])]),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    const parsedPrice = priceRupees.trim() === "" ? null : Number(priceRupees)
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError("Price must be a positive number in rupees, or empty for Coming Soon.")
      setSaving(false)
      return
    }

    const payload = {
      name,
      description,
      priceInPaise: parsedPrice === null ? null : Math.round(parsedPrice * 100),
      billingPeriodDays: Number(billingPeriodDays),
      isActive,
      sortOrder: Number(sortOrder),
      features,
      limits: Object.fromEntries(
        LIMIT_KEYS.map((key) => {
          const raw = limits[key]?.trim() ?? ""
          return [key, raw === "" ? null : Math.max(0, Math.floor(Number(raw)))]
        }),
      ),
    }

    try {
      const res = await fetch(`/api/admin/plans/${plan.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not save the plan")
        return
      }
      setMessage("Plan saved. Changes are live immediately.")
      router.refresh()
    } catch {
      setError("Something went wrong while saving")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {plan.code} <span className="text-sm font-normal text-gray-500">· {name}</span>
        </h2>
        {!isFree && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Available for purchase
          </label>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Display name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Sort order</span>
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Description</span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Price (INR)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceRupees}
            disabled={isFree}
            placeholder="Leave empty for Coming Soon"
            onChange={(event) => setPriceRupees(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Empty = “Coming Soon”. {isFree ? "Free is always free." : "Stored in paise server-side."}
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Billing period (days)</span>
          <input
            type="number"
            min={1}
            value={billingPeriodDays}
            disabled={isFree}
            onChange={(event) => setBillingPeriodDays(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50"
          />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900">Limits</h3>
        <p className="text-xs text-gray-500">Leave a limit empty for unlimited. 0 means the item is not included.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {LIMIT_KEYS.map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-gray-700">{LIMIT_LABELS[key].label}</span>
              <input
                type="number"
                min={0}
                value={limits[key] ?? ""}
                placeholder="Unlimited"
                onChange={(event) => setLimits((current) => ({ ...current, [key]: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900">Features</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={(event) =>
                  setFeatures((current) => ({ ...current, [key]: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                {FEATURE_LABELS[key].label}
                <span className="block text-xs text-gray-500">{FEATURE_LABELS[key].description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {!isFree && isActive && priceRupees.trim() === "" && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This plan is marked available but has no price, so it will still show “Coming Soon” and cannot be bought.
        </p>
      )}
      {!paymentsConfigured && !isFree && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Razorpay keys are not configured. Prices can be saved, but checkout will remain disabled.
        </p>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-pink-700 hover:to-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : `Save ${plan.code}`}
        </button>
      </div>
    </form>
  )
}

export default function AdminPlanEditor({
  plans,
  paymentsConfigured,
}: {
  plans: PlanConfig[]
  paymentsConfigured: boolean
}) {
  return (
    <div className="space-y-6">
      {plans.map((plan) => (
        <PlanForm key={plan.code} plan={plan} paymentsConfigured={paymentsConfigured} />
      ))}
    </div>
  )
}
