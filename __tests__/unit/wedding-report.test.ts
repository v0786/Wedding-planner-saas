/** @jest-environment node */
import { getWeddingReport } from "@/lib/wedding-report"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findMany: jest.fn() },
    guest: { findMany: jest.fn() },
    rsvpSubmission: { findMany: jest.fn() },
  },
}))

it("shares accurate party-size, uncertain, declined, dietary and event totals across report callers", async () => {
  jest.mocked(prisma.event.findMany).mockResolvedValue([{ id: "event", name: "Wedding" }] as never)
  jest.mocked(prisma.guest.findMany).mockResolvedValue([
    { id: "accepted", group: "Family" }, { id: "declined", group: "Family" },
    { id: "maybe", group: "Friends" }, { id: "unanswered", group: null },
  ] as never)
  const accepted = {
    guestId: "accepted", status: "confirmed", partySize: 4, dietaryPrefs: "Vegetarian",
    familyMembers: [{ dietaryPrefs: "Jain" }], eventResponses: [{ eventId: "event", status: "yes" }],
  }
  const otherResponses = [
    { guestId: "declined", status: "declined", partySize: 6, dietaryPrefs: "Non-vegetarian", familyMembers: [], eventResponses: [{ eventId: "event", status: "yes" }] },
    { guestId: "maybe", status: "maybe", partySize: 3, dietaryPrefs: "Vegan", familyMembers: [], eventResponses: [{ eventId: "event", status: "yes" }] },
  ]
  jest.mocked(prisma.rsvpSubmission.findMany).mockResolvedValue([accepted, ...otherResponses] as never)
  const report = await getWeddingReport("wedding")
  expect(report.summary).toMatchObject({ invited: 4, responses: 3, confirmed: 1, declined: 1, maybe: 1, pending: 1, confirmedHeadcount: 4, totalHeadcount: 4 })
  expect(report.attendance[0]).toMatchObject({ yes: 4, no: 6, unsure: 3 })
  expect(report.dietary).toEqual([["Vegetarian", 3], ["Jain", 1]])
  expect(report.groups.get("Family")?.headcount).toBe(4)

  jest.mocked(prisma.rsvpSubmission.findMany).mockResolvedValue([{ ...accepted, partySize: 2 }, ...otherResponses] as never)
  const updated = await getWeddingReport("wedding")
  expect(updated.summary.confirmedHeadcount).toBe(2)
  expect(updated.attendance[0].yes).toBe(2)
})
