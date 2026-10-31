import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ButtonLink } from "@/components/ui/button"
import Badge from "@/components/ui/badge"

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

  const couple =
    `${wedding.coupleName1}${wedding.coupleName2 ? ` & ${wedding.coupleName2}` : ""}`

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Celebration"
        title={wedding.name}
        description={couple}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/dashboard/weddings/${wedding.id}/edit`} variant="secondary" size="sm">
              Edit details
            </ButtonLink>
            <ButtonLink href={`/dashboard/weddings/${wedding.id}/invite`} variant="primary" size="sm">
              Invitation
            </ButtonLink>
          </div>
        }
      />

      {/* Hero strip */}
      <section className="card-elevated paper-texture overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-ivory-200 bg-champagne-100/40 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-display-xs text-ink-800">{couple}</h2>
              <Badge tone={wedding.published ? "success" : "neutral"}>
                {wedding.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              {wedding.date && (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gold-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(wedding.date).toLocaleDateString("en-IN", { dateStyle: "long" })}
                </span>
              )}
              {wedding.venue && (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gold-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {wedding.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        {wedding.rsvpDeadline && (
          <div className="flex items-start gap-3 border-b border-champagne-200 bg-champagne-100/60 px-6 py-4 text-sm text-gold-700 sm:px-8">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.7}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p>
              RSVP deadline:{" "}
              {new Date(wedding.rsvpDeadline).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-px bg-ivory-200/70 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Total Guests" value={wedding.guests.length} />
          <Stat label="Headcount" value={headcount} hint="Including family members" />
          <Stat label="Confirmed" value={confirmed} tone="text-sage-600" />
          <Stat label="Pending" value={pending} tone="text-gold-600" />
          <Stat label="Declined" value={declined} tone="text-rose-600" />
        </div>
      </section>

      {/* Section navigation */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href={`/dashboard/weddings/${wedding.id}/events`}
          title={`Events (${wedding.events.length})`}
          description="Manage the wedding schedule"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </NavCard>
        <NavCard
          href={`/dashboard/weddings/${wedding.id}/guests`}
          title={`Guests (${wedding.guests.length})`}
          description="Manage the guest list and CSV import"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </NavCard>
        <NavCard
          href={`/dashboard/weddings/${wedding.id}/reports`}
          title="Reports"
          description="Attendance, dietary and event summaries"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15M7.5 16V9m4.5 7V4.5m4.5 11.5v-5" />
        </NavCard>
        <NavCard
          href={`/dashboard/weddings/${wedding.id}/questions`}
          title={`Custom Questions (${wedding.customQuestions.length})`}
          description="Manage RSVP questions"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75m0 3h.008v.008H12v-.008z"
          />
        </NavCard>
        <NavCard
          href={`/dashboard/weddings/${wedding.id}/invite`}
          title="Invitation"
          description="Publish and share the RSVP link"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </NavCard>
      </div>

      {wedding.events.length > 0 && (
        <section className="mt-8">
          <Card className="overflow-hidden">
            <CardHeader title="Schedule" />
            <CardBody className="p-0">
              <ul className="divide-y divide-ivory-200">
                {wedding.events.map((event) => (
                  <li key={event.id} className="flex flex-wrap justify-between gap-2 px-6 py-4">
                    <div>
                      <p className="font-display text-lg text-ink-800">{event.name}</p>
                      <p className="mt-0.5 text-sm text-ink-500">
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
            </CardBody>
          </Card>
        </section>
      )}

      {wedding.auditLogs.length > 0 && (
        <section className="mt-8">
          <Card className="overflow-hidden">
            <CardHeader title="Recent activity" />
            <CardBody className="p-0">
              <ul className="divide-y divide-ivory-200 text-sm">
                {wedding.auditLogs.map((log) => (
                  <li key={log.id} className="flex flex-wrap justify-between gap-2 px-6 py-3.5 text-ink-600">
                    <span>{log.action.replace(/[._]/g, " ")}</span>
                    <time dateTime={log.createdAt.toISOString()} className="text-ink-400">
                      {log.createdAt.toLocaleString("en-IN")}
                    </time>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="bg-white/85 px-5 py-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={`mt-1.5 font-display text-3xl ${tone ?? "text-ink-800"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

function NavCard({
  href,
  title,
  description,
  children,
}: {
  href: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group card flex items-start gap-4 p-5 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-lift"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-champagne-100 text-gold-700 transition-colors duration-300 group-hover:bg-gold-200/70">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.7}
          aria-hidden="true"
        >
          {children}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-snug text-ink-800 transition-colors group-hover:text-gold-700">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-500">{description}</span>
      </span>
    </Link>
  )
}
