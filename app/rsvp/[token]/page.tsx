import Advertisement from "@/components/ui/advertisement"
import { publicWeddingContent, publicEventContent } from "@/lib/public-wedding"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { groupRsvpEditPath } from "@/lib/rsvp-service"
import { rsvpBrowserToken } from "@/lib/rsvp-browser"
import { publicInvitationWhere } from "@/lib/public-invitation"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"
import { getWeddingEntitlements } from "@/lib/subscriptions/service"
import RsvpForm, { type PublicWedding } from "@/components/rsvp/rsvp-form"

export const dynamic = "force-dynamic"

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const invitation = await publicInvitationWhere(token, cookieStore)
  if (!invitation) notFound()

  const wedding = await prisma.wedding.findUnique({
    where: invitation.where,
    include: {
      events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      customQuestions: { where: { enabled: true }, orderBy: { order: "asc" } },
    },
  })

  if (!wedding || !wedding.published || isWeddingExpired(wedding)) {
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

  if (invitation.group && wedding.allowGuestEdits && (!wedding.rsvpDeadline || new Date() <= wedding.rsvpDeadline)) {
    const editPath = await groupRsvpEditPath(invitation.group.id, rsvpBrowserToken(cookieStore))
    if (editPath) redirect(editPath)
  }

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

  const entitlements = await getWeddingEntitlements(wedding.workspaceId, wedding.id)
  const whatsappSharing = !invitation.group && entitlements.features.whatsappSharing
  const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rsvp/${token}`

  return (
    <main className="min-h-screen">
      <RsvpForm
        wedding={publicWedding}
        token={token}
        rsvpUrl={rsvpUrl}
        privateInvitation={Boolean(invitation.group)}
        whatsappSharing={whatsappSharing}
      />
      <div className="mx-auto max-w-2xl px-4">
        <Advertisement planCode={entitlements.planCode} placement="publicRsvp" />
      </div>
    </main>
  )
}
