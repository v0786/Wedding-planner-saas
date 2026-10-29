import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function WeddingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    include: {
      events: { orderBy: { order: "asc" } },
      guests: { select: { id: true } },
      rsvpSubmissions: {
        include: { familyMembers: { select: { id: true } } },
      },
      customQuestions: { select: { id: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  })

  if (!wedding) notFound()

  const confirmed = wedding.rsvpSubmissions.filter((rsvp) => rsvp.status === "confirmed").length
  const pending = wedding.rsvpSubmissions.filter((rsvp) => rsvp.status === "pending").length
  const declined = wedding.rsvpSubmissions.filter((rsvp) => rsvp.status === "declined").length
  const headcount = wedding.rsvpSubmissions.reduce(
    (total, rsvp) => total + 1 + rsvp.familyMembers.length,
    0,
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{wedding.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                wedding.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {wedding.published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="mt-1 text-lg text-gray-700">
            {wedding.coupleName1}
            {wedding.coupleName2 && ` & ${wedding.coupleName2}`}
          </p>
          {wedding.date && (
            <p className="text-sm text-gray-600">
              {new Date(wedding.date).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          )}
          {wedding.venue && <p className="text-sm text-gray-600">{wedding.venue}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/weddings/${wedding.id}/edit`}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit details
          </Link>
          <Link
            href={`/dashboard/weddings/${wedding.id}/invite`}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Invitation
          </Link>
        </div>
      </div>

      {wedding.rsvpDeadline && (
        <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          RSVP deadline:{" "}
          {new Date(wedding.rsvpDeadline).toLocaleDateString("en-IN", { dateStyle: "long" })}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total Guests" value={wedding.guests.length} />
        <Stat label="Headcount" value={headcount} hint="Including family members" />
        <Stat label="Confirmed" value={confirmed} tone="text-green-600" />
        <Stat label="Pending" value={pending} tone="text-yellow-600" />
        <Stat label="Declined" value={declined} tone="text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/dashboard/weddings/${wedding.id}/events`}
          className="rounded-lg bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-gray-900">Events ({wedding.events.length})</h2>
          <p className="mt-1 text-sm text-gray-600">Manage the wedding schedule</p>
        </Link>
        <Link
          href={`/dashboard/weddings/${wedding.id}/guests`}
          className="rounded-lg bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-gray-900">Guests ({wedding.guests.length})</h2>
          <p className="mt-1 text-sm text-gray-600">Manage the guest list and CSV import</p>
        </Link>
        <Link
          href={`/dashboard/weddings/${wedding.id}/reports`}
          className="rounded-lg bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-gray-900">Reports</h2>
          <p className="mt-1 text-sm text-gray-600">Attendance, dietary and event summaries</p>
        </Link>
        <Link
          href={`/dashboard/weddings/${wedding.id}/questions`}
          className="rounded-lg bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-gray-900">Custom Questions ({wedding.customQuestions.length})</h2>
          <p className="mt-1 text-sm text-gray-600">Manage RSVP questions</p>
        </Link>
        <Link
          href={`/dashboard/weddings/${wedding.id}/invite`}
          className="rounded-lg bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="font-semibold text-gray-900">Invitation</h2>
          <p className="mt-1 text-sm text-gray-600">Publish and share the RSVP link</p>
        </Link>
      </div>

      {wedding.events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Schedule</h2>
          <ul className="divide-y divide-gray-200 rounded-lg bg-white shadow">
            {wedding.events.map((event) => (
              <li key={event.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-600">
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                      : "Date not set"}
                    {event.time && ` · ${event.time}`}
                    {event.venue && ` · ${event.venue}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {wedding.auditLogs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent activity</h2>
          <ul className="space-y-2 rounded-lg bg-white p-4 text-sm shadow">
            {wedding.auditLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-4 text-gray-600">
                <span>{log.action.replace(/[._]/g, " ")}</span>
                <time dateTime={log.createdAt.toISOString()}>
                  {log.createdAt.toLocaleString("en-IN")}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-gray-900"}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
