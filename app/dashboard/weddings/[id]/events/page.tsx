import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EventManager, { type EventRecord } from "@/components/wedding/event-manager"
import Link from "next/link"

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
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Back to wedding
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Manage Events</h1>
      <EventManager weddingId={wedding.id} initialEvents={events} />
    </main>
  )
}
