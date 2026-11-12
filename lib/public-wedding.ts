import { EVENT_PUBLIC_FIELDS, WEDDING_PUBLIC_FIELDS } from "@/lib/wedding-settings"

type PublicWeddingSource = {
  id: string
  name: string
  coupleName1: string
  coupleName2: string | null
  date: Date | null
  timezone: string
  locale: string
  invitationTheme: string
  themeColor: string | null
  venue: string | null
  address: string | null
  description: string | null
  mapUrl: string | null
  coverImageUrl: string | null
  couplePhotoUrl: string | null
  publicFields: string[]
}

/** Public fields are constructed explicitly, so guest data and settings stay private. */
export function publicWeddingContent(wedding: PublicWeddingSource) {
  const visible = new Set(wedding.publicFields)
  return {
    id: wedding.id,
    name: wedding.name,
    coupleName1: wedding.coupleName1,
    coupleName2: wedding.coupleName2,
    date: wedding.date,
    timezone: wedding.timezone,
    locale: wedding.locale,
    invitationTheme: wedding.invitationTheme,
    themeColor: wedding.themeColor,
    ...Object.fromEntries(WEDDING_PUBLIC_FIELDS.map(field => [field, visible.has(field) ? wedding[field] : null])),
  } as Pick<PublicWeddingSource, "id" | "name" | "coupleName1" | "coupleName2" | "date" | "timezone" | "locale" | "invitationTheme" | "themeColor"> &
    Record<typeof WEDDING_PUBLIC_FIELDS[number], string | null>
}

type PublicEventSource = {
  id: string
  name: string
  date: Date | null
  time: string | null
  venue: string | null
  address: string | null
  description: string | null
  mapUrl: string | null
  dressCode: string | null
  imageUrl: string | null
  rsvpDeadline: Date | null
  publicFields: string[]
}

export function publicEventContent(event: PublicEventSource) {
  const visible = new Set(event.publicFields)
  return {
    id: event.id,
    name: event.name,
    rsvpDeadline: event.rsvpDeadline,
    date: visible.has("date") ? event.date : null,
    ...Object.fromEntries(EVENT_PUBLIC_FIELDS.filter(field => field !== "date")
      .map(field => [field, visible.has(field) ? event[field] : null])),
  } as Pick<PublicEventSource, "id" | "name" | "rsvpDeadline" | "date"> &
    Record<Exclude<typeof EVENT_PUBLIC_FIELDS[number], "date">, string | null>
}
