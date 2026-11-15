/** @jest-environment node */
import { Workbook, ValueType, type CellValue } from "exceljs"
import { parseGuestSpreadsheet, parseGuestXlsx, spreadsheetFormat, tabularDownload, XLSX_CONTENT_TYPE } from "@/lib/spreadsheet"

async function fixture(rows: CellValue[][], customize?: (workbook: Workbook) => void) {
  const workbook = new Workbook()
  const sheet = workbook.addWorksheet("Guests")
  sheet.addRows(rows)
  customize?.(workbook)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

describe("native Excel guest import", () => {
  it("reads Unicode and international phone text using the same validation as CSV", async () => {
    const buffer = await fixture([["firstName", "mobile", "group", "transportNeeds"], ["मीरा", "+919876543210", "Family", "Pickup"]])
    expect(await parseGuestXlsx(buffer)).toMatchObject({ ok: true, rows: [{ firstName: "मीरा", mobile: "+919876543210", group: "Family", transportNeeds: "Pickup" }] })
  })

  it("rejects the entire file for invalid or duplicate guest rows", async () => {
    const duplicate = await parseGuestXlsx(await fixture([["firstName", "mobile"], ["A", "9876543210"], ["B", "+919876543210"]]))
    expect(duplicate).toMatchObject({ ok: false, errors: [expect.stringMatching(/duplicate mobile/i)] })
    const invalid = await parseGuestXlsx(await fixture([["firstName", "email"], ["A", "a@example.com"], ["B", "invalid"]]))
    expect(invalid).toMatchObject({ ok: false, errors: [expect.stringMatching(/Line 3/)] })
  })

  it("rejects formulas, cached formula results, hyperlinks and dates", async () => {
    for (const value of [{ formula: "1+1", result: 2 }, { text: "Link", hyperlink: "https://example.com" }, new Date("2026-01-01")]) {
      expect(await parseGuestXlsx(await fixture([["firstName", "notes"], ["A", value]]))).toMatchObject({ ok: false })
    }
  })

  it("rejects unknown or repeated headers and extra sheets", async () => {
    for (const headers of [["firstName", "unknown"], ["firstName", "firstName"]]) {
      expect(await parseGuestXlsx(await fixture([headers, ["A", "B"]]))).toMatchObject({ ok: false })
    }
    expect(await parseGuestXlsx(await fixture([["firstName"], ["A"]], (book) => { book.addWorksheet("Hidden", { state: "hidden" }) }))).toMatchObject({ ok: false })
  })

  it("rejects sparse out-of-limit rows and excessive archive expansion before parsing", async () => {
    const sparse = await fixture([["firstName"], ["A"]], (book) => { book.worksheets[0].getCell("A1000000").value = "B" })
    expect(await parseGuestXlsx(sparse)).toMatchObject({ ok: false })
    const inflated = await fixture([["firstName"], ["A"]])
    const central = inflated.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
    inflated.writeUInt32LE(20 * 1024 * 1024, central + 24)
    expect(await parseGuestXlsx(inflated)).toMatchObject({ ok: false, errors: [expect.stringMatching(/expanded workbook/i)] })
  })

  it("rejects renamed non-workbooks, unsupported formats, and oversized uploads", async () => {
    expect(await parseGuestXlsx(Buffer.from("not a workbook"))).toMatchObject({ ok: false })
    expect(await parseGuestXlsx(Buffer.alloc(2 * 1024 * 1024 + 1))).toMatchObject({ ok: false })
    expect(await parseGuestSpreadsheet("list.xls", Buffer.alloc(0))).toMatchObject({ ok: false })
    expect(await parseGuestSpreadsheet("list.csv", Buffer.from("firstName\nGuest\n"))).toMatchObject({ ok: true })
  })
})

describe("native Excel export", () => {
  it("preserves literal text, numeric metrics and privacy-selected columns", async () => {
    const response = await tabularDownload({ headers: ["Name", "Phone", "Count"], rows: [["=HYPERLINK('https://example.com')", "+919876543210", 3]], name: "wedding-rsvps", format: "xlsx", sheetName: "RSVPs" })
    expect(response.headers.get("content-type")).toBe(XLSX_CONTENT_TYPE)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("content-disposition")).toContain("wedding-rsvps.xlsx")
    const workbook = new Workbook()
    await workbook.xlsx.load(await response.arrayBuffer())
    const sheet = workbook.worksheets[0]
    expect(sheet.getCell("A2").type).toBe(ValueType.String)
    expect(sheet.getCell("A2").value).toBe("=HYPERLINK('https://example.com')")
    expect(sheet.getCell("B2").value).toBe("+919876543210")
    expect(sheet.getCell("C2").type).toBe(ValueType.Number)
    expect(sheet.getCell("C2").value).toBe(3)
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 })
    const privateResponse = await tabularDownload({ headers: ["Name"], rows: [["Guest"]], name: "private-guests", format: "xlsx", sheetName: "Guests" })
    const privateBook = new Workbook()
    await privateBook.xlsx.load(await privateResponse.arrayBuffer())
    expect(privateBook.worksheets[0].columnCount).toBe(1)
    expect(privateBook.worksheets[0].getCell("A1").value).toBe("Name")
  })

  it("round-trips exported guests into the validated Excel importer", async () => {
    const response = await tabularDownload({ headers: ["firstName", "mobile", "notes"], rows: [["Aarav", "+919876543210", "=1+1"]], name: "guests", format: "xlsx", sheetName: "Guests" })
    expect(await parseGuestXlsx(Buffer.from(await response.arrayBuffer()))).toMatchObject({ ok: true, rows: [{ firstName: "Aarav", mobile: "+919876543210", notes: "=1+1" }] })
  })

  it("keeps CSV default and formula escaping, rejects unknown formats", async () => {
    expect(spreadsheetFormat(new Request("https://example.com/export"))).toBe("csv")
    expect(spreadsheetFormat(new Request("https://example.com/export?format=xlsx"))).toBe("xlsx")
    expect(() => spreadsheetFormat(new Request("https://example.com/export?format=html"))).toThrow(/CSV or XLSX/)
    const response = await tabularDownload({ headers: ["name"], rows: [["=1+1"]], name: "guests", format: "csv", sheetName: "Guests" })
    expect(await response.text()).toBe("name\n'=1+1\n")
  })
})
