import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GuestManager, { type GuestRecord } from "@/components/wedding/guest-manager"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: { id: true, name: true },
  })
  if (!wedding) notFound()

  const [total, guests, groupRows] = await Promise.all([
    prisma.guest.count({ where: { weddingId: id } }),
    prisma.guest.findMany({
      where: { weddingId: id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        rsvpSubmission: {
          include: { familyMembers: { select: { id: true } }, eventResponses: true },
        },
      },
    }),
    prisma.guest.findMany({
      where: { weddingId: id, group: { not: null } },
      distinct: ["group"],
      select: { group: true },
      orderBy: { group: "asc" },
    }),
  ])

  const initialGuests: GuestRecord[] = guests.map((guest) => ({
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    mobile: guest.mobile,
    email: guest.email,
    group: guest.group,
    notes: guest.notes,
    dietaryPrefs: guest.dietaryPrefs,
    rsvpSubmission: guest.rsvpSubmission
      ? {
          id: guest.rsvpSubmission.id,
          status: guest.rsvpSubmission.status,
          familyMembers: guest.rsvpSubmission.familyMembers,
          eventResponses: guest.rsvpSubmission.eventResponses,
          dietaryPrefs: guest.rsvpSubmission.dietaryPrefs,
        }
      : null,
  }))

  const groups = groupRows
    .map((row) => row.group)
    .filter((value): value is string => Boolean(value))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
        eyebrow="Guest list"
        title={`Guests — ${wedding.name}`}
        description="Build your guest list, import it from a spreadsheet and keep every RSVP in one place."
        className="mt-6"
      />

      <GuestManager
        weddingId={wedding.id}
        initialGuests={initialGuests}
        initialPagination={{ page: 1, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) }}
        groups={groups}
      />
    </main>
  )
}
