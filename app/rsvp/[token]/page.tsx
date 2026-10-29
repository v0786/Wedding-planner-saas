import { prisma } from "@/lib/prisma"
import RsvpForm, { type PublicWedding } from "@/components/rsvp/rsvp-form"

export const dynamic = "force-dynamic"

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const wedding = await prisma.wedding.findUnique({
    where: { invitationToken: token },
    include: {
      events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      customQuestions: { where: { enabled: true }, orderBy: { order: "asc" } },
    },
  })

  if (!wedding || !wedding.published) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">RSVP Not Available</h1>
          <p className="text-gray-600">This RSVP form is not active.</p>
        </div>
      </div>
    )
  }

  const publicWedding: PublicWedding = {
    name: wedding.name,
    coupleName1: wedding.coupleName1,
    coupleName2: wedding.coupleName2,
    date: wedding.date?.toISOString() ?? null,
    venue: wedding.venue,
    events: wedding.events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date?.toISOString() ?? null,
      time: event.time,
      venue: event.venue,
      rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    })),
    customQuestions: wedding.customQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type,
      options: question.options,
      required: question.required,
    })),
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{wedding.name}</h1>
          <p className="mt-2 text-lg text-gray-700">
            {wedding.coupleName1}
            {wedding.coupleName2 && ` & ${wedding.coupleName2}`}
          </p>
          {wedding.rsvpDeadline && (
            <p className="mt-2 text-sm text-amber-800">
              Please respond by{" "}
              {wedding.rsvpDeadline.toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          )}
        </div>
        <RsvpForm wedding={publicWedding} token={token} />
      </div>
    </main>
  )
}
