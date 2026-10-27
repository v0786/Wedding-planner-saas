import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function WeddingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findUnique({
    where: { id },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
      events: true,
      guests: true,
      rsvpSubmissions: true,
    },
  })

  if (!wedding || wedding.workspace.members.length === 0) {
    redirect("/dashboard")
  }

  const confirmed = wedding.rsvpSubmissions.filter(r => r.status === 'confirmed').length
  const pending = wedding.rsvpSubmissions.filter(r => r.status === 'pending').length
  const declined = wedding.rsvpSubmissions.filter(r => r.status === 'declined').length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-indigo-600 mr-4">← Back</Link>
              <h1 className="text-xl font-semibold">{wedding.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <p className="text-lg">{wedding.coupleName1} {wedding.coupleName2 && `& ${wedding.coupleName2}`}</p>
            {wedding.date && <p className="text-gray-600">{new Date(wedding.date).toLocaleDateString()}</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Guests</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{wedding.guests.length}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                <dd className="mt-1 text-3xl font-semibold text-green-600">{confirmed}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                <dd className="mt-1 text-3xl font-semibold text-yellow-600">{pending}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Declined</dt>
                <dd className="mt-1 text-3xl font-semibold text-red-600">{declined}</dd>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href={`/dashboard/weddings/${wedding.id}/events`} className="bg-white p-6 rounded-lg shadow hover:shadow-md">
              <h3 className="font-semibold">Events ({wedding.events.length})</h3>
              <p className="text-sm text-gray-600 mt-1">Manage wedding events</p>
            </Link>
            <Link href={`/dashboard/weddings/${wedding.id}/guests`} className="bg-white p-6 rounded-lg shadow hover:shadow-md">
              <h3 className="font-semibold">Guests ({wedding.guests.length})</h3>
              <p className="text-sm text-gray-600 mt-1">Manage guest list</p>
            </Link>
            <Link href={`/dashboard/weddings/${wedding.id}/invite`} className="bg-white p-6 rounded-lg shadow hover:shadow-md">
              <h3 className="font-semibold">Invitation</h3>
              <p className="text-sm text-gray-600 mt-1">Share invitation link</p>
            </Link>
            <Link href={`/dashboard/reports`} className="bg-white p-6 rounded-lg shadow hover:shadow-md">
              <h3 className="font-semibold">Reports</h3>
              <p className="text-sm text-gray-600 mt-1">View attendance reports</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
