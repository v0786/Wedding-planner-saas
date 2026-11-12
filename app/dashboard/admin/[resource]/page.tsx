import Link from "next/link"
import { notFound } from "next/navigation"
import { ZodError } from "zod"
import { ADMIN_RESOURCES, adminResource, getAdminListing } from "@/lib/admin-overview"
import { requireAdmin } from "@/lib/subscriptions/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Query = { page?: string; reason?: string }

export default async function AdminResourcePage({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<Query> }) {
  await requireAdmin()
  const resource = adminResource((await params).resource)
  if (!resource) notFound()
  const query = await searchParams
  let listing: Awaited<ReturnType<typeof getAdminListing>> | undefined
  let error = ""
  if (query.reason) {
    try { listing = await getAdminListing(resource, query) }
    catch (issue) {
      if (!(issue instanceof ZodError)) throw issue
      error = issue.issues[0].message
    }
  }
  const pageLink = (page: number) => `/dashboard/admin/${resource}?${new URLSearchParams({ reason: listing?.reason ?? "", page: String(page) })}`
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/dashboard/admin" className="text-sm text-ink-500">Back to administrator overview</Link>
      <h1 className="font-display text-3xl text-ink-900">{ADMIN_RESOURCES[resource]}</h1>
      <form method="get" className="space-y-3 rounded-xl border border-ivory-200 bg-white p-5">
        <label htmlFor="admin-purpose" className="block text-sm font-medium">Administrative purpose</label>
        <p id="purpose-hint" className="text-sm text-ink-500">Record why you need access. Use a support reference or general purpose and keep guest details and secrets out of this field.</p>
        <input id="admin-purpose" name="reason" required minLength={12} maxLength={300} defaultValue={query.reason ?? ""} aria-describedby="purpose-hint" className="input w-full" />
        <button type="submit" className="btn btn-primary">Open audited list</button>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
      {listing && <>
        <p className="text-sm text-ink-500">{listing.total} records · Page {listing.page}</p>
        {resource === "retention" && <p className="text-sm text-ink-500">This view shows eligibility dates. The retention worker stays in dry-run mode until deletion is explicitly enabled.</p>}
        <div className="overflow-x-auto rounded-xl border border-ivory-200 bg-white">
          <table className="w-full text-left text-sm"><thead><tr>{listing.columns.map(column => <th key={column} scope="col" className="whitespace-nowrap border-b border-ivory-200 px-4 py-3 font-medium">{column}</th>)}</tr></thead>
            <tbody>{listing.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-sm break-words border-b border-ivory-100 px-4 py-3 align-top">{cell}</td>)}</tr>)}</tbody>
          </table>
          {listing.rows.length === 0 && <p className="p-5 text-sm text-ink-500">No records on this page.</p>}
        </div>
        <nav aria-label="List pages" className="flex gap-4 text-sm">
          {listing.page > 1 && <Link href={pageLink(listing.page - 1)} className="btn btn-secondary">Previous</Link>}
          {listing.page * listing.pageSize < listing.total && <Link href={pageLink(listing.page + 1)} className="btn btn-secondary">Next</Link>}
        </nav>
      </>}
    </main>
  )
}
