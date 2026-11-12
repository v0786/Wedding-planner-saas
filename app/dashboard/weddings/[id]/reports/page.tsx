import ReportExportControls from "@/components/wedding/report-export-controls"
import { contactsAreVisible } from "@/lib/wedding-settings"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import UpgradeRequired from "@/components/subscriptions/upgrade-required"
import { getWeddingEntitlements } from "@/lib/subscriptions/service"
import { getWeddingReport } from "@/lib/wedding-report"
import PrintButton from "@/components/ui/print-button"
import { FEATURE_LABELS } from "@/lib/subscriptions/config"

export const dynamic = "force-dynamic"

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: { id: true, workspaceId: true, name: true, contactVisibility: true },
  })
  if (!wedding) notFound()

  const entitlements = await getWeddingEntitlements(wedding.workspaceId, wedding.id)
  if (!entitlements.features.reports) {
    return (
      <UpgradeRequired
        title="Reports are a premium feature"
        description="Upgrade to see attendance, meal preferences and group-level response rates for this wedding."
        featureLabel={FEATURE_LABELS.reports.label}
        planName={entitlements.plan.name}
      />
    )
  }

  const { summary, attendance, dietary, groups } = await getWeddingReport(wedding.id)

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:!p-0">
      <div className="mb-6">
        <Link
          href={`/dashboard/weddings/${wedding.id}`}
          className="text-sm text-brand-primary hover:text-brand-primary-hover print:hidden"
        >
          ← Back to wedding
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-900">Reports — {wedding.name}</h1>
            <p className="text-sm text-brand-text-muted">
              Based on {summary.responses} RSVP response(s) from {summary.invited} guest(s).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            {entitlements.features.csvExport && (
              <>
                <a href={`/api/weddings/${wedding.id}/reports/export`} className="btn btn-secondary btn-sm">
                  Export summary (CSV)
                </a>
                <a href={`/api/weddings/${wedding.id}/rsvps/export`} className="btn btn-secondary btn-sm">
                  Export RSVPs (CSV)
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {entitlements.features.csvExport && <ReportExportControls weddingId={wedding.id} includeContacts={contactsAreVisible(wedding)} events={attendance} />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-7">
        <Metric label="Invited" value={summary.invited} />
        <Metric label="Responses" value={summary.responses} hint={`${summary.responseRate}% response rate`} />
        <Metric label="Confirmed" value={summary.confirmed} tone="text-brand-success" />
        <Metric label="Maybe" value={summary.maybe} tone="text-brand-warning" />
        <Metric label="Pending" value={summary.pending} tone="text-brand-warning" />
        <Metric label="Declined" value={summary.declined} tone="text-brand-danger" />
        <Metric
          label="Confirmed headcount"
          value={summary.confirmedHeadcount}
          hint="Accepted party sizes, including unnamed companions"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 print:!block print:space-y-5">
        <section className="rounded-2xl border border-brand-border bg-brand-surface shadow-soft p-5 print:shadow-none">
          <h2 className="mb-3 text-lg font-display font-semibold text-ink-900">Event attendance</h2>
          <p className="mb-3 text-sm text-brand-text-muted">Counts show people in each responding party.</p>
          {attendance.length === 0 ? (
            <p className="text-sm text-brand-text-muted">No events have been created.</p>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full divide-y divide-brand-border text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 text-left font-semibold text-brand-text-muted">Event</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">Yes</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">No</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">Not sure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {attendance.map((event) => (
                    <tr key={event.id} className="break-inside-avoid">
                      <td className="py-2 text-ink-900">{event.name}</td>
                      <td className="py-2 text-right text-brand-success">{event.yes}</td>
                      <td className="py-2 text-right text-brand-danger">{event.no}</td>
                      <td className="py-2 text-right text-brand-warning">{event.unsure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface shadow-soft p-5 print:shadow-none">
          <h2 className="mb-3 text-lg font-display font-semibold text-ink-900">Dietary summary</h2>
          {dietary.length === 0 ? (
            <p className="text-sm text-brand-text-muted">No dietary preferences recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dietary.map(([label, count]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span className="text-brand-text">{label}</span>
                  <span className="font-medium text-ink-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface shadow-soft p-5 print:shadow-none lg:col-span-2">
          <h2 className="mb-3 text-lg font-display font-semibold text-ink-900">Groups</h2>
          {groups.size === 0 ? (
            <p className="text-sm text-brand-text-muted">No guest groups recorded yet.</p>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full divide-y divide-brand-border text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 text-left font-semibold text-brand-text-muted">Group</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">Guests</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">Responded</th>
                    <th scope="col" className="py-2 text-right font-semibold text-brand-text-muted">Headcount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {[...groups.entries()].map(([name, stats]) => (
                    <tr key={name} className="break-inside-avoid">
                      <td className="py-2 text-ink-900">{name}</td>
                      <td className="py-2 text-right text-brand-text-muted">{stats.guests}</td>
                      <td className="py-2 text-right text-brand-text-muted">{stats.responded}</td>
                      <td className="py-2 text-right text-brand-text-muted">{stats.headcount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function Metric({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-brand-surface p-4 shadow-soft border border-brand-border">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-ink-900"}`}>{value}</p>
      {hint && <p className="text-xs text-brand-text-muted">{hint}</p>}
    </div>
  )
}
