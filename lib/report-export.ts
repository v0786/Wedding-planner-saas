import { z } from "zod"
import { ApiError } from "@/lib/errors"

export const REPORT_COLUMNS = {
  guestName: "Guest name",
  mobile: "Mobile",
  email: "Email",
  group: "Group",
  status: "Attendance status",
  dietaryPreferences: "Dietary preferences",
  familyMembers: "Named family members",
  totalHeadcount: "Confirmed headcount",
  partySize: "Party size",
  submittedAt: "Submitted at",
  events: "Event responses",
  answers: "Custom answers",
} as const

export type ReportColumn = keyof typeof REPORT_COLUMNS
export const DEFAULT_REPORT_COLUMNS = Object.keys(REPORT_COLUMNS) as ReportColumn[]
const columnSchema = z.enum(Object.keys(REPORT_COLUMNS) as [ReportColumn, ...ReportColumn[]])
const filterSchema = z.object({
  status: z.enum(["all", "confirmed", "declined", "maybe", "pending"]).default("all"),
  group: z.string().trim().max(120).default(""),
  dietary: z.string().trim().max(120).default(""),
  eventId: z.string().max(100).default(""),
})

export function readReportExport(search: URLSearchParams, includeContacts: boolean) {
  const requested = search.getAll("columns")
  if (search.get("selection") === "custom" && requested.length === 0) {
    throw new ApiError("Choose at least one report column.", 400)
  }
  const columns = [...new Set(requested.length ? requested.map((column) => columnSchema.parse(column)) : DEFAULT_REPORT_COLUMNS)]
  if (!includeContacts && requested.some((column) => column === "mobile" || column === "email")) {
    throw new ApiError("Contact details are hidden by this wedding's privacy setting.", 403)
  }
  const visibleColumns = includeContacts ? columns : columns.filter((column) => column !== "mobile" && column !== "email")
  const filters = filterSchema.parse({
    status: search.get("status") ?? undefined,
    group: search.get("group") ?? undefined,
    dietary: search.get("dietary") ?? undefined,
    eventId: search.get("eventId") ?? undefined,
  })
  return { columns: visibleColumns, filters }
}
