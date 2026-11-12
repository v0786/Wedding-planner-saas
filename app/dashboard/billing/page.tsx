import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getWeddingEntitlements } from "@/lib/subscriptions/service"
import { getPaymentHistory, getPublicPlans } from "@/lib/subscriptions/payments"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"
import { formatInr, weddingPriceLabel } from "@/lib/subscriptions/config"
import { weddingExpiry } from "@/lib/wedding-lifecycle"

export const dynamic = "force-dynamic"

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ weddingId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?next=/dashboard/billing")
  const userId = session.user.id
  const { weddingId } = await searchParams
  const [weddings, payments, user, catalog] = await Promise.all([
    prisma.wedding.findMany({
      where: { workspace: { members: { some: { userId } } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, date: true, timezone: true, workspaceId: true },
    }),
    getPaymentHistory(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, isAdmin: true, emailVerified: true } }),
    getPublicPlans(),
  ])
  const selected = weddingId ? weddings.find((wedding) => wedding.id === weddingId) : weddings[0]
  const entitlements = selected ? await getWeddingEntitlements(selected.workspaceId, selected.id) : null
  const expiry = selected && weddingExpiry(selected)

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink-900">Wedding billing</h1>
          <p className="mt-1 text-sm text-ink-600">Choose a plan for each wedding and see its payment history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing" className="btn btn-secondary">Compare plans</Link>
          {user && isAdminAllowed(user) && (
            <Link href="/dashboard/admin/plans" className="btn btn-primary">Admin pricing</Link>
          )}
        </div>
      </header>

      {weddings.length === 0 ? (
        <section className="rounded-2xl border border-ivory-200 bg-brand-surface p-6">
          <h2 className="text-lg font-semibold">Create a wedding first</h2>
          <p className="mb-4 mt-1 text-sm text-ink-600">Add a wedding and its date before purchasing a plan.</p>
          <Link href="/dashboard/weddings/new" className="btn btn-primary">Create wedding</Link>
        </section>
      ) : (
        <nav aria-label="Choose a wedding" className="flex flex-wrap gap-2">
          {weddings.map((wedding) => (
            <Link
              key={wedding.id}
              href={`/dashboard/billing?weddingId=${encodeURIComponent(wedding.id)}`}
              aria-current={selected?.id === wedding.id ? "page" : undefined}
              className={`btn ${selected?.id === wedding.id ? "btn-primary" : "btn-secondary"}`}
            >
              {wedding.name}
            </Link>
          ))}
        </nav>
      )}

      {selected && entitlements ? (
        <section className="space-y-5 rounded-2xl border border-ivory-200 bg-brand-surface p-6">
          <div>
            <h2 className="text-xl font-semibold">{selected.name}</h2>
            <p className="mt-1 text-sm text-ink-600">
              {entitlements.status === "ACTIVE" ? `Current access: ${entitlements.plan.name}` :
                entitlements.status === "EXPIRED" ? "Expired · Read only" : "Choose a one-time plan"}
            </p>
            {expiry && (
              <p className="mt-1 text-sm text-ink-600">
                Access ends {expiry.toLocaleString("en-IN", {
                  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
                })}
              </p>
            )}
          </div>
          {!selected.date && (
            <Link href={`/dashboard/weddings/${selected.id}/edit`} className="btn btn-secondary">Set wedding date</Link>
          )}
          {selected.date && entitlements.status !== "EXPIRED" && (
            <div className="grid gap-4 sm:grid-cols-3">
              {catalog.plans.map((plan) => (
                <div key={plan.code} className="rounded-xl border border-ivory-200 p-4">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="my-2 text-sm text-ink-600">{weddingPriceLabel(plan)} per wedding</p>
                  {plan.purchasable && (
                    <Link
                      href={`/dashboard/billing/checkout?weddingId=${encodeURIComponent(selected.id)}&plan=${plan.code}`}
                      className="btn btn-secondary"
                    >
                      Review {plan.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : weddingId ? <p className="text-sm text-ink-600">Select one of your weddings to manage its plan.</p> : null}

      <section className="rounded-2xl border border-ivory-200 bg-brand-surface p-6">
        <h2 className="text-lg font-semibold">Payment history</h2>
        {payments.length === 0 ? <p className="mt-2 text-sm text-ink-600">No payments yet.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead><tr>
                <th className="py-2 pr-4">Wedding</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Reference</th>
              </tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-ivory-100">
                    <td className="py-3 pr-4">{payment.wedding?.name ?? "Historical payment"}</td>
                    <td className="py-3 pr-4">{payment.planCode}</td>
                    <td className="py-3 pr-4">{formatInr(payment.amountInPaise)}</td>
                    <td className="py-3 pr-4">{payment.status}</td>
                    <td className="py-3 pr-4">{payment.providerPaymentId ?? payment.receipt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
