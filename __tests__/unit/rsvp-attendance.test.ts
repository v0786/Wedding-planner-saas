import { expectedRsvpAttendance, rsvpPartySize } from "@/lib/rsvp-attendance"
import { rsvpSchema } from "@/lib/validation"

it("counts explicit and legacy party sizes, and excludes uncertain or declined responses", () => {
  const response = { status: "confirmed", partySize: 5, familyMembers: [{}] }
  expect(rsvpPartySize(response)).toBe(5)
  expect(expectedRsvpAttendance(response)).toBe(5)
  expect(rsvpPartySize({ ...response, partySize: null })).toBe(2)
  expect(expectedRsvpAttendance({ ...response, status: "declined" })).toBe(0)
  expect(expectedRsvpAttendance({ ...response, status: "maybe" })).toBe(0)
  expect(expectedRsvpAttendance({ ...response, status: "pending" })).toBe(0)
})

it("validates explicit party size against optional named companions", () => {
  const payload = {
    token: "invite",
    fullName: "Guest",
    mobile: "9876543210",
    partySize: 1,
    familyMembers: [{ fullName: "Companion" }],
  }
  expect(rsvpSchema.safeParse(payload).success).toBe(false)
  expect(rsvpSchema.safeParse({ ...payload, partySize: 2 }).success).toBe(true)
  expect(rsvpSchema.safeParse({ ...payload, status: "declined" }).success).toBe(true)
  expect(rsvpSchema.safeParse({ ...payload, partySize: undefined }).success).toBe(true)
  expect(rsvpSchema.safeParse({ ...payload, partySize: 0 }).success).toBe(false)
})
