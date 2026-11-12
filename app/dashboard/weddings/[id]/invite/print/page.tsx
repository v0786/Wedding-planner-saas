import { auth } from "@/auth"
import InvitationImageButton from "@/components/wedding/invitation-image-button"
import PrintButton from "@/components/ui/print-button"
import { prisma } from "@/lib/prisma"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"
import { publicWeddingContent, publicEventContent } from "@/lib/public-wedding"
import { invitationTheme, invitationThemeStyle } from "@/lib/invitation-theme"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

export default async function PrintableInvitation({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params
  const sourceWedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    include: { events: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  })
  if (!sourceWedding) notFound()

  const wedding = publicWeddingContent(sourceWedding)
  const events = sourceWedding.events.map(publicEventContent)
  const palette = invitationTheme(wedding)
  const calendarDate = new Intl.DateTimeFormat(wedding.locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  })
  const couple = [wedding.coupleName1, wedding.coupleName2].filter(Boolean).join(" & ")
  const date = wedding.date ? calendarDate.format(wedding.date) : null
  const deadline = sourceWedding.rsvpDeadline ? `RSVP by ${calendarDate.format(sourceWedding.rsvpDeadline)}` : null
  const rsvpPath = sourceWedding.published && !isWeddingExpired(sourceWedding) ? `/rsvp/${sourceWedding.invitationToken}` : null

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 space-y-4 print:hidden">
        <Link href={`/dashboard/weddings/${id}/invite`} className="text-sm text-brand-primary">← Back to invitation</Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <InvitationImageButton invitation={{ couple, name: wedding.name, date, venue: wedding.venue, address: wedding.address, description: wedding.description, deadline, rsvpPath, invitationTheme: wedding.invitationTheme, themeColor: wedding.themeColor, coverImageUrl: wedding.coverImageUrl, couplePhotoUrl: wedding.couplePhotoUrl }} />
        </div>
        <p className="text-sm text-brand-text-muted">The PDF includes the full event schedule. The PNG is a compact card for sharing. Both follow the public visibility choices saved for this invitation.</p>
      </header>
      <article data-invitation-theme={palette.name} className="overflow-hidden border-4 border-double text-center print:[print-color-adjust:exact]" style={{ ...invitationThemeStyle(wedding), borderColor: palette.accent }}>
        {wedding.coverImageUrl && <div role="img" aria-label="Wedding cover" className="h-48 bg-cover bg-center print:h-36" style={{ backgroundImage: `url(${JSON.stringify(wedding.coverImageUrl)})` }} />}
        <div className="px-6 py-12 sm:px-12 print:!px-8 print:!py-8">
          <div className="break-inside-avoid">
            {wedding.couplePhotoUrl && <div role="img" aria-label={`Portrait of ${couple}`} className="mx-auto mb-5 h-24 w-24 rounded-full border-4 bg-cover bg-center" style={{ borderColor: palette.accent, backgroundImage: `url(${JSON.stringify(wedding.couplePhotoUrl)})` }} />}
            <p className="eyebrow" style={{ color: palette.primary }}>You&apos;re invited</p>
            <h1 className="mt-4 break-words font-display text-4xl sm:text-6xl" style={{ color: palette.primary }}>{couple}</h1>
            <p className="mt-3 font-display text-xl italic text-[#665447]">{wedding.name}</p>
            <div className="mx-auto my-6 h-px max-w-40" style={{ backgroundColor: palette.accent }} />
            {date && <p className="font-display text-xl text-[#34261d]">{date}</p>}
            {wedding.venue && <p className="mt-2 font-display text-lg text-[#34261d]">{wedding.venue}</p>}
            {wedding.address && <p className="mt-1 whitespace-pre-wrap text-sm text-[#665447]">{wedding.address}</p>}
          </div>
          {wedding.description && <p className="mx-auto mt-6 max-w-xl whitespace-pre-wrap text-[#34261d]">{wedding.description}</p>}
          {events.length > 0 && (
            <section className="mx-auto mt-8 max-w-xl">
              <h2 className="mb-3 font-display text-xl text-[#34261d]">The celebration</h2>
              <ul className="divide-y divide-ivory-300">
                {events.map((event) => (
                  <li key={event.id} className="break-inside-avoid py-3">
                    <p className="font-display text-lg text-[#34261d]">{event.name}</p>
                    <p className="text-sm text-[#665447]">{[event.date ? calendarDate.format(event.date) : null, event.time, event.venue, event.address].filter(Boolean).join(" · ")}</p>
                    {event.description && <p className="mt-1 text-sm text-[#665447]">{event.description}</p>}
                    {event.dressCode && <p className="mt-1 text-sm text-[#665447]">Dress code · {event.dressCode}</p>}
                    {event.mapUrl && <a href={event.mapUrl} className="text-sm underline" rel="noreferrer">View location</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(deadline || rsvpPath) && (
            <footer className="mt-6 break-inside-avoid text-sm text-[#34261d]">
              {deadline && <p className="font-semibold">{deadline}</p>}
              {rsvpPath && <a href={rsvpPath} className="mt-2 inline-block font-semibold underline" style={{ color: palette.primary }}>RSVP online</a>}
            </footer>
          )}
        </div>
      </article>
    </div>
  )
}
