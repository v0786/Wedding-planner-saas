import { requireUserId } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { contactsAreVisible } from "@/lib/wedding-settings"
import { guestsToCsv } from "@/lib/csv"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingFeature } from "@/lib/subscriptions/service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

    await assertWeddingFeature(wedding.workspaceId, wedding.id, "csvExport")

    const guests = await prisma.guest.findMany({
      where: { weddingId: id },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        mobile: true,
        email: true,
        group: true,
        notes: true,
        dietaryPrefs: true,
        side: true,
        category: true,
        accommodationNeeds: true,
        transportNeeds: true,
      },
    })

    const csv = guestsToCsv(guests, { includeContacts: contactsAreVisible(wedding) })
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeName || "wedding"}-guests.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
