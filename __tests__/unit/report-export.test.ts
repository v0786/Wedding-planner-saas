/** @jest-environment node */
import { readReportExport } from "@/lib/report-export"

it("defaults to privacy-safe report columns", () => {
  const report = readReportExport(new URLSearchParams(), false)
  expect(report.columns).toContain("guestName")
  expect(report.columns).not.toContain("mobile")
  expect(report.columns).not.toContain("email")
})

it("rejects attempts to export hidden contacts and unsupported columns", () => {
  expect(() => readReportExport(new URLSearchParams("columns=mobile"), false)).toThrow("hidden")
  expect(() => readReportExport(new URLSearchParams("columns=notes"), true)).toThrow()
})

it("retains selected column order and validated filters", () => {
  expect(readReportExport(new URLSearchParams("columns=status&columns=guestName&status=maybe&group=Family&eventId=event-1"), true))
    .toMatchObject({ columns: ["status", "guestName"], filters: { status: "maybe", group: "Family", eventId: "event-1" } })
})
