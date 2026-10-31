import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import UpgradeRequired from "@/components/subscriptions/upgrade-required"
import { getEntitlements } from "@/lib/subscriptions/service"
import { FEATURE_LABELS } from "@/lib/subscriptions/config"

export const dynamic = "force-dynamic"

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const access = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: { id: true, workspaceId: true },
  })
  if (!access) notFound()

  const entitlements = await getEntitlements(access.workspaceId)
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

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    include: {
      events: { orderBy: { order: "asc" } },
      guests: { select: { id: true, group: true } },
      rsvpSubmissions: {
        include: {
          familyMembers: true,
          eventResponses: true,
          answers: { include: { question: true } },
        },
      },
    },
  })
  if (!wedding) notFound()

  const submissions = wedding.rsvpSubmissions
  const confirmed = submissions.filter((rsvp) => rsvp.status === "confirmed")
  const pending = submissions.filter((rsvp) => rsvp.status === "pending")
  const declined = submissions.filter((rsvp) => rsvp.status === "declined")

  const headcount = submissions.reduce((total, rsvp) => total + 1 + rsvp.familyMembers.length, 0)
  const confirmedHeadcount = confirmed.reduce(
    (total, rsvp) => total + 1 + rsvp.familyMembers.length,
    0,
  )

  const dietCounts = new Map<string, number>()
  const addDiet = (value: string | null) => {
    const label = value?.trim()
    if (!label) return
    dietCounts.set(label, (dietCounts.get(label) ?? 0) + 1)
  }
  for (const rsvp of submissions) {
    addDiet(rsvp.dietaryPrefs)
    for (const member of rsvp.familyMembers) addDiet(member.dietaryPrefs)
  }
  const dietary = [...dietCounts.entries()].sort((a, b) => b[1] - a[1])

  const groups = new Map<string, { guests: number; responded: number; headcount: number }>()
  const respondedGuestIds = new Set(submissions.map((rsvp) => rsvp.guestId))
  for (const guest of wedding.guests) {
    const key = guest.group?.trim() || "Ungrouped"
    const entry = groups.get(key) ?? { guests: 0, responded: 0, headcount: 0 }
    entry.guests += 1
    if (respondedGuestIds.has(guest.id)) entry.responded += 1
    groups.set(key, entry)
  }
  for (const rsvp of submissions) {
    const key = wedding.guests.find((guest) => guest.id === rsvp.guestId)?.group?.trim() || "Ungrouped"
    const entry = groups.get(key)
    if (entry) entry.headcount += 1 + rsvp.familyMembers.length
  }

  const responseRate =
    wedding.guests.length === 0 ? 0 : Math.round((submissions.length / wedding.guests.length) * 100)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/weddings/${wedding.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          ← Back to wedding
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports — {wedding.name}</h1>
            <p className="text-sm text-gray-600">
              Based on {submissions.length} RSVP response(s) from {wedding.guests.length} guest(s).
            </p>
          </div>
          <a
            href={`/api/weddings/${wedding.id}/rsvps/export`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export RSVPs (CSV)
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Metric label="Invited" value={wedding.guests.length} />
        <Metric label="Responses" value={submissions.length} hint={`${responseRate}% response rate`} />
        <Metric label="Confirmed" value={confirmed.length} tone="text-green-600" />
        <Metric label="Pending" value={pending.length} tone="text-yellow-600" />
        <Metric label="Declined" value={declined.length} tone="text-red-600" />
        <Metric
          label="Confirmed headcount"
          value={confirmedHeadcount}
          hint={`${headcount} including all responses`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Event attendance</h2>
          {wedding.events.length === 0 ? (
            <p className="text-sm text-gray-500">No events have been created.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 text-left font-semibold text-gray-600">Event</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">Yes</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">No</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">Not sure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {wedding.events.map((event) => {
                    const responses = submissions.flatMap((rsvp) =>
                      rsvp.eventResponses.filter((response) => response.eventId === event.id),
                    )
                    const yes = responses.filter((response) => response.status === "yes").length
                    const no = responses.filter((response) => response.status === "no").length
                    const unsure = responses.filter((response) => response.status === "pending").length
                    return (
                      <tr key={event.id}>
                        <td className="py-2 text-gray-900">{event.name}</td>
                        <td className="py-2 text-right text-green-700">{yes}</td>
                        <td className="py-2 text-right text-red-700">{no}</td>
                        <td className="py-2 text-right text-yellow-700">{unsure}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Dietary summary</h2>
          {dietary.length === 0 ? (
            <p className="text-sm text-gray-500">No dietary preferences recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dietary.map(([label, count]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg bg-white p-5 shadow lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Groups</h2>
          {groups.size === 0 ? (
            <p className="text-sm text-gray-500">No guest groups recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 text-left font-semibold text-gray-600">Group</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">Guests</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">Responded</th>
                    <th scope="col" className="py-2 text-right font-semibold text-gray-600">Headcount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...groups.entries()].map(([name, stats]) => (
                    <tr key={name}>
                      <td className="py-2 text-gray-900">{name}</td>
                      <td className="py-2 text-right text-gray-700">{stats.guests}</td>
                      <td className="py-2 text-right text-gray-700">{stats.responded}</td>
                      <td className="py-2 text-right text-gray-700">{stats.headcount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-gray-900"}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
