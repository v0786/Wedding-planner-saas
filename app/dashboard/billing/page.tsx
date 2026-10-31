import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BillingActions from "@/components/subscriptions/billing-actions"
import { getEntitlements, getPlanConfigs, getUsageSummary } from "@/lib/subscriptions/service"
import { getPaymentHistory } from "@/lib/subscriptions/payments"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  billingLabel,
  formatInr,
  limitLabel,
  priceLabel,
} from "@/lib/subscriptions/config"

export const dynamic = "force-dynamic"

function formatDate(value: Date | string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" })
}

function Meter({
  label,
  current,
  max,
}: {
  label: string
  current: number
  max: number | null
}) {
  const percent = max === null || max === 0 ? (current > 0 ? 100 : 0) : Math.min(100, Math.round((current / max) * 100))
  const atLimit = max !== null && current >= max
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={atLimit ? "font-semibold text-red-600" : "font-medium text-gray-900"}>
          {current} / {max === null ? "∞" : max}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${atLimit ? "bg-red-500" : "bg-gradient-to-r from-pink-500 to-indigo-600"}`}
          style={{ width: `${Math.max(percent, current > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  if (!membership) redirect("/onboarding")

  const [entitlements, usage, payments, user, allPlans] = await Promise.all([
    getEntitlements(membership.workspaceId),
    getUsageSummary(membership.workspaceId),
    getPaymentHistory(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, isAdmin: true } }),
    getPlanConfigs(),
  ])
  const otherPlans = allPlans.filter((plan) => plan.code === "PRO" || plan.code === "PRIME")

  const isAdmin = Boolean(user && isAdminAllowed(user))

  const activePaid = entitlements.status === "ACTIVE" && entitlements.planCode !== "FREE"
  const firstWedding = usage.perWedding[0]

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & plan</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your subscription, usage and payment history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/pricing" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Compare plans
          </Link>
          {isAdmin && (
            <Link href="/dashboard/admin/plans" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
              Admin pricing
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{entitlements.plan.name}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  entitlements.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : entitlements.status === "PAST_DUE"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {entitlements.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{priceLabel(entitlements.plan)}</p>
            {activePaid && entitlements.currentPeriodEnd && (
              <p className="mt-1 text-xs text-gray-500">
                Current period ends {formatDate(entitlements.currentPeriodEnd)}
                {entitlements.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </p>
            )}
            {entitlements.pendingPlanCode && (
              <p className="mt-1 text-xs text-amber-700">
                Scheduled change to {entitlements.pendingPlanCode} at the end of this period.
              </p>
            )}
            {!activePaid && (
              <p className="mt-2 text-sm text-gray-600">
                You are on the Free plan. Upgrade for more weddings, guests and features.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!activePaid && (
              <Link
                href="/pricing"
                className="rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white hover:from-pink-700 hover:to-indigo-700"
              >
                Upgrade plan
              </Link>
            )}
            <BillingActions
              hasActiveSubscription={activePaid}
              cancelAtPeriodEnd={entitlements.cancelAtPeriodEnd}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Meter label="Weddings" current={usage.workspaceUsage.weddings} max={entitlements.limits.weddings} />
          {firstWedding && (
            <>
              <Meter label={`Guests · ${firstWedding.weddingName}`} current={firstWedding.usage.guests} max={entitlements.limits.guestsPerWedding} />
              <Meter label="Events per wedding" current={firstWedding.usage.events} max={entitlements.limits.eventsPerWedding} />
              <Meter label="Custom questions" current={firstWedding.usage.customQuestions} max={entitlements.limits.customQuestionsPerWedding} />
            </>
          )}
        </div>

        <div className="mt-6 grid gap-2 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <p key={key} className={entitlements.features[key] ? "text-gray-700" : "text-gray-400"}>
              <span aria-hidden="true">{entitlements.features[key] ? "✓" : "✕"}</span>{" "}
              {FEATURE_LABELS[key].label}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Other plans</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {otherPlans.map((plan) => {
            const isCurrent = plan.code === entitlements.planCode
            const isDowngrade = plan.rank < entitlements.plan.rank
            return (
              <div key={plan.code} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {isCurrent && <span className="text-xs font-medium text-indigo-700">Current</span>}
                </div>
                <p className="mt-1 text-sm text-gray-600">{priceLabel(plan)} · {billingLabel(plan.billingPeriodDays)}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {limitLabel(plan.limits.weddings, "weddings")}, {limitLabel(plan.limits.guestsPerWedding, "guestsPerWedding")}
                </p>
                {!isCurrent && !isDowngrade && (
                  <Link href={`/dashboard/billing/checkout?plan=${plan.code}`} className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    Choose {plan.name} →
                  </Link>
                )}
                {!isCurrent && isDowngrade && (
                  <p className="mt-3 text-xs text-gray-500">Available after your current plan ends.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment history</h2>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Plan</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-3 text-gray-600">{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{payment.planCode}</td>
                    <td className="px-6 py-3 text-gray-700">{formatInr(payment.amountInPaise)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-500">
        Questions about a payment? Contact support with your Razorpay payment id. Access is never removed before the
        end of a paid period.
      </p>
    </main>
  )
}
