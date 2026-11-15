import { handleApiError } from "@/lib/api"
import { spreadsheetFormat, tabularDownload } from "@/lib/spreadsheet"
import { requireUserId } from "@/lib/server-auth"
import { assertWeddingFeature } from "@/lib/subscriptions/service"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { getWeddingReport } from "@/lib/wedding-report"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)
    await assertWeddingFeature(wedding.workspaceId, wedding.id, "reports")
    await assertWeddingFeature(wedding.workspaceId, wedding.id, "csvExport")

    const { summary, attendance, dietary, groups } = await getWeddingReport(wedding.id)
    const rows = [
      ["Summary", "Guests", "Invited", summary.invited],
      ["Summary", "Guests", "Responses", summary.responses],
      ["Summary", "Guests", "Response rate (%)", summary.responseRate],
      ["Summary", "RSVPs", "Confirmed", summary.confirmed],
      ["Summary", "RSVPs", "Pending", summary.pending],
      ["Summary", "RSVPs", "Maybe", summary.maybe],
      ["Summary", "RSVPs", "Declined", summary.declined],
      ["Summary", "Headcount", "Confirmed", summary.confirmedHeadcount],
      ["Summary", "Headcount", "Expected attendees", summary.totalHeadcount],
      ...attendance.flatMap((event) => [
        ["Event attendance", event.name, "Yes", event.yes],
        ["Event attendance", event.name, "No", event.no],
        ["Event attendance", event.name, "Not sure", event.unsure],
      ]),
      ...dietary.map(([preference, count]) => ["Dietary summary", preference, "Count", count]),
      ...[...groups].flatMap(([group, stats]) => [
        ["Groups", group, "Guests", stats.guests],
        ["Groups", group, "Responded", stats.responded],
        ["Groups", group, "Headcount", stats.headcount],
      ]),
    ]
    const safeName = wedding.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()

    return await tabularDownload({ headers: ["Section", "Item", "Metric", "Value"], rows, name: `${safeName || "wedding"}-report`, format: spreadsheetFormat(request), sheetName: "Summary" })
  } catch (error) {
    return handleApiError(error)
  }
}
