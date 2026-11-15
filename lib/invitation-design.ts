import { ApiError } from "@/lib/errors"
import { assertWeddingFeature } from "@/lib/subscriptions/service"

const designFields = ["coverImageUrl", "couplePhotoUrl", "themeColor", "invitationTheme"] as const
type DesignFields = Partial<Record<typeof designFields[number], string | null>>

export async function assertWeddingDesignChanges(workspaceId: string, weddingId: string, previous: DesignFields, updates: DesignFields) {
  for (const field of ["coverImageUrl", "couplePhotoUrl"] as const) {
    const value = updates[field]
    if (value?.startsWith("/") && !value.startsWith(`/api/weddings/${weddingId}/assets/`)) {
      throw new ApiError("Choose an image uploaded to this wedding", 400)
    }
  }
  const needsCustomization = designFields.some(field => {
    const value = updates[field]
    return value !== undefined && value !== previous[field] && value !== null &&
      !(field === "invitationTheme" && value === "classic")
  })
  if (needsCustomization) await assertWeddingFeature(workspaceId, weddingId, "customBranding")
}

type EventDetails = { mapUrl?: string | null; dressCode?: string | null; imageUrl?: string | null }
export async function assertEventDesignChanges(workspaceId: string, weddingId: string, previous: EventDetails, updates: EventDetails) {
  const changed = (["mapUrl", "dressCode", "imageUrl"] as const)
    .some(field => updates[field] && updates[field] !== previous[field])
  if (changed) await assertWeddingFeature(workspaceId, weddingId, "customBranding")
}
