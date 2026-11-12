import Link from "next/link"
import Script from "next/script"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import CheckoutClient from "@/components/subscriptions/checkout-client"
import { getPlanConfig } from "@/lib/subscriptions/service"
import { formatInr, isPlanCode } from "@/lib/subscriptions/config"
import { getRazorpayConfig } from "@/lib/subscriptions/razorpay"
import { getWeddingCheckoutBreakdown } from "@/lib/subscriptions/payments"
import { getWeddingAccess } from "@/lib/wedding-access"
import { isWeddingExpired, weddingExpiry } from "@/lib/wedding-lifecycle"
import type { TaxQuote } from "@/lib/settings"
import { ApiError } from "@/lib/errors"

export const dynamic = "force-dynamic"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ weddingId?: string; plan?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?next=/dashboard/billing")

  const { weddingId, plan: code } = await searchParams
  if (!weddingId) redirect("/dashboard/billing")
  if (!isPlanCode(code) || code === "FREE") notFound()
  const [plan, wedding] = await Promise.all([getPlanConfig(code), getWeddingAccess(weddingId, session.user.id)])
  if (!wedding) notFound()

  let quote: TaxQuote | null = null
  let error = ""
  if (isWeddingExpired(wedding)) error = "This wedding has expired and is read-only."
  else if (!weddingExpiry(wedding)) error = "Set the wedding date before choosing a plan."
  else {
    try {
      quote = await getWeddingCheckoutBreakdown(wedding.id, plan)
      if (!getRazorpayConfig()) error = "Online payment is currently unavailable."
    } catch (failure) {
      if (!(failure instanceof ApiError)) throw failure
      error = failure.message
    }
  }

  const back = `/dashboard/billing?weddingId=${encodeURIComponent(wedding.id)}`
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link href={back} className="text-sm font-medium text-gold-500 hover:text-indigo-700">← Wedding billing</Link>
      <section className="mt-6 rounded-2xl border border-ivory-200 bg-brand-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-ink-900">{plan.name} for {wedding.name}</h1>
        <p className="mt-2 text-sm text-ink-600">One-time payment. Access runs through the wedding date.</p>
        {quote && (
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Plan price</dt><dd>{formatInr(quote.baseAmountInPaise)}</dd></div>
            {quote.taxRateBasisPoints > 0 && (
              <div className="flex justify-between"><dt>GST ({quote.taxRateBasisPoints / 100}%{quote.taxInclusive ? ", included" : ""})</dt><dd>{formatInr(quote.taxAmountInPaise)}</dd></div>
            )}
            <div className="flex justify-between font-semibold"><dt>Total payable</dt><dd>{formatInr(quote.amountInPaise)}</dd></div>
          </dl>
        )}
        <div className="mt-6">
          {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p> : quote !== null && (
            <>
              <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
              <CheckoutClient weddingId={wedding.id} planCode={plan.code} planName={plan.name} priceLabel={formatInr(quote.amountInPaise)} expectedAmountInPaise={quote.amountInPaise} />
            </>
          )}
        </div>
      </section>
    </main>
  )
}
