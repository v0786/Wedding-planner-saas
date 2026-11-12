import Link from "next/link"
import type { Prisma } from "@prisma/client"
import Badge from "@/components/ui/badge"

export const weddingCardCounts = {
  guests: true,
  rsvpSubmissions: true,
  events: true,
} satisfies Prisma.WeddingCountOutputTypeSelect

type WeddingCardData = Prisma.WeddingGetPayload<{
  include: { _count: { select: typeof weddingCardCounts } }
}>

export default function WeddingCards({ weddings }: { weddings: WeddingCardData[] }) {
  return (
    <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {weddings.map((wedding) => (
        <Link
          key={wedding.id}
          href={`/dashboard/weddings/${wedding.id}`}
          className="group card-inset block p-5 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:border-gold-300 hover:bg-champagne-100/50 hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-lg text-ink-800 transition-colors group-hover:text-gold-700">
                {wedding.name}
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                {wedding.coupleName1}
                {wedding.coupleName2 && ` & ${wedding.coupleName2}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {wedding.date && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <svg
                      className="h-3.5 w-3.5 text-gold-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.7}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(wedding.date).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })}</span>
                  </span>
                )}
                {wedding.venue && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <svg
                      className="h-3.5 w-3.5 text-gold-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.7}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate max-w-[120px]">{wedding.venue}</span>
                  </span>
                )}
              </div>
            </div>
            <Badge tone={wedding.published ? "success" : "neutral"}>
              {wedding.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-ivory-300/70 pt-4 text-sm text-ink-500">
            <span>{wedding._count.guests} guests</span>
            <span>{wedding._count.rsvpSubmissions} RSVPs</span>
            <span>{wedding._count.events} events</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
