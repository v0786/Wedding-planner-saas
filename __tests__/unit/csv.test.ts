import { describe, it, expect } from "@jest/globals"
import { parseGuestCsv, guestsToCsv } from "@/lib/csv"

describe("parseGuestCsv", () => {
  it("parses a valid CSV", () => {
    const result = parseGuestCsv(
      "firstName,lastName,mobile,email,group\nAarav,Sharma,9876543210,aarav@example.com,Family\n",
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].firstName).toBe("Aarav")
      expect(result.rows[0].group).toBe("Family")
    }
  })

  it("requires a firstName column", () => {
    const result = parseGuestCsv("name,mobile\nAarav,9876543210\n")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/firstName/)
  })

  it("rejects unknown columns", () => {
    const result = parseGuestCsv("firstName,unexpected\nAarav,value\n")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/Unknown column/)
  })

  it("rejects a whole import when one row is invalid", () => {
    const result = parseGuestCsv(
      "firstName,email\nAarav,aarav@example.com\nMeera,not-an-email\n",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/Line 3/)
  })

  it("rejects duplicate mobile numbers in the file", () => {
    const result = parseGuestCsv(
      "firstName,mobile\nAarav,9876543210\nMeera,9876543210\n",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/duplicate mobile/i)
  })

  it("reports an empty file", () => {
    const result = parseGuestCsv("")
    expect(result.ok).toBe(false)
  })

  it("handles a BOM and quoted fields", () => {
    const result = parseGuestCsv('\uFEFFfirstName,notes\nAarav,"Vegetarian, no nuts"\n')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rows[0].notes).toBe("Vegetarian, no nuts")
  })
})

describe("guestsToCsv", () => {
  it("emits the canonical header and escapes values", () => {
    const csv = guestsToCsv([
      {
        firstName: "Aarav",
        lastName: "Sharma",
        mobile: "9876543210",
        email: null,
        group: "Family, close",
        notes: null,
        dietaryPrefs: "Vegetarian",
      },
    ])
    expect(csv.split("\n")[0]).toContain("firstName,lastName,mobile")
    expect(csv).toContain('"Family, close"')
  })
})
