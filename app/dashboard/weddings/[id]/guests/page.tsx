import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GuestManager, { type GuestRecord } from "@/components/wedding/guest-manager"
import Link from "next/link"

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
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Back to wedding
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Guests — {wedding.name}</h1>
      <GuestManager
        weddingId={wedding.id}
        initialGuests={initialGuests}
        initialPagination={{ page: 1, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) }}
        groups={groups}
      />
    </main>
  )
}
