import { parse } from "csv-parse/sync"
import { stringify } from "csv-stringify/sync"
import { guestSchema } from "@/lib/validation"

export const GUEST_CSV_HEADERS = [
  "firstName",
  "lastName",
  "mobile",
  "email",
  "group",
  "notes",
  "dietaryPrefs",
] as const

export type GuestCsvRow = {
  firstName: string
  lastName: string | null
  mobile: string | null
  email: string | null
  group: string | null
  notes: string | null
  dietaryPrefs: string | null
}

export type CsvParseResult =
  | { ok: true; rows: GuestCsvRow[] }
  | { ok: false; errors: string[] }

const MAX_ROWS = 2000
const MAX_BYTES = 2 * 1024 * 1024

/**
 * Parses and fully validates a guest CSV. Any malformed row rejects the whole
 * import so callers never end up with a silently partial guest list.
 */
export function parseGuestCsv(input: string | Buffer): CsvParseResult {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8")
  if (buffer.byteLength === 0) return { ok: false, errors: ["The CSV file is empty"] }
  if (buffer.byteLength > MAX_BYTES) return { ok: false, errors: ["The CSV file must be 2 MB or smaller"] }

  let records: Record<string, string>[]
  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((column) => column.trim().replace(/^\uFEFF/, "")),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: false,
    })
  } catch (error) {
    return { ok: false, errors: [`Could not parse CSV: ${(error as Error).message}`] }
  }

  if (records.length === 0) return { ok: false, errors: ["The CSV file has no data rows"] }
  if (records.length > MAX_ROWS) {
    return { ok: false, errors: [`A single import supports at most ${MAX_ROWS} rows`] }
  }

  const header = Object.keys(records[0] ?? {})
  if (!header.includes("firstName")) {
    return { ok: false, errors: ['Missing required column "firstName"'] }
  }
  const unknown = header.filter((column) => !(GUEST_CSV_HEADERS as readonly string[]).includes(column))
  if (unknown.length > 0) {
    return { ok: false, errors: [`Unknown column(s): ${unknown.join(", ")}`] }
  }

  const rows: GuestCsvRow[] = []
  const errors: string[] = []
  const seenMobiles = new Set<string>()

  records.forEach((record, index) => {
    const line = index + 2 // header is line 1
    const parsed = guestSchema.safeParse({
      firstName: record.firstName,
      lastName: record.lastName,
      mobile: record.mobile,
      email: record.email,
      group: record.group,
      notes: record.notes,
      dietaryPrefs: record.dietaryPrefs,
    })

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid row"
      errors.push(`Line ${line}: ${message}`)
      return
    }

    if (parsed.data.mobile) {
      if (seenMobiles.has(parsed.data.mobile)) {
        errors.push(`Line ${line}: duplicate mobile number in file`)
        return
      }
      seenMobiles.add(parsed.data.mobile)
    }

    rows.push(parsed.data)
  })

  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 25) }
  return { ok: true, rows }
}

export function guestsToCsv(
  guests: Array<{
    firstName: string
    lastName: string | null
    mobile: string | null
    email: string | null
    group: string | null
    notes: string | null
    dietaryPrefs: string | null
  }>,
): string {
  return stringify(guests, {
    header: true,
    columns: GUEST_CSV_HEADERS,
  })
}
