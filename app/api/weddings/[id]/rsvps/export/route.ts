import { requireUserId } from "@/lib/server-auth"
import { stringify } from "csv-stringify/sync"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertFeature } from "@/lib/subscriptions/service"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

    await assertFeature(wedding.workspaceId, "csvExport")

    const [submissions, events] = await Promise.all([
      prisma.rsvpSubmission.findMany({
        where: { weddingId: id },
        orderBy: { submittedAt: "asc" },
        include: {
          familyMembers: true,
          eventResponses: true,
          guest: { select: { group: true } },
          answers: { include: { question: { select: { question: true } } } },
        },
      }),
      prisma.event.findMany({ where: { weddingId: id }, orderBy: { order: "asc" } }),
    ])

    const eventNames = new Map(events.map((event) => [event.id, event.name]))
    const rows = submissions.map((submission) => {
      const row: Record<string, string | number> = {
        guestName: submission.fullName,
        mobile: submission.mobile,
        group: submission.guest.group ?? "",
        status: submission.status,
        dietaryPreferences: submission.dietaryPrefs ?? "",
        familyMembers: submission.familyMembers.map((member) => member.fullName).join("; "),
        totalHeadcount: 1 + submission.familyMembers.length,
        submittedAt: submission.submittedAt.toISOString(),
      }
      for (const event of events) {
        const response = submission.eventResponses.find((item) => item.eventId === event.id)
        row[`event:${event.name}`] = response?.status ?? "no response"
      }
      for (const answer of submission.answers) {
        row[`question:${answer.question.question}`] = answer.value
      }
      return row
    })

    const csv = stringify(rows, { header: true })
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    void eventNames
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName || "wedding"}-rsvps.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
