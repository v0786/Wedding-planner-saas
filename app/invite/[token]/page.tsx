import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const wedding = await prisma.wedding.findUnique({
    where: { invitationToken: token },
    include: { events: { orderBy: { order: 'asc' } } },
  })

  if (!wedding || !wedding.published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Not Available</h1>
          <p className="text-gray-600">This invitation link is not active.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{wedding.name}</h1>
          <p className="text-xl text-gray-700">
            {wedding.coupleName1} {wedding.coupleName2 && `& ${wedding.coupleName2}`}
          </p>
          {wedding.date && (
            <p className="mt-2 text-gray-600">{new Date(wedding.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          )}
          {wedding.venue && <p className="mt-1 text-gray-600">{wedding.venue}</p>}
        </div>

        {wedding.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{wedding.description}</p>
          </div>
        )}

        {wedding.events.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Events</h2>
            <div className="space-y-3">
              {wedding.events.map((event) => (
                <div key={event.id} className="border-l-4 border-pink-500 pl-4">
                  <h3 className="font-semibold">{event.name}</h3>
                  {event.date && <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString('en-IN')}</p>}
                  {event.venue && <p className="text-sm text-gray-600">{event.venue}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href={`/rsvp/${token}`}
            className="inline-block bg-pink-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-pink-700"
          >
            RSVP Now
          </Link>
        </div>
      </div>
    </div>
  )
}
