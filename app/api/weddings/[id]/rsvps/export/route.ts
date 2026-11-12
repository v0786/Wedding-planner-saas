import { expectedRsvpAttendance, rsvpPartySize } from "@/lib/rsvp-attendance"
import { contactsAreVisible } from "@/lib/wedding-settings"
import { requireUserId } from "@/lib/server-auth"
import { stringify } from "csv-stringify/sync"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { spreadsheetCsvOptions } from "@/lib/csv"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingFeature } from "@/lib/subscriptions/service"
import { readReportExport } from "@/lib/report-export"
import { ApiError } from "@/lib/errors"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

    await assertWeddingFeature(wedding.workspaceId, wedding.id, "csvExport")

    const includeContacts = contactsAreVisible(wedding)
    const { columns, filters } = readReportExport(new URL(req.url).searchParams, includeContacts)
    if (filters.eventId && !await prisma.event.findFirst({ where: { id: filters.eventId, weddingId: id }, select: { id: true } })) {
      throw new ApiError("Event not found", 404)
    }
    const [submissions, events, questions] = await Promise.all([
      prisma.rsvpSubmission.findMany({
        where: {
          weddingId: id,
          ...(filters.status !== "all" && { status: filters.status }),
          ...(filters.group && { guest: { group: filters.group } }),
          ...(filters.dietary && { dietaryPrefs: { contains: filters.dietary, mode: "insensitive" } }),
          ...(filters.eventId && { eventResponses: { some: { eventId: filters.eventId } } }),
        },
        orderBy: { submittedAt: "asc" },
        include: {
          familyMembers: true,
          eventResponses: true,
          guest: { select: { group: true } },
          answers: { select: { questionId: true, value: true } },
        },
      }),
      prisma.event.findMany({ where: { weddingId: id }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
      prisma.customQuestion.findMany({ where: { weddingId: id }, orderBy: { order: "asc" }, select: { id: true, question: true } }),
    ])

    const headers = columns.flatMap((column) => {
      if (column === "events") return events.map((event) => `event:${event.name}`)
      if (column === "answers") return questions.map((question) => `question:${question.question}`)
      return [column]
    })
    const rows = submissions.map((submission) => {
      const responses = new Map(submission.eventResponses.map((response) => [response.eventId, response.status]))
      const answers = new Map(submission.answers.map((answer) => [answer.questionId, answer.value]))
      const values = {
        guestName: submission.fullName,
        mobile: submission.mobile,
        email: submission.email ?? "",
        group: submission.guest.group ?? "",
        status: submission.status,
        dietaryPreferences: submission.dietaryPrefs ?? "",
        familyMembers: submission.familyMembers.map((member) => member.fullName).join("; "),
        totalHeadcount: expectedRsvpAttendance(submission),
        partySize: rsvpPartySize(submission),
        submittedAt: submission.submittedAt.toISOString(),
      }
      return columns.flatMap((column): Array<string | number> => {
        if (column === "events") return events.map((event) => responses.get(event.id) ?? "no response")
        if (column === "answers") return questions.map((question) => answers.get(question.id) ?? "")
        return [values[column]]
      })
    })
    const csv = stringify(rows, { ...spreadsheetCsvOptions, header: true, columns: headers })
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeName || "wedding"}-rsvps.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
