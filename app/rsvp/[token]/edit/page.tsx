import { publicWeddingContent, publicEventContent } from "@/lib/public-wedding"
import { prisma } from "@/lib/prisma"
import { getEditableRsvp } from "@/lib/rsvp-service"
import RsvpForm, { type PublicWedding, type RsvpInitial } from "@/components/rsvp/rsvp-form"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { rsvpBrowserToken } from "@/lib/rsvp-browser"
import { DeviceTransfer } from "@/components/rsvp/device-transfer"

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
  if (typeof editToken !== "string") notFound()

  const submission = await getEditableRsvp(invitationToken, editToken, rsvpBrowserToken(await cookies()))
  if (!submission) notFound()

  const wedding = await prisma.wedding.findUnique({
    where: { id: submission.weddingId },
    include: {
      events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      customQuestions: { where: { enabled: true }, orderBy: { order: "asc" } },
    },
  })

  if (!wedding?.published) notFound()

  const visible = publicWeddingContent(wedding)
  const publicWedding: PublicWedding = {
    ...visible,
    date: visible.date?.toISOString() ?? null,
    events: wedding.events.map((event) => {
      const visibleEvent = publicEventContent(event)
      return {
        ...visibleEvent,
        date: visibleEvent.date?.toISOString() ?? null,
        rsvpDeadline: visibleEvent.rsvpDeadline?.toISOString() ?? null,
      }
    }),
    customQuestions: wedding.customQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type,
      options: question.options,
      required: question.required,
      order: question.order,
    })),
  }

  const initial: RsvpInitial = {
    fullName: submission.fullName,
    mobile: submission.mobile,
    email: submission.email ?? "",
    status: submission.status as RsvpInitial["status"],
    partySize: submission.partySize,
    dietaryPrefs: submission.dietaryPrefs ?? "",
    familyMembers: submission.familyMembers.map((member) => ({
      id: member.id,
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
    <main className="min-h-screen">
      <RsvpForm
        wedding={publicWedding}
        token={invitationToken}
        rsvpUrl={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp/${invitationToken}`}
        initial={initial}
        editToken={editToken}
      />
      <div className="mx-auto max-w-lg px-4 pb-8">
        <DeviceTransfer invitationToken={invitationToken} editToken={editToken} />
      </div>
    </main>
  )
}
