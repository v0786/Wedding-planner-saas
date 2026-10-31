import Link from "next/link"
import Script from "next/script"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import CheckoutClient from "@/components/subscriptions/checkout-client"
import { getEntitlementsForUser, getPlanConfig } from "@/lib/subscriptions/service"
import { billingLabel, isPlanConfigured, priceLabel } from "@/lib/subscriptions/config"
import { getRazorpayConfig } from "@/lib/subscriptions/razorpay"

export const dynamic = "force-dynamic"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?next=/pricing")

  const { plan: rawPlan } = await searchParams
  const code = (rawPlan || "").toUpperCase()
  const plan = await getPlanConfig(code === "PRO" || code === "PRIME" ? code : "PRO")
  const current = await getEntitlementsForUser(session.user.id)
  const isRenewal = current.planCode === plan.code
  const isDowngrade = !isRenewal && plan.rank < current.plan.rank
  const paymentsReady = getRazorpayConfig() !== null
  const purchasable = plan.isActive && isPlanConfigured(plan) && (plan.priceInPaise ?? 0) > 0

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link href="/pricing" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Compare plans</Link>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          {isDowngrade ? "Plan change" : isRenewal ? `Renew ${plan.name}` : `Upgrade to ${plan.name}`}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{plan.description}</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Price</dt>
            <dd className="font-semibold text-gray-900">{priceLabel(plan)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Billing period</dt>
            <dd className="font-medium text-gray-900">{billingLabel(plan.billingPeriodDays)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-600">Payment provider</dt>
            <dd className="font-medium text-gray-900">Razorpay</dd>
          </div>
        </dl>

        <div className="mt-6">
          {isDowngrade ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You are on {current.plan.name}. Paid plans are prepaid, so a cheaper plan can be bought
              after the current period ends. Cancel from Billing to move to Free at period end.
            </p>
          ) : !paymentsReady ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Payments are not configured yet. Add the Razorpay keys to enable checkout.
            </p>
          ) : !purchasable ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {plan.name} is not available for purchase yet. Its price has not been published.
            </p>
          ) : (
            <>
              <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
              <CheckoutClient
                planCode={plan.code}
                planName={plan.name}
                priceLabel={priceLabel(plan)}
                signedIn
              />
            </>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-gray-500">
        Upgrades and renewals apply after a verified payment. No refunds; cancellations apply at period end.
      </p>
    </main>
  )
}
