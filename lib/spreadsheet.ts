import { inflateRawSync } from "node:zlib"
import { Workbook, type CellValue } from "exceljs"
import { stringify } from "csv-stringify/sync"
import { GUEST_CSV_HEADERS, parseGuestCsv, spreadsheetCsvOptions, type CsvParseResult } from "@/lib/csv"
import { ApiError } from "@/lib/errors"

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_EXPANDED_BYTES = 12 * 1024 * 1024
const MAX_GUEST_ROWS = 2000

/** Check actual expanded ZIP sizes before the workbook parser allocates XML models. */
function validateArchive(buffer: Buffer) {
  if (buffer.length < 22 || buffer.length > MAX_FILE_BYTES) throw new Error("Use an XLSX file of 2 MB or smaller.")
  let end = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) throw new Error("Use a standard, unencrypted XLSX workbook.")
  const count = buffer.readUInt16LE(end + 10)
  const centralSize = buffer.readUInt32LE(end + 12)
  const centralOffset = buffer.readUInt32LE(end + 16)
  if (!count || count > 100 || buffer.readUInt16LE(end + 8) !== count || centralOffset + centralSize !== end) throw new Error("The workbook archive is invalid or too complex.")
  let offset = centralOffset
  let total = 0
  const names = new Set<string>()
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid workbook archive.")
    const flags = buffer.readUInt16LE(offset + 8)
    const compression = buffer.readUInt16LE(offset + 10)
    const compressed = buffer.readUInt32LE(offset + 20)
    const expanded = buffer.readUInt32LE(offset + 24)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (next > end || localOffset + 30 > centralOffset || flags & 1 || ![0, 8].includes(compression)) throw new Error("Unsupported workbook archive.")
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8")
    if (names.has(name) || name.includes("..") || name.startsWith("/") || /(?:vbaProject|externalLinks|embeddings)\//i.test(name) || /\.bin$/i.test(name)) throw new Error("Use a workbook without macros, embedded files or external links.")
    names.add(name)
    total += expanded
    if (total > MAX_EXPANDED_BYTES) throw new Error("The expanded workbook is too large. Remove unused sheets, images and formatting.")
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50 || buffer.readUInt16LE(localOffset + 8) !== compression) throw new Error("Invalid workbook archive.")
    const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28)
    if (start + compressed > centralOffset) throw new Error("Invalid workbook archive.")
    const data = buffer.subarray(start, start + compressed)
    const actual = compression === 0 ? data : inflateRawSync(data, { maxOutputLength: Math.max(1, expanded) })
    if (actual.length !== expanded) throw new Error("Invalid workbook archive size.")
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      const xml = actual.toString("utf8")
      const rowNumbers = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)]
      const cellReferences = [...xml.matchAll(/<c\b[^>]*\br="([A-Z]+)(\d+)"/g)]
      if (rowNumbers.length > MAX_GUEST_ROWS + 1 || rowNumbers.some((match) => Number(match[1]) > MAX_GUEST_ROWS + 1) || [...xml.matchAll(/<c\b/g)].length > (MAX_GUEST_ROWS + 1) * GUEST_CSV_HEADERS.length || cellReferences.some((match) => Number(match[2]) > MAX_GUEST_ROWS + 1 || !/^[A-K]$/.test(match[1]))) {
        throw new Error("Use at most 2,000 guest rows and the documented guest columns.")
      }
    }
    offset = next
  }
  if (offset !== end || !names.has("xl/workbook.xml") || !names.has("[Content_Types].xml")) throw new Error("This file is not an XLSX workbook.")
}

function plainValue(value: CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value)
  if (typeof value === "object" && "richText" in value) return value.richText.map((part) => part.text).join("")
  throw new Error("Guest cells must contain plain text or whole numbers. Remove formulas, dates, links and errors.")
}

export async function parseGuestXlsx(buffer: Buffer): Promise<CsvParseResult> {
  try {
    validateArchive(buffer)
    const workbook = new Workbook()
    // ExcelJS currently declares its own Buffer interface instead of Node's type.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
    if (workbook.worksheets.length !== 1 || workbook.worksheets[0].state !== "visible") throw new Error("Use one visible worksheet containing the guest list.")
    const sheet = workbook.worksheets[0]
    if (sheet.rowCount > MAX_GUEST_ROWS + 1 || sheet.columnCount > GUEST_CSV_HEADERS.length) throw new Error("Use at most 2,000 guest rows and the documented guest columns.")
    if (sheet.model.merges?.length) throw new Error("Unmerge guest cells before importing.")
    const columns = sheet.getRow(1).values as CellValue[]
    const headers = columns.slice(1).map((cell) => plainValue(cell).trim())
    if (new Set(headers).size !== headers.length || headers.some((header) => !header)) throw new Error("Use unique, non-empty column headers.")
    const rows: string[][] = []
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = headers.map((_, column) => plainValue(sheet.getRow(i).getCell(column + 1).value))
      if (row.some((cell) => cell.trim())) rows.push(row)
    }
    // Reuse the same whole-file validation and phone duplicate rules as CSV.
    return parseGuestCsv(stringify([headers, ...rows]))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read workbook."
    return { ok: false, errors: [message.startsWith("Use ") || /^(Guest cells|Unmerge|The expanded)/.test(message) ? message : "Could not read XLSX. Use a valid, unencrypted workbook with one guest worksheet."] }
  }
}

export async function parseGuestSpreadsheet(name: string, input: Buffer): Promise<CsvParseResult> {
  if (/\.xlsx$/i.test(name)) return parseGuestXlsx(input)
  if (/\.csv$/i.test(name)) return parseGuestCsv(input)
  return { ok: false, errors: ["Use a CSV or XLSX file. Legacy XLS and macro-enabled workbooks are not supported."] }
}

export function spreadsheetFormat(request: Request): "csv" | "xlsx" {
  const format = new URL(request.url).searchParams.get("format") ?? "csv"
  if (format !== "csv" && format !== "xlsx") throw new ApiError("Choose CSV or XLSX format.", 400)
  return format
}

export async function tabularDownload({ headers, rows, name, format, sheetName }: {
  headers: readonly string[]
  rows: Array<Array<string | number | null | undefined>>
  name: string
  format: "csv" | "xlsx"
  sheetName: string
}): Promise<Response> {
  let content: string | Uint8Array
  if (format === "xlsx") {
    const workbook = new Workbook()
    workbook.creator = "Wedding Guest Planner"
    const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] })
    sheet.columns = headers.map((header) => ({ header, width: Math.min(42, Math.max(18, header.length + 3)) }))
    for (const row of rows) sheet.addRow(row.map((value) => value ?? ""))
    sheet.getRow(1).font = { bold: true, color: { argb: "FF17130B" } }
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4B575" } }
    sheet.getRow(1).height = 24
    if (headers.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: headers.length } }
    // String values remain native text cells, even when they begin with =, + or @.
    // Do not turn untrusted guest content into formula or hyperlink objects.
    content = new Uint8Array(await workbook.xlsx.writeBuffer())
  } else {
    content = stringify(rows, { ...spreadsheetCsvOptions, header: true, columns: [...headers] })
  }
  return new Response(content as BodyInit, {
    headers: {
      "Content-Type": format === "xlsx" ? XLSX_CONTENT_TYPE : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.${format}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
