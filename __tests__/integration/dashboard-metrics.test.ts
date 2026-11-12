import { randomUUID } from "node:crypto"
import { getDashboardMetrics } from "@/lib/dashboard-metrics"
import { prisma } from "@/lib/prisma"

afterAll(async () => {
  await prisma.$disconnect()
})

it("counts every wedding in the workspace and buckets guest and RSVP activity by IST", async () => {
  const suffix = randomUUID()
  const first = await prisma.workspace.create({ data: { name: `Dashboard test ${suffix}` } })
  const second = await prisma.workspace.create({ data: { name: `Other dashboard test ${suffix}` } })

  try {
    const weddings = await prisma.wedding.createManyAndReturn({
      data: Array.from({ length: 7 }, (_, index) => ({
        workspaceId: first.id,
        name: `Wedding ${index + 1}`,
        coupleName1: "A",
        coupleName2: "B",
      })),
    })
    const otherWedding = await prisma.wedding.create({
      data: { workspaceId: second.id, name: "Other wedding", coupleName1: "C", coupleName2: "D" },
    })

    // These timestamps straddle midnight IST on Monday, 9 November.
    const sunday = new Date("2026-11-08T18:29:00.000Z")
    const monday = new Date("2026-11-08T18:30:00.000Z")
    for (const [weddingId, submittedAt] of [[weddings[0].id, sunday], [weddings[6].id, monday], [otherWedding.id, monday]] as const) {
      const guest = await prisma.guest.create({
        data: { weddingId, firstName: "Guest", createdAt: submittedAt },
      })
      await prisma.rsvpSubmission.create({
        data: { weddingId, guestId: guest.id, fullName: "Guest", mobile: "9000000000", submittedAt },
      })
      await prisma.event.create({ data: { weddingId, name: "Ceremony" } })
    }

    const metrics = await getDashboardMetrics(first.id, new Date("2026-11-10T06:00:00.000Z"))

    expect(metrics.totals).toEqual({ totalWeddings: 7, totalGuests: 2, totalRSVPs: 2, totalEvents: 2 })
    expect(metrics.rsvpDays.slice(-3)).toEqual([
      { day: "2026-11-08", count: 1 },
      { day: "2026-11-09", count: 1 },
      { day: "2026-11-10", count: 0 },
    ])
    expect(metrics.guestWeeks.slice(-2)).toEqual([
      { day: "2026-11-02", count: 1 },
      { day: "2026-11-09", count: 2 },
    ])
    expect(metrics.guestMonths.slice(-2)).toEqual([
      { day: "2026-10-01", count: 0 },
      { day: "2026-11-01", count: 2 },
    ])
  } finally {
    await prisma.workspace.deleteMany({ where: { id: { in: [first.id, second.id] } } })
  }
})
