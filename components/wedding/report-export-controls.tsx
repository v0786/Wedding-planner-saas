import { DEFAULT_REPORT_COLUMNS, REPORT_COLUMNS } from "@/lib/report-export"

export default function ReportExportControls({
  weddingId,
  includeContacts,
  events,
}: {
  weddingId: string
  includeContacts: boolean
  events: Array<{ id: string; name: string }>
}) {
  const columns = includeContacts ? DEFAULT_REPORT_COLUMNS : DEFAULT_REPORT_COLUMNS.filter((column) => column !== "mobile" && column !== "email")
  return (
    <details className="mb-6 rounded-2xl border border-brand-border bg-white p-5 print:hidden">
      <summary className="cursor-pointer font-medium">Choose report columns and filters</summary>
      <form action={`/api/weddings/${weddingId}/rsvps/export`} className="mt-4 space-y-4">
        <input type="hidden" name="selection" value="custom" />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Included columns</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {columns.map((column) => (
              <label key={column} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="columns" value={column} defaultChecked />
                {REPORT_COLUMNS[column]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Attendance status
            <select className="input mt-1 w-full" name="status" defaultValue="all">
              <option value="all">All responses</option><option value="confirmed">Accepted</option>
              <option value="declined">Declined</option><option value="maybe">Maybe</option><option value="pending">Pending responses</option>
            </select>
          </label>
          <label className="text-sm">Event
            <select className="input mt-1 w-full" name="eventId" defaultValue="">
              <option value="">All events</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Group<input className="input mt-1 w-full" name="group" maxLength={120} /></label>
          <label className="text-sm">Dietary preference<input className="input mt-1 w-full" name="dietary" maxLength={120} /></label>
        </div>
        {!includeContacts && <p className="text-sm text-brand-text-muted">Contact details are hidden. You can change the wedding privacy setting in Edit details.</p>}
        <button className="btn btn-secondary" type="submit">Download selected report (CSV)</button>
      </form>
    </details>
  )
}
