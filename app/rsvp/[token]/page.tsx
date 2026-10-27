import { prisma } from "@/lib/prisma"
import RsvpForm from "@/components/rsvp/rsvp-form"

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const wedding = await prisma.wedding.findUnique({
    where: { invitationToken: token },
    include: { 
      events: { orderBy: { order: 'asc' } },
      customQuestions: { where: { enabled: true }, orderBy: { order: 'asc' } },
    },
  })

  if (!wedding || !wedding.published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">RSVP Not Available</h1>
          <p className="text-gray-600">This RSVP form is not active.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{wedding.name}</h1>
          <p className="text-lg text-gray-700 mt-2">
            {wedding.coupleName1} {wedding.coupleName2 && `& ${wedding.coupleName2}`}
          </p>
        </div>
        <RsvpForm wedding={wedding} token={token} />
      </div>
    </div>
  )
}
