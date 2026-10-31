import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  LIMIT_KEYS,
  LIMIT_LABELS,
  billingLabel,
  limitLabel,
  priceLabel,
} from "@/lib/subscriptions/config"
import { getEntitlements } from "@/lib/subscriptions/service"
import { getPublicPlans } from "@/lib/subscriptions/payments"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pricing · Wedding Guest Manager",
  description: "Compare the Free, Pro and Prime plans for your wedding invitations and RSVPs.",
}

export default async function PricingPage() {
  const catalog = await getPublicPlans()

  const session = await auth()
  let currentPlanCode: string | null = null
  let signedIn = false
  if (session?.user?.id) {
    signedIn = true
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    })
    if (membership) {
      const entitlements = await getEntitlements(membership.workspaceId)
      currentPlanCode = entitlements.planCode
    }
  }

  return (
    <main className="min-h-screen bg-ivory-50">
      <div className="border-b border-ivory-200/70 bg-ivory-100/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href={signedIn ? "/dashboard" : "/"}
            className="text-sm font-medium text-ink-600 transition-colors hover:text-gold-700"
          >
            ← Back
          </Link>
          {signedIn ? (
            <Link
              href="/dashboard/billing"
              className="text-sm font-medium text-ink-600 transition-colors hover:text-gold-700"
            >
              Billing
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-ink-600 transition-colors hover:text-gold-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Simple pricing</p>
          <h1 className="mt-4 font-display text-display-xs text-ink-800 sm:text-display-sm">
            Choose the plan that fits your celebration
          </h1>
          <p className="lede mx-auto mt-4 max-w-2xl">
            Start free, then unlock more weddings, bigger guest lists and rich RSVP tools. Plans are prepaid and
            billed in Indian Rupees.
          </p>
          <div className="mx-auto mt-9 max-w-xs">
            <div className="gold-hairline" />
          </div>
        </header>

        {!catalog.paymentsConfigured && (
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-champagne-300 bg-champagne-100/70 px-5 py-4 text-center text-sm leading-relaxed text-gold-700">
            Online payments are not configured yet. Paid plans show their availability and pricing once they are
            opened by the operator.
          </div>
        )}

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-start">
          {catalog.plans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode
            const currentRank =
              catalog.plans.find((candidate) => candidate.code === currentPlanCode)?.rank ?? -1
            const isDowngrade = !isCurrent && currentRank >= 0 && plan.rank < currentRank
            const highlight = plan.code === "PRO"
            return (
              <section
                key={plan.code}
                className={`relative flex flex-col rounded-3xl border bg-white p-7 ${
                  highlight
                    ? "border-gold-300 shadow-lift ring-1 ring-gold-200"
                    : "border-ivory-300/70 shadow-soft"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-gold-sheen px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white shadow-glow">
                    Most popular
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl text-ink-800">{plan.name}</h2>
                    <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>
                  </div>
                  {isCurrent && (
                    <span className="pill shrink-0 bg-champagne-200 text-gold-700">Current</span>
                  )}
                </div>

                <div className="mt-6">
                  <p
                    className={`font-display text-[2.25rem] leading-tight tracking-[-0.01em] ${
                      plan.priceInPaise === null && plan.code !== "FREE" ? "text-gold-700" : "text-ink-800"
                    }`}
                  >
                    {priceLabel(plan)}
                  </p>
                  <p className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    {plan.code === "FREE" ? "Forever free" : billingLabel(plan.billingPeriodDays)}
                  </p>
                  {plan.priceInPaise === null && plan.code !== "FREE" && (
                    <p className="mt-3 inline-flex rounded-full bg-champagne-100 px-3 py-1 text-xs font-medium text-gold-700">
                      Pricing has not been published yet.
                    </p>
                  )}
                </div>

                <p className="mt-5 text-sm leading-relaxed text-ink-500">{plan.description}</p>

                <div className="gold-hairline mt-6" />

                <ul className="mt-6 space-y-2.5 text-sm text-ink-600">
                  {LIMIT_KEYS.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <span
                        className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-400"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-medium text-ink-700">{LIMIT_LABELS[key].label}:</span>{" "}
                        {limitLabel(plan.limits[key], key)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 border-t border-ivory-200 pt-5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-400">Features</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {FEATURE_KEYS.map((key) => {
                      const included = plan.features[key]
                      return (
                        <li key={key} className={included ? "text-ink-600" : "text-ink-300"}>
                          <span aria-hidden="true" className={included ? "text-gold-600" : "text-ink-300"}>
                            {included ? "✓" : "✕"}
                          </span>{" "}
                          {FEATURE_LABELS[key].label}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="mt-auto pt-8">
                  {isCurrent ? (
                    <Link
                      href="/dashboard/billing"
                      className="btn btn-secondary w-full"
                    >
                      Manage plan
                    </Link>
                  ) : plan.code === "FREE" ? (
                    <Link
                      href={signedIn ? "/dashboard/billing" : "/auth/register"}
                      className="btn btn-secondary w-full"
                    >
                      {signedIn ? "Included by default" : "Start free"}
                    </Link>
                  ) : isDowngrade ? (
                    <Link href="/dashboard/billing" className="btn btn-secondary w-full">
                      Available after your current plan
                    </Link>
                  ) : plan.purchasable ? (
                    <Link
                      href={signedIn ? `/dashboard/billing/checkout?plan=${plan.code}` : `/auth/login?next=/pricing`}
                      className="btn btn-primary w-full"
                    >
                      Upgrade to {plan.name}
                    </Link>
                  ) : (
                    <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-dashed border-gold-300 bg-champagne-100 px-5 py-2.5 text-sm font-semibold text-gold-700">
                      Coming Soon
                    </span>
                  )}
                </div>
              </section>
            )
          })}
        </div>

        <section className="table-shell mt-16">
          <div className="border-b border-ivory-200 px-5 py-5 sm:px-7">
            <h2 className="font-display text-xl text-ink-800">Compare plans</h2>
            <p className="mt-1 text-sm text-ink-500">Every limit and feature, side by side.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="table-cell font-semibold">What you get</th>
                  {catalog.plans.map((plan) => (
                    <th key={plan.code} className="table-cell font-semibold">{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {LIMIT_KEYS.map((key) => (
                  <tr key={key}>
                    <td className="table-cell font-medium text-ink-700">{LIMIT_LABELS[key].label}</td>
                    {catalog.plans.map((plan) => (
                      <td key={plan.code} className="table-cell text-ink-600">
                        {limitLabel(plan.limits[key], key)}
                      </td>
                    ))}
                  </tr>
                ))}
                {FEATURE_KEYS.map((key) => (
                  <tr key={key}>
                    <td className="table-cell font-medium text-ink-700">{FEATURE_LABELS[key].label}</td>
                    {catalog.plans.map((plan) => (
                      <td key={plan.code} className="table-cell">
                        {plan.features[key] ? (
                          <span className="text-gold-600" aria-label="Included">
                            ✓
                          </span>
                        ) : (
                          <span className="text-ink-300" aria-label="Not included">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 text-center text-xs leading-relaxed text-ink-400">
          Upgrades apply immediately after a verified payment. Cancellations apply at the end of the current billing
          period. Prices are set by the operator and shown in INR.
        </p>
      </div>
    </main>
  )
}
