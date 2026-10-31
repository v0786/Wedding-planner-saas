import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { headers } from "next/headers"
import { ButtonAnchor, ButtonLink, Eyebrow } from "@/components/ui/button"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const wedding = await prisma.wedding.findUnique({
    where: { invitationToken: token },
    include: {
      events: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { rsvpEventResponses: true } }
        }
      }
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
          <h1 className="mt-6 font-display text-3xl text-ink-900">Invitation not available</h1>
          <p className="lede mt-3">
            This invitation link is no longer active or has expired. Please check with the hosts for a
            new link.
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

  const coupleNames = wedding.coupleName2
    ? `${wedding.coupleName1} & ${wedding.coupleName2}`
    : wedding.coupleName1

  const eventsByDate = wedding.events.reduce((acc, event) => {
    const dateKey = event.date ? new Date(event.date).toDateString() : "TBA"
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, typeof wedding.events>)

  const eventDates = Object.keys(eventsByDate)

  // Absolute RSVP URL for the share link. The configured public URL wins;
  // otherwise the request headers are used so the link is correct behind any
  // host or proxy without hard-coding a domain.
  const headerList = await headers()
  const requestHost = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const requestProto =
    headerList.get("x-forwarded-proto") ?? (requestHost?.startsWith("localhost") ? "http" : "https")
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (requestHost ? `${requestProto}://${requestHost}` : "")
  ).replace(/\/$/, "")
  const rsvpUrlFull = `${baseUrl}/rsvp/${token}`

  const shareMessage = [
    `You're invited to ${wedding.name}! 🎉`,
    "",
    `${coupleNames} are getting married!`,
    "",
    `📅 ${
      wedding.date
        ? new Date(wedding.date).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Date TBA"
    }`,
    `📍 ${wedding.venue || "Venue TBA"}`,
    "",
    `Please RSVP here: ${rsvpUrlFull}`,
    "",
    "We can't wait to celebrate with you! ❤️",
  ].join("\n")
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ivory-50 paper-texture">
      {/* The cover image sits behind a warm ivory veil so the type always reads. */}
      {wedding.coverImageUrl && (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <img
            src={wedding.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-ivory-50/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-ivory-50/95 via-ivory-50/75 to-ivory-50/95" />
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="btn btn-ghost btn-sm">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
          <p className="eyebrow">Wedding invitation</p>
        </header>

        <article className="panel mt-6 flex-1 px-5 py-9 sm:px-10 sm:py-12">
          {/* Couple names */}
          <div className="text-center">
            <Eyebrow>You&apos;re invited</Eyebrow>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.06] text-ink-900 sm:text-6xl">
              {coupleNames}
            </h1>
            <p className="mt-3 font-display text-lg italic text-ink-500 sm:text-xl">{wedding.name}</p>
            <div className="rule-gold mx-auto my-7 max-w-[13rem]" />
          </div>

          {/* Date & venue */}
          <div className="grid gap-3 sm:grid-cols-2">
            {wedding.date && (
              <Link
                href={`/rsvp/${token}`}
                className="card-inset group flex items-center gap-3.5 px-4 py-4 transition-colors hover:border-gold-300 hover:bg-champagne-100/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne-100 text-gold-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block">Wedding date</span>
                  <span className="mt-1 block font-display text-base leading-snug text-ink-800">
                    {new Date(wedding.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </span>
              </Link>
            )}
            {wedding.venue && (
              <Link
                href={`/rsvp/${token}`}
                className="card-inset group flex items-center gap-3.5 px-4 py-4 transition-colors hover:border-gold-300 hover:bg-champagne-100/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne-100 text-gold-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block">Venue</span>
                  <span className="mt-1 block font-display text-base leading-snug text-ink-800">
                    {wedding.venue}
                  </span>
                </span>
              </Link>
            )}
          </div>

          {/* RSVP deadline */}
          {wedding.rsvpDeadline && (
            <div className="mt-6 flex justify-center">
              <p className="pill pill-warning">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                RSVP by {new Date(wedding.rsvpDeadline).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          )}

          {/* Description */}
          {wedding.description && (
            <p className="lede mx-auto mt-8 max-w-lg whitespace-pre-wrap text-center">
              {wedding.description}
            </p>
          )}

          {/* Events */}
          {wedding.events.length > 0 && (
            <section className="mt-10">
              <div className="text-center">
                <h2 className="font-display text-2xl text-ink-800">The celebration</h2>
                <p className="mt-1 text-sm text-ink-500">Tap any event to RSVP for it.</p>
              </div>
              <div className="mt-5 space-y-4 stagger">
                {eventDates.map((dateKey) => {
                  const dateEvents = eventsByDate[dateKey]
                  return (
                    <div key={dateKey} className="card overflow-hidden">
                      <div className="border-b border-ivory-200 bg-champagne-100/60 px-5 py-3">
                        <h3 className="font-display text-base text-ink-800">
                          {dateKey === "TBA" ? "Date to be announced" : new Date(dateKey).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </h3>
                      </div>
                      <div className="divide-y divide-ivory-200">
                        {dateEvents.map((event) => (
                          <Link
                            key={event.id}
                            href={`/rsvp/${token}`}
                            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ivory-50"
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-champagne-100 text-gold-600">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-display text-lg leading-snug text-ink-800">
                                {event.name}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                                {event.time && (
                                  <span className="flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {event.time}
                                  </span>
                                )}
                                {event.venue && (
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate">{event.venue}</span>
                                  </span>
                                )}
                              </span>
                            </span>
                            <svg className="h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* RSVP */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <ButtonLink href={`/rsvp/${token}`} size="lg" className="w-full sm:w-auto">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              RSVP now
            </ButtonLink>
            <p className="text-xs text-ink-400">
              Please respond for yourself and anyone joining you.
            </p>
          </div>

          {/* WhatsApp share — a plain anchor, no client-side handler. */}
          <div className="mt-7 flex justify-center">
            <ButtonAnchor
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.348-.52.348-.173 0-.347-.049-.52-.148-.172-.099-.378-.249-.55-.497-.173-.249-.399-.55-.575-.848-.38-.633-.84-1.234-1.047-1.52-.198-.286-.38-.548-.41-.67-.03-.114-.075-.228-.12-.342-.112-.27-.24-.594-.384-.97-.312-.82-.5-1.705-.677-2.44-.187-.775-.303-1.54-.303-1.99 0-.35.03-.7.11-1.04.066-.27.187-.548.28-.807.112-.312.148-.633.075-.95-.066-.286-.273-.602-.303-.795-.03-.187-.044-.334-.075-.47-.03-.114-.149-.42-.149-.95 0-.286-.075-.474-.148-.9-.06-.24-.107-.48-.16-1.2.15-.68.14-.97.06-1.1-.12-.17-.29-.6-.29-1.24 0-.7.22-1.65.68-2.12.37-.37.8-1.03 1.2-1.6.4-.56.78-1.08 1.12-1.5.33-.44.6-1.1.72-1.46.11-.36.14-.72.09-1.08-.04-.35-.14-.85-.3-1.35-.15-.4-.3-.95-.46-1.55-.16-.58-.23-1.18-.32-1.8-.08-.6-.11-1.23-.11-1.87 0-.76.11-1.52.33-2.26.22-.73.52-1.5.8-2.1.15-.3.26-.6.37-.85.1-.24.2-.47.29-.68.1-.22.14-.44.2-.6.07-.16.1-.32.1-.49 0-.16-.04-.33-.1-.5-.05-.17-.1-.33-.16-.48-.06-.15-.11-.28-.19-.38-.08-.1-.2-.25-.3-.42-.1-.17-.2-.34-.3-.5-.1-.17-.2-.34-.3-.5-.1-.16-.2-.32-.3-.47-.1-.15-.2-.3-.3-.44-.09-.14-.18-.27-.28-.38-.1-.11-.2-.22-.3-.32-.1-.1-.2-.19-.3-.28-.1-.1-.18-.18-.28-.27-.1-.09-.18-.17-.27-.25-.09-.08-.17-.16-.26-.24-.09-.08-.17-.15-.25-.23-.08-.08-.15-.14-.23-.22-.08-.07-.15-.14-.22-.21-.08-.07-.15-.13-.21-.19-.08-.07-.15-.13-.21-.19-.07-.06-.13-.12-.2-.18-.07-.06-.12-.11-.18-.17-.06-.05-.11-.1-.16-.15-.06-.05-.1-.09-.15-.14-.05-.04-.09-.08-.13-.12-.05-.04-.08-.07-.11-.11-.04-.04-.07-.06-.1-.1-.04-.03-.07-.05-.09-.08-.03-.03-.05-.04-.07-.06-.02-.02-.04-.03-.05-.04-.02-.02-.03-.02-.04-.03-.01-.01-.02-.01-.02-.02 0 0-.01 0-.01 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" />
              </svg>
              Share on WhatsApp
            </ButtonAnchor>
          </div>
        </article>

        <footer className="mt-8 text-center text-xs text-ink-400">
          <p>Made with love for {coupleNames}</p>
          <p className="mt-1">Powered by Wedding Guest Manager</p>
        </footer>
      </div>
    </div>
  )
}
