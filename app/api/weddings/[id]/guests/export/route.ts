import { requireUserId } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { contactsAreVisible } from "@/lib/wedding-settings"
import { GUEST_CSV_HEADERS } from "@/lib/csv"
import { spreadsheetFormat, tabularDownload } from "@/lib/spreadsheet"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingFeature } from "@/lib/subscriptions/service"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const columns = contactsAreVisible(wedding) ? [...GUEST_CSV_HEADERS] : GUEST_CSV_HEADERS.filter((column) => column !== "mobile" && column !== "email")
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    return await tabularDownload({ headers: columns, rows: guests.map((guest) => columns.map((column) => guest[column])), name: `${safeName || "wedding"}-guests`, format: spreadsheetFormat(req), sheetName: "Guests" })
  } catch (error) {
    return handleApiError(error)
  }
}
