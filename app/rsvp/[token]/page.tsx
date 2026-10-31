import { prisma } from "@/lib/prisma"
import Link from "next/link"
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
      <main className="flex min-h-screen items-center justify-center bg-ivory-50 paper-texture px-4 py-12">
        <div className="panel w-full max-w-md px-6 py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-champagne-100 text-gold-600">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-3xl text-ink-900">RSVP not available</h1>
          <p className="lede mt-3">
            This RSVP form is no longer active or has expired. Please check with the hosts for a new
            link.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/" className="btn btn-secondary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const publicWedding: PublicWedding = {
    id: wedding.id,
    name: wedding.name,
    coupleName1: wedding.coupleName1,
    coupleName2: wedding.coupleName2,
    date: wedding.date?.toISOString() ?? null,
    venue: wedding.venue,
    address: wedding.address,
    description: wedding.description,
    coverImageUrl: wedding.coverImageUrl,
    themeColor: wedding.themeColor,
    couplePhotoUrl: wedding.couplePhotoUrl,
    whatsappMessage: wedding.whatsappMessage,
    events: wedding.events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date?.toISOString() ?? null,
      time: event.time,
      venue: event.venue,
      description: event.description,
      imageUrl: event.imageUrl,
      rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    })),
    customQuestions: wedding.customQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type,
      options: question.options,
      required: question.required,
      order: question.order,
    })),
  }

  const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp/${token}`

  return (
    <main className="min-h-screen">
      <RsvpForm
        wedding={publicWedding}
        token={token}
        rsvpUrl={rsvpUrl}
      />
    </main>
  )
}
