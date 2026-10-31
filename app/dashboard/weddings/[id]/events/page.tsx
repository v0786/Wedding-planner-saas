import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EventManager, { type EventRecord } from "@/components/wedding/event-manager"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"

export default async function EventsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    include: { events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  })
  if (!wedding) notFound()

  const events: EventRecord[] = wedding.events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date?.toISOString() ?? null,
    time: event.time,
    venue: event.venue,
    address: event.address,
    description: event.description,
    order: event.order,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
  }))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/dashboard/weddings/${wedding.id}`}
        className="group inline-flex items-center gap-2 text-sm font-medium text-ink-500 transition-colors hover:text-gold-700"
      >
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to wedding
      </Link>

      <PageHeader
        eyebrow="Schedule"
        title="Manage Events"
        description={`Every function of ${wedding.name}, in the order your guests will arrive.`}
        className="mt-6"
      />

      <EventManager weddingId={wedding.id} initialEvents={events} />
    </main>
  )
}
