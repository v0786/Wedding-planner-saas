import Link from "next/link"
import { ADMIN_RESOURCES, getAdminOverview } from "@/lib/admin-overview"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview()
  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
      <div><p className="eyebrow">Platform administration</p><h1 className="mt-2 font-display text-3xl text-ink-900">Administrator overview</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Customers", overview.customers], ["Weddings", overview.weddings], ["Paid purchases", overview.paidPurchases], ["Pending payments", overview.pendingPayments]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ivory-200 bg-brand-surface p-5"><p className="text-sm text-ink-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>
        ))}
      </div>
      <nav aria-label="Platform administration" className="grid gap-3 sm:grid-cols-2">
        {Object.entries(ADMIN_RESOURCES).map(([resource, label]) => <Link key={resource} href={`/dashboard/admin/${resource}`} className="rounded-xl border border-ivory-200 bg-brand-surface p-5 font-medium hover:border-gold-400">{label}</Link>)}
        <Link href="/dashboard/admin/plans" className="rounded-xl border border-ivory-200 bg-brand-surface p-5 font-medium">Plan prices and features</Link>
        <Link href="/dashboard/admin/settings" className="rounded-xl border border-ivory-200 bg-brand-surface p-5 font-medium">Business, tax and advertisements</Link>
      </nav>
    </main>
  )
}
