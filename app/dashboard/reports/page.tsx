import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = { title: "Reports | Wedding Guest Manager" }

export default async function AllReportsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const weddings = await prisma.wedding.findMany({
    where: { workspace: { members: { some: { userId: session.user.id } } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { guests: true, rsvpSubmissions: true, events: true } },
    },
  })

  return (
    <main className="space-y-6">
      <h1 className="mb-2 font-display text-3xl sm:text-4xl text-ink-900">Reports</h1>
      <p className="mb-6 text-sm text-ink-600">Choose a wedding to view detailed attendance reports.</p>

      {weddings.length === 0 ? (
        <div className="rounded-lg bg-brand-surface p-8 text-center text-ink-500 shadow">
          No weddings yet.{" "}
          <Link href="/dashboard/weddings/new" className="text-gold-500 hover:text-gold-400">
            Create one
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-ivory-200 rounded-lg bg-brand-surface shadow">
          {weddings.map((wedding) => (
            <li key={wedding.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-ink-900">{wedding.name}</p>
                <p className="text-sm text-ink-600">
                  {wedding._count.guests} guests · {wedding._count.rsvpSubmissions} RSVPs ·{" "}
                  {wedding._count.events} events
                </p>
              </div>
              <Link
                href={`/dashboard/weddings/${wedding.id}/reports`}
                className="rounded-md border border-ivory-300 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ivory-50"
              >
                View report
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
