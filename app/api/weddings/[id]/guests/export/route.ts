import { requireUserId } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { guestsToCsv } from "@/lib/csv"
import { requireWeddingAccess } from "@/lib/wedding-access"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

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
      },
    })

    const csv = guestsToCsv(guests)
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName || "wedding"}-guests.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
