import { prisma } from "@/lib/prisma"
import { getEditableRsvp } from "@/lib/rsvp-service"
import RsvpForm, { type PublicWedding, type RsvpInitial } from "@/components/rsvp/rsvp-form"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function EditRsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { token: invitationToken } = await params
  const { token: editToken } = await searchParams

  const wedding = await prisma.wedding.findUnique({
    where: { invitationToken: invitationToken },
    include: {
      events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      customQuestions: { where: { enabled: true }, orderBy: { order: "asc" } },
    },
  })

  const submission = editToken ? await getEditableRsvp(invitationToken, editToken) : null

  if (!wedding || !wedding.published || !submission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Edit link not valid</h1>
          <p className="mb-6 text-gray-600">
            This RSVP edit link is invalid. Please use the link shown after submitting your RSVP, or
            submit a new response.
          </p>
          <Link
            href={`/rsvp/${invitationToken}`}
            className="font-medium text-pink-600 hover:text-pink-700"
          >
            Go to the RSVP form
          </Link>
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

  const initial: RsvpInitial = {
    fullName: submission.fullName,
    mobile: submission.mobile,
    dietaryPrefs: submission.dietaryPrefs ?? "",
    familyMembers: submission.familyMembers.map((member) => ({
      fullName: member.fullName,
      relation: member.relation ?? "",
      age: member.age === null ? "" : String(member.age),
      dietaryPrefs: member.dietaryPrefs ?? "",
    })),
    eventResponses: Object.fromEntries(
      submission.eventResponses.map((response) => [response.eventId, response.status]),
    ),
    answers: Object.fromEntries(submission.answers.map((answer) => [answer.questionId, answer.value])),
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Edit your RSVP</h1>
          <p className="mt-2 text-lg text-gray-700">{wedding.name}</p>
        </div>
        <RsvpForm
          wedding={publicWedding}
          token={invitationToken}
          initial={initial}
          editToken={editToken}
        />
      </div>
    </main>
  )
}
