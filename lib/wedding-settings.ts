export const WEDDING_PUBLIC_FIELDS = [
  "venue", "address", "description", "mapUrl", "coverImageUrl", "couplePhotoUrl",
] as const
export type WeddingPublicField = typeof WEDDING_PUBLIC_FIELDS[number]

export const EVENT_PUBLIC_FIELDS = [
  "date", "time", "venue", "address", "description", "mapUrl", "dressCode", "imageUrl",
] as const
export type EventPublicField = typeof EVENT_PUBLIC_FIELDS[number]

export const INVITATION_THEMES = {
  classic: { label: "Classic gold", color: "#A78542" },
  floral: { label: "Garden sage", color: "#5E7660" },
  minimal: { label: "Evening navy", color: "#23324C" },
} as const

export function contactsAreVisible(wedding: { contactVisibility?: string }) {
  return wedding.contactVisibility === "visible"
}
